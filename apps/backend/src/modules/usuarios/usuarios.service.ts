import { HttpStatus, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { esViolacionUnica } from '../../common/base-datos/errores-pg.js';
import { conflictoVersion } from '../../common/errores/conflicto-version.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { Rol, TemaInterfaz } from '../../common/permisos/rol.js';
import { generarClaveTemporal } from '../../common/seguridad/clave-temporal.js';
import { HashClaveService } from '../../common/seguridad/hash-clave.service.js';
import { SesionesService } from '../sesiones/sesiones.service.js';
import { validarCambioUsuario } from './politica-usuarios.js';
import type { Usuario } from './usuario.entity.js';
import type {
  AccionUsuarioDto,
  ActualizarUsuarioDto,
  CrearUsuarioDto,
  ListarUsuariosDto,
  PaginaUsuariosDto,
  UsuarioClaveTemporalDto,
  UsuarioDto,
} from './usuarios.dto.js';
import { aUsuarioDto } from './usuarios.mapper.js';
import { UsuariosRepositorio } from './usuarios.repositorio.js';

const RESTRICCION_CORREO = 'ux_usuario_correo';

function correoDuplicado(): ErrorAplicacion {
  return new ErrorAplicacion(
    HttpStatus.CONFLICT,
    'CORREO_DUPLICADO',
    'Ya existe un usuario con ese correo.',
  );
}

function noEncontrado(): ErrorAplicacion {
  return new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'USUARIO_NO_ENCONTRADO',
    'El usuario no existe.',
  );
}

@Injectable()
export class UsuariosService {
  constructor(
    private readonly repositorio: UsuariosRepositorio,
    private readonly hash: HashClaveService,
    private readonly sesiones: SesionesService,
  ) {}

  async listar(filtro: ListarUsuariosDto): Promise<PaginaUsuariosDto> {
    const [usuarios, total] = await this.repositorio.listar(filtro);
    return {
      items: usuarios.map(aUsuarioDto),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }

  async obtener(id: number): Promise<UsuarioDto> {
    const usuario = await this.repositorio.buscarPorId(id);
    if (!usuario) throw noEncontrado();
    return aUsuarioDto(usuario);
  }

  /** Crea la cuenta con una contraseña temporal que obliga a cambiarla (D-11). */
  async crear(
    dto: CrearUsuarioDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<UsuarioClaveTemporalDto> {
    const claveTemporal = generarClaveTemporal();
    const claveHash = await this.hash.hashear(claveTemporal);
    try {
      const usuario = await this.repositorio.enTransaccion(async (tx) => {
        if (await this.repositorio.buscarPorCorreo(dto.correo, tx)) {
          throw correoDuplicado();
        }
        return this.repositorio.crear(
          {
            correo: dto.correo,
            nombre: dto.nombre,
            rol: dto.rol,
            claveHash,
            activo: true,
            debeCambiarClave: true,
            intentosFallidos: 0,
            bloqueadoHasta: null,
            tema: TemaInterfaz.Claro,
            version: 1,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
          tx,
        );
      });
      const resultado = aUsuarioDto(usuario);
      auditoria.entidadId = usuario.id;
      auditoria.despues = resultado;
      return { usuario: resultado, claveTemporal };
    } catch (error) {
      if (esViolacionUnica(error, RESTRICCION_CORREO)) throw correoDuplicado();
      throw error;
    }
  }

  async actualizar(
    id: number,
    dto: ActualizarUsuarioDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<UsuarioDto> {
    try {
      return await this.modificar(id, dto.version, actor, auditoria, {
        nuevoRol: dto.rol,
        aplicar: async (usuario, tx) => {
          if (
            dto.correo !== undefined &&
            dto.correo.toLowerCase() !== usuario.correo.toLowerCase()
          ) {
            const otro = await this.repositorio.buscarPorCorreo(dto.correo, tx);
            if (otro && otro.id !== usuario.id) throw correoDuplicado();
            usuario.correo = dto.correo;
          }
          if (dto.nombre !== undefined) usuario.nombre = dto.nombre;
          if (dto.rol !== undefined) usuario.rol = dto.rol;
        },
      });
    } catch (error) {
      if (esViolacionUnica(error, RESTRICCION_CORREO)) throw correoDuplicado();
      throw error;
    }
  }

  /** Desactiva (nunca elimina) la cuenta y revoca sus sesiones. */
  async desactivar(
    id: number,
    dto: AccionUsuarioDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<UsuarioDto> {
    auditoria.motivo = dto.motivo;
    const resultado = await this.modificar(id, dto.version, actor, auditoria, {
      nuevoActivo: false,
      aplicar: (usuario) => {
        usuario.activo = false;
        return Promise.resolve();
      },
    });
    await this.sesiones.revocarDeUsuario(id);
    return resultado;
  }

  async activar(
    id: number,
    dto: AccionUsuarioDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<UsuarioDto> {
    auditoria.motivo = dto.motivo;
    return this.modificar(id, dto.version, actor, auditoria, {
      nuevoActivo: true,
      aplicar: (usuario) => {
        usuario.activo = true;
        // Una cuenta reactivada parte sin bloqueo por intentos previos.
        usuario.intentosFallidos = 0;
        usuario.bloqueadoHasta = null;
        return Promise.resolve();
      },
    });
  }

  /**
   * Restablece la contraseña: genera una temporal (se muestra una sola vez),
   * obliga a cambiarla, desbloquea la cuenta y cierra sus sesiones.
   */
  async restablecerClave(
    id: number,
    dto: AccionUsuarioDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<UsuarioClaveTemporalDto> {
    auditoria.motivo = dto.motivo;
    const claveTemporal = generarClaveTemporal();
    const claveHash = await this.hash.hashear(claveTemporal);
    const usuario = await this.modificar(id, dto.version, actor, auditoria, {
      aplicar: (objetivo) => {
        objetivo.claveHash = claveHash;
        objetivo.debeCambiarClave = true;
        objetivo.intentosFallidos = 0;
        objetivo.bloqueadoHasta = null;
        objetivo.claveCambiadaEn = null;
        return Promise.resolve();
      },
    });
    await this.sesiones.revocarDeUsuario(id);
    return { usuario, claveTemporal };
  }

  /**
   * Núcleo de toda modificación administrativa: transacción, bloqueo de las
   * filas implicadas, control de versión (409), reglas de último admin (422)
   * y registro del antes/después para la bitácora.
   */
  private async modificar(
    id: number,
    versionEsperada: number,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
    cambio: {
      nuevoRol?: Rol;
      nuevoActivo?: boolean;
      aplicar: (usuario: Usuario, tx: EntityManager) => Promise<void>;
    },
  ): Promise<UsuarioDto> {
    return this.repositorio.enTransaccion(async (tx) => {
      // Orden fijo (admins por id, luego el objetivo) para no generar interbloqueos.
      const admins = await this.repositorio.bloquearAdminsActivos(tx);
      const usuario = await this.repositorio.buscarPorIdBloqueando(id, tx);
      if (!usuario) throw noEncontrado();
      if (usuario.version !== versionEsperada) {
        throw conflictoVersion(usuario.version);
      }

      validarCambioUsuario({
        actorId: actor.id,
        objetivo: { id: usuario.id, rol: usuario.rol, activo: usuario.activo },
        nuevoRol: cambio.nuevoRol,
        nuevoActivo: cambio.nuevoActivo,
        adminsActivos: admins.length,
      });

      const antes = aUsuarioDto(usuario);
      await cambio.aplicar(usuario, tx);
      usuario.version += 1;
      usuario.updatedBy = actor.id;
      const guardado = await this.repositorio.guardar(usuario, tx);

      const despues = aUsuarioDto(guardado);
      auditoria.entidadId = guardado.id;
      auditoria.antes = antes;
      auditoria.despues = despues;
      return despues;
    });
  }
}
