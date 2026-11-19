import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { Rol } from '../../common/permisos/rol.js';
import { rangoPagina } from '../../common/paginacion/pagina.js';
import { Usuario } from './usuario.entity.js';

export interface FiltroUsuarios {
  q?: string;
  rol?: Rol;
  activo?: boolean;
  pagina: number;
  tamanio: number;
}

/** Escapa `%`, `_` y `\` para usarlos literalmente en un `LIKE`. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Acceso a datos de usuarios. Los métodos aceptan el `EntityManager` de una transacción. */
@Injectable()
export class UsuariosRepositorio {
  constructor(
    @InjectRepository(Usuario)
    private readonly repositorio: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(trabajo);
  }

  private de(tx?: EntityManager): Repository<Usuario> {
    return tx ? tx.getRepository(Usuario) : this.repositorio;
  }

  buscarPorId(id: number, tx?: EntityManager): Promise<Usuario | null> {
    return this.de(tx).findOne({ where: { id } });
  }

  /** `SELECT … FOR UPDATE` de la fila (exige transacción). */
  buscarPorIdBloqueando(
    id: number,
    tx: EntityManager,
  ): Promise<Usuario | null> {
    return this.de(tx).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  buscarPorCorreo(correo: string, tx?: EntityManager): Promise<Usuario | null> {
    return this.de(tx).findOne({ where: { correo } });
  }

  contar(tx?: EntityManager): Promise<number> {
    return this.de(tx).count();
  }

  /**
   * Bloquea (en orden de id) a todos los administradores activos y los
   * devuelve: serializa los cambios que podrían dejar el sistema sin admin.
   */
  bloquearAdminsActivos(tx: EntityManager): Promise<Usuario[]> {
    return this.de(tx).find({
      where: { rol: Rol.Admin, activo: true },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async listar(filtro: FiltroUsuarios): Promise<[Usuario[], number]> {
    const consulta = this.repositorio.createQueryBuilder('u');
    if (filtro.q) {
      consulta.andWhere(
        `(u.nombre ILIKE :q ESCAPE '\\' OR u.correo::text ILIKE :q ESCAPE '\\')`,
        { q: `%${escaparLike(filtro.q)}%` },
      );
    }
    if (filtro.rol) consulta.andWhere('u.rol = :rol', { rol: filtro.rol });
    if (filtro.activo !== undefined) {
      consulta.andWhere('u.activo = :activo', { activo: filtro.activo });
    }
    const { skip, take } = rangoPagina(filtro);
    return consulta
      .orderBy('u.nombre', 'ASC')
      .addOrderBy('u.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  crear(datos: Partial<Usuario>, tx?: EntityManager): Promise<Usuario> {
    const repo = this.de(tx);
    return repo.save(repo.create(datos));
  }

  guardar(usuario: Usuario, tx?: EntityManager): Promise<Usuario> {
    return this.de(tx).save(usuario);
  }

  /** Actualización directa sin tocar `version` (contadores de acceso, tema). */
  async actualizar(
    id: number,
    cambios: QueryDeepPartialEntity<Usuario>,
    tx?: EntityManager,
  ): Promise<void> {
    await this.de(tx).update(id, cambios);
  }
}
