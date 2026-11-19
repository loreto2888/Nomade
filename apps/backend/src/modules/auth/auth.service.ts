import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { permisosDe } from '../../common/permisos/permisos.js';
import type { TemaInterfaz } from '../../common/permisos/rol.js';
import { HashClaveService } from '../../common/seguridad/hash-clave.service.js';
import { validarClaveNueva } from '../../common/seguridad/politica-clave.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import {
  SesionesService,
  type ContextoSolicitud,
} from '../sesiones/sesiones.service.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { UsuariosRepositorio } from '../usuarios/usuarios.repositorio.js';
import type {
  CambiarClaveDto,
  IniciarSesionDto,
  SesionActualDto,
} from './auth.dto.js';
import {
  estaBloqueado,
  minutosRestantes,
  registrarFalloLogin,
} from './politica-login.js';

export interface ContextoLogin extends ContextoSolicitud {
  idCorrelacion: string | null;
}

export interface ResultadoLogin {
  token: string;
  sesion: SesionActualDto;
  expiraEn: Date;
}

const CREDENCIALES_INVALIDAS = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.UNAUTHORIZED,
    'CREDENCIALES_INVALIDAS',
    'Correo o contraseña incorrectos.',
  );

export function aSesionActual(
  usuario: Pick<
    Usuario,
    'id' | 'correo' | 'nombre' | 'rol' | 'debeCambiarClave' | 'tema'
  >,
  expiraEn: Date,
): SesionActualDto {
  return {
    usuario: {
      id: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
      debeCambiarClave: usuario.debeCambiarClave,
      tema: usuario.tema,
    },
    permisos: permisosDe(usuario.rol),
    expiraEn: expiraEn.toISOString(),
  };
}

@Injectable()
export class AuthService {
  private hashFicticio?: Promise<string>;

  constructor(
    private readonly usuarios: UsuariosRepositorio,
    private readonly hash: HashClaveService,
    private readonly sesiones: SesionesService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async iniciarSesion(
    dto: IniciarSesionDto,
    contexto: ContextoLogin,
    ahora: Date = new Date(),
  ): Promise<ResultadoLogin> {
    const usuario = await this.usuarios.buscarPorCorreo(dto.correo);

    if (!usuario) {
      // Misma latencia que un usuario real: no revela si el correo existe.
      await this.hash.verificar(dto.clave, await this.obtenerHashFicticio());
      await this.registrarLogin('auth.login_fallido', null, contexto, {
        correo: dto.correo,
        motivo: 'correo_inexistente',
      });
      throw CREDENCIALES_INVALIDAS();
    }

    if (estaBloqueado(usuario, ahora) && usuario.bloqueadoHasta) {
      await this.registrarLogin('auth.login_bloqueado', usuario, contexto, {
        motivo: 'cuenta_bloqueada',
      });
      const minutos = minutosRestantes(usuario.bloqueadoHasta, ahora);
      throw new ErrorAplicacion(
        HttpStatus.LOCKED,
        'CUENTA_BLOQUEADA',
        `La cuenta está bloqueada temporalmente por intentos fallidos. Intenta nuevamente en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`,
      );
    }

    const claveCorrecta = await this.hash.verificar(
      dto.clave,
      usuario.claveHash,
    );
    if (!claveCorrecta) {
      const fallo = registrarFalloLogin(usuario, ahora);
      await this.usuarios.actualizar(usuario.id, {
        intentosFallidos: fallo.intentosFallidos,
        bloqueadoHasta: fallo.bloqueadoHasta,
      });
      await this.registrarLogin('auth.login_fallido', usuario, contexto, {
        motivo: 'clave_incorrecta',
      });
      if (fallo.bloqueada) {
        await this.registrarLogin('auth.cuenta_bloqueada', usuario, contexto, {
          bloqueadoHasta: fallo.bloqueadoHasta,
        });
      }
      throw CREDENCIALES_INVALIDAS();
    }

    if (!usuario.activo) {
      await this.registrarLogin('auth.login_fallido', usuario, contexto, {
        motivo: 'cuenta_desactivada',
      });
      throw new ErrorAplicacion(
        HttpStatus.FORBIDDEN,
        'CUENTA_DESACTIVADA',
        'La cuenta está desactivada. Contacta al administrador.',
      );
    }

    await this.usuarios.actualizar(usuario.id, {
      intentosFallidos: 0,
      bloqueadoHasta: null,
      ultimoAccesoEn: ahora,
    });
    const { token, sesion } = await this.sesiones.crear(
      usuario.id,
      contexto,
      ahora,
    );
    await this.registrarLogin('auth.login', usuario, contexto, undefined);

    return {
      token,
      sesion: aSesionActual(usuario, sesion.expiraEn),
      expiraEn: sesion.expiraEn,
    };
  }

  async cerrarSesion(actor: ActorAutenticado): Promise<void> {
    await this.sesiones.revocar(actor.sesionId);
  }

  async obtenerSesion(actor: ActorAutenticado): Promise<SesionActualDto> {
    const usuario = await this.usuarios.buscarPorId(actor.id);
    if (!usuario) throw CREDENCIALES_INVALIDAS();
    return aSesionActual(usuario, actor.sesionExpiraEn);
  }

  async cambiarClave(
    actor: ActorAutenticado,
    dto: CambiarClaveDto,
    auditoria: ContextoAuditoria,
    ahora: Date = new Date(),
  ): Promise<SesionActualDto> {
    const usuario = await this.usuarios.buscarPorId(actor.id);
    if (!usuario) throw CREDENCIALES_INVALIDAS();

    if (!(await this.hash.verificar(dto.claveActual, usuario.claveHash))) {
      throw new ErrorAplicacion(
        HttpStatus.BAD_REQUEST,
        'CLAVE_ACTUAL_INCORRECTA',
        'La contraseña actual no es correcta.',
      );
    }
    const errorClave = validarClaveNueva(dto.claveNueva);
    if (errorClave) {
      throw new ErrorAplicacion(
        HttpStatus.BAD_REQUEST,
        'CLAVE_INVALIDA',
        errorClave,
      );
    }
    if (dto.claveNueva === dto.claveActual) {
      throw new ErrorAplicacion(
        HttpStatus.BAD_REQUEST,
        'CLAVE_IGUAL_A_LA_ACTUAL',
        'La nueva contraseña debe ser distinta de la actual.',
      );
    }

    await this.usuarios.actualizar(usuario.id, {
      claveHash: await this.hash.hashear(dto.claveNueva),
      debeCambiarClave: false,
      claveCambiadaEn: ahora,
      version: () => 'version + 1',
      updatedBy: usuario.id,
    });
    // Cualquier otra sesión abierta con la clave anterior deja de servir.
    await this.sesiones.revocarDeUsuario(usuario.id, {
      excepto: actor.sesionId,
      ahora,
    });
    auditoria.entidadId = usuario.id;
    auditoria.despues = { debeCambiarClave: false };

    usuario.debeCambiarClave = false;
    return aSesionActual(usuario, actor.sesionExpiraEn);
  }

  async actualizarTema(
    actor: ActorAutenticado,
    tema: TemaInterfaz,
  ): Promise<SesionActualDto> {
    await this.usuarios.actualizar(actor.id, { tema });
    return this.obtenerSesion(actor);
  }

  private obtenerHashFicticio(): Promise<string> {
    this.hashFicticio ??= this.hash.hashear(
      'clave-ficticia-para-igualar-tiempos',
    );
    return this.hashFicticio;
  }

  private registrarLogin(
    accion: string,
    usuario: Usuario | null,
    contexto: ContextoLogin,
    despues: unknown,
  ): Promise<void> {
    return this.auditoria.registrarSinFallar({
      usuarioId: usuario?.id ?? null,
      usuarioCorreo: usuario?.correo ?? null,
      usuarioNombre: usuario?.nombre ?? null,
      accion,
      entidad: 'sesion',
      entidadId: usuario?.id ?? null,
      despues,
      ip: contexto.ip,
      idCorrelacion: contexto.idCorrelacion,
    });
  }
}
