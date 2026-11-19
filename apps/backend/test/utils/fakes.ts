import type { EntityManager } from 'typeorm';
import { Rol, TemaInterfaz } from '../../src/common/permisos/rol.js';
import type { Usuario } from '../../src/modules/usuarios/usuario.entity.js';
import type {
  FiltroUsuarios,
  UsuariosRepositorio,
} from '../../src/modules/usuarios/usuarios.repositorio.js';

const FECHA = new Date('2026-11-19T12:00:00.000Z');

export function crearUsuario(parcial: Partial<Usuario> = {}): Usuario {
  return {
    id: 1,
    correo: 'admin@nomade.cl',
    nombre: 'Admin Nómade',
    rol: Rol.Admin,
    claveHash: 'hash:clave-correcta-123',
    activo: true,
    debeCambiarClave: false,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    claveCambiadaEn: null,
    ultimoAccesoEn: null,
    tema: TemaInterfaz.Claro,
    version: 1,
    createdAt: FECHA,
    createdBy: null,
    updatedAt: FECHA,
    updatedBy: null,
    ...parcial,
  };
}

/** Repositorio de usuarios en memoria (misma interfaz que `UsuariosRepositorio`). */
export class UsuariosRepositorioFake {
  usuarios = new Map<number, Usuario>();
  private siguienteId = 1;
  /** Trazas para verificar el orden de bloqueo y las actualizaciones directas. */
  llamadas: string[] = [];
  actualizaciones: { id: number; cambios: Record<string, unknown> }[] = [];

  semilla(...usuarios: Usuario[]): this {
    for (const u of usuarios) {
      this.usuarios.set(u.id, u);
      this.siguienteId = Math.max(this.siguienteId, u.id + 1);
    }
    return this;
  }

  /** Copia: el servicio no debe poder modificar el estado sin guardar. */
  private copia(u: Usuario | undefined): Usuario | null {
    return u ? { ...u } : null;
  }

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return trabajo({} as EntityManager);
  }

  buscarPorId(id: number): Promise<Usuario | null> {
    return Promise.resolve(this.copia(this.usuarios.get(id)));
  }

  buscarPorIdBloqueando(id: number): Promise<Usuario | null> {
    this.llamadas.push(`bloquear:${id}`);
    return this.buscarPorId(id);
  }

  buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const encontrado = [...this.usuarios.values()].find(
      (u) => u.correo.toLowerCase() === correo.toLowerCase(),
    );
    return Promise.resolve(this.copia(encontrado));
  }

  contar(): Promise<number> {
    return Promise.resolve(this.usuarios.size);
  }

  bloquearAdminsActivos(): Promise<Usuario[]> {
    this.llamadas.push('bloquear:admins');
    return Promise.resolve(
      [...this.usuarios.values()]
        .filter((u) => u.rol === Rol.Admin && u.activo)
        .sort((a, b) => a.id - b.id)
        .map((u) => ({ ...u })),
    );
  }

  listar(filtro: FiltroUsuarios): Promise<[Usuario[], number]> {
    const q = filtro.q?.toLowerCase();
    const todos = [...this.usuarios.values()].filter(
      (u) =>
        (!q ||
          u.nombre.toLowerCase().includes(q) ||
          u.correo.toLowerCase().includes(q)) &&
        (!filtro.rol || u.rol === filtro.rol) &&
        (filtro.activo === undefined || u.activo === filtro.activo),
    );
    const desde = (filtro.pagina - 1) * filtro.tamanio;
    return Promise.resolve([
      todos.slice(desde, desde + filtro.tamanio),
      todos.length,
    ]);
  }

  crear(datos: Partial<Usuario>): Promise<Usuario> {
    const usuario = crearUsuario({
      ...datos,
      id: this.siguienteId++,
      createdAt: FECHA,
      updatedAt: FECHA,
    });
    this.usuarios.set(usuario.id, usuario);
    return Promise.resolve({ ...usuario });
  }

  guardar(usuario: Usuario): Promise<Usuario> {
    this.usuarios.set(usuario.id, { ...usuario });
    return Promise.resolve({ ...usuario });
  }

  actualizar(id: number, cambios: Record<string, unknown>): Promise<void> {
    this.actualizaciones.push({ id, cambios });
    const actual = this.usuarios.get(id);
    if (actual) {
      for (const [clave, valor] of Object.entries(cambios)) {
        if (typeof valor === 'function') {
          // `version: () => 'version + 1'`
          (actual as unknown as Record<string, number>)[clave] += 1;
        } else {
          (actual as unknown as Record<string, unknown>)[clave] = valor;
        }
      }
    }
    return Promise.resolve();
  }
}

export const comoRepositorio = (
  fake: UsuariosRepositorioFake,
): UsuariosRepositorio => fake as unknown as UsuariosRepositorio;

/** Hash falso y determinista: `hash:<clave>`. */
export class HashFalso {
  hashear = (clave: string): Promise<string> =>
    Promise.resolve(`hash:${clave}`);
  verificar = (clave: string, hash: string): Promise<boolean> =>
    Promise.resolve(hash === `hash:${clave}`);
}
