import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

const REINTENTO_MS = 5_000;
const TIMEOUT_CONSULTA_MS = 3_000;

/**
 * Inicializa el DataSource sin bloquear el arranque y reintenta en segundo
 * plano hasta lograrlo. Una vez conectado, el pool de `pg` se recupera solo
 * de caídas posteriores de la BD.
 */
@Injectable()
export class ConexionBaseDatos
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ConexionBaseDatos.name);
  private conectando?: Promise<boolean>;
  private temporizador?: NodeJS.Timeout;
  private detenida = false;

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!(await this.conectar())) this.programarReintento();
  }

  onApplicationShutdown(): void {
    this.detenida = true;
    clearTimeout(this.temporizador);
  }

  get conectada(): boolean {
    return this.dataSource.isInitialized;
  }

  /** Intenta inicializar el DataSource (las llamadas concurrentes se agrupan). */
  conectar(): Promise<boolean> {
    if (this.dataSource.isInitialized) return Promise.resolve(true);
    this.conectando ??= this.dataSource
      .initialize()
      .then(() => {
        this.logger.log('Conexión a PostgreSQL establecida');
        return true;
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `No se pudo conectar a PostgreSQL: ${describirError(error)}`,
        );
        return false;
      })
      .finally(() => {
        this.conectando = undefined;
      });
    return this.conectando;
  }

  /** `SELECT 1` con límite de tiempo. Devuelve `true` si la BD responde. */
  async verificar(): Promise<boolean> {
    if (!(await this.conectar())) return false;
    let limite: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, rechazar) => {
          limite = setTimeout(
            () => rechazar(new Error('Tiempo de espera agotado')),
            TIMEOUT_CONSULTA_MS,
          );
        }),
      ]);
      return true;
    } catch (error) {
      this.logger.warn(
        `La base de datos no responde: ${describirError(error)}`,
      );
      return false;
    } finally {
      clearTimeout(limite);
    }
  }

  private programarReintento(): void {
    if (this.detenida || this.dataSource.isInitialized) return;
    this.temporizador = setTimeout(() => {
      void this.conectar().then((ok) => {
        if (!ok) this.programarReintento();
      });
    }, REINTENTO_MS);
    this.temporizador.unref();
  }
}

/** Mensaje legible de un error de conexión (ECONNREFUSED llega como AggregateError sin mensaje). */
export function describirError(error: unknown): string {
  if (error instanceof AggregateError && error.errors.length > 0) {
    return describirError(error.errors[0]);
  }
  if (error instanceof Error) {
    const codigo = (error as NodeJS.ErrnoException).code;
    return error.message || codigo || error.name;
  }
  return String(error);
}
