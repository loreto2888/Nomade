import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Rol, TemaInterfaz } from '../../common/permisos/rol.js';
import { HashClaveService } from '../../common/seguridad/hash-clave.service.js';
import type { Entorno } from '../../config/entorno.js';
import { ConexionBaseDatos } from '../../database/conexion-base-datos.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { UsuariosRepositorio } from './usuarios.repositorio.js';

export type ResultadoAdminInicial =
  'creado' | 'ya_hay_usuarios' | 'sin_configuracion';

const REINTENTO_MS = 5_000;

/**
 * Crea el primer administrador (D-11, §9.2) al arrancar si no existen
 * usuarios, con `ADMIN_EMAIL`/`ADMIN_PASSWORD`. La cuenta queda obligada a
 * cambiar su contraseña en el primer ingreso. Reintenta en segundo plano
 * mientras la BD no esté disponible (igual que `ConexionBaseDatos`).
 */
@Injectable()
export class AdminInicialService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AdminInicialService.name);
  private temporizador?: NodeJS.Timeout;
  private detenido = false;

  constructor(
    private readonly config: ConfigService<Entorno, true>,
    private readonly repositorio: UsuariosRepositorio,
    private readonly hash: HashClaveService,
    private readonly auditoria: AuditoriaService,
    private readonly conexion: ConexionBaseDatos,
  ) {}

  onApplicationBootstrap(): void {
    void this.intentar();
  }

  onApplicationShutdown(): void {
    this.detenido = true;
    clearTimeout(this.temporizador);
  }

  private async intentar(): Promise<void> {
    if (this.detenido) return;
    try {
      if (!(await this.conexion.conectar())) {
        throw new Error('la base de datos aún no está disponible');
      }
      await this.asegurarAdministrador();
    } catch (error) {
      this.logger.warn(
        `No se pudo verificar el administrador inicial: ${error instanceof Error ? error.message : String(error)}. Se reintentará.`,
      );
      this.temporizador = setTimeout(() => void this.intentar(), REINTENTO_MS);
      this.temporizador.unref();
    }
  }

  async asegurarAdministrador(): Promise<ResultadoAdminInicial> {
    const correo = this.config.get('ADMIN_EMAIL', { infer: true });
    const clave = this.config.get('ADMIN_PASSWORD', { infer: true });
    const nombre = this.config.get('ADMIN_NAME', { infer: true });

    if ((await this.repositorio.contar()) > 0) return 'ya_hay_usuarios';
    if (!correo || !clave) {
      this.logger.warn(
        'No hay usuarios y no se definieron ADMIN_EMAIL/ADMIN_PASSWORD: no se creó el primer administrador.',
      );
      return 'sin_configuracion';
    }

    const claveHash = await this.hash.hashear(clave);
    const creado = await this.repositorio.enTransaccion(async (tx) => {
      // Si otra instancia lo creó mientras tanto, no se duplica.
      if ((await this.repositorio.contar(tx)) > 0) return null;
      return this.repositorio.crear(
        {
          correo: correo.toLowerCase(),
          nombre,
          rol: Rol.Admin,
          claveHash,
          activo: true,
          debeCambiarClave: true,
          intentosFallidos: 0,
          bloqueadoHasta: null,
          tema: TemaInterfaz.Claro,
          version: 1,
        },
        tx,
      );
    });
    if (!creado) return 'ya_hay_usuarios';

    this.logger.log(`Primer administrador creado: ${creado.correo}`);
    await this.auditoria.registrarSinFallar({
      accion: 'usuario.crear_admin_inicial',
      entidad: 'usuario',
      entidadId: creado.id,
      despues: {
        correo: creado.correo,
        nombre: creado.nombre,
        rol: creado.rol,
      },
    });
    return 'creado';
  }
}
