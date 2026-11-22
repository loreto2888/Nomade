import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  In,
  IsNull,
  Repository,
  type DeepPartial,
  type EntityManager,
  type ObjectLiteral,
  type SelectQueryBuilder,
} from 'typeorm';
import { nombresDeUsuarios } from '../../common/base-datos/nombres-usuarios.js';
import { escaparLike } from '../../common/paginacion/like.js';
import { rangoPagina } from '../../common/paginacion/pagina.js';
import { Proveedor } from '../proveedores/proveedor.entity.js';
import {
  ESTADOS_OC_VIGENTES,
  EstadoDocumentoCompra,
  type TipoDocumentoCompra,
  type TipoOrdenCompra,
} from './compras.tipos.js';
import { Cotizacion } from './cotizacion.entity.js';
import { OrdenCompra, OrdenCompraLinea } from './orden-compra.entity.js';
import { OrdenTrabajo, OrdenTrabajoHito } from './orden-trabajo.entity.js';

export interface FiltroDocumentos {
  q?: string;
  obraId?: number;
  proveedorId?: number;
  estado?: EstadoDocumentoCompra;
  pagina: number;
  tamanio: number;
}

export interface FiltroCotizaciones extends FiltroDocumentos {
  disponiblesParaOt?: boolean;
}

export interface FiltroOrdenesTrabajo extends FiltroDocumentos {
  conSaldo?: boolean;
}

export interface FiltroOrdenesCompra extends FiltroDocumentos {
  tipo?: TipoOrdenCompra;
  ordenTrabajoId?: number;
}

export interface ObraReferencia {
  id: number;
  codigoCentroCosto: string;
  nombre: string;
  cerrada: boolean;
}

export interface ProveedorReferencia {
  id: number;
  rut: string;
  razonSocial: string;
}

export interface Referencias {
  obras: Map<number, ObraReferencia>;
  proveedores: Map<number, ProveedorReferencia>;
  usuarios: Map<number, string>;
}

/** Porcentaje y monto ocupados por las OC parciales vigentes de un hito. */
export interface OcupacionHito {
  hitoId: number;
  ordenTrabajoId: number;
  porcentaje: number;
  monto: number;
}

/** OT vigente (no rechazada ni anulada) de una cotización. */
export interface OtDeCotizacion {
  cotizacionId: number;
  id: number;
  numero: number;
  estado: EstadoDocumentoCompra;
}

const OC_VIGENTES = [...ESTADOS_OC_VIGENTES];
const NO_VIGENTES_OT = [
  EstadoDocumentoCompra.Rechazada,
  EstadoDocumentoCompra.Anulada,
];

/** Acceso a datos de cotizaciones, OT (con hitos) y OC (con líneas). */
@Injectable()
export class ComprasRepositorio {
  constructor(
    @InjectRepository(Cotizacion)
    private readonly cotizaciones: Repository<Cotizacion>,
    @InjectRepository(OrdenTrabajo)
    private readonly ordenesTrabajo: Repository<OrdenTrabajo>,
    @InjectRepository(OrdenTrabajoHito)
    private readonly hitos: Repository<OrdenTrabajoHito>,
    @InjectRepository(OrdenCompra)
    private readonly ordenesCompra: Repository<OrdenCompra>,
    @InjectRepository(OrdenCompraLinea)
    private readonly lineas: Repository<OrdenCompraLinea>,
    private readonly dataSource: DataSource,
  ) {}

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(trabajo);
  }

  private de<E extends ObjectLiteral>(
    repo: Repository<E>,
    tx?: EntityManager,
  ): Repository<E> {
    return tx ? tx.getRepository<E>(repo.target) : repo;
  }

  // --- Folios y referencias ---------------------------------------------------

  /** Siguiente folio del tipo (correlativo global, D-17). La fila queda bloqueada hasta el commit. */
  async siguienteFolio(
    tipo: TipoDocumentoCompra,
    tx: EntityManager,
  ): Promise<number> {
    const filas = await tx.query<{ ultimo: string }[]>(
      // En un CTE para que TypeORM devuelva las filas (con un UPDATE directo entrega [filas, conteo]).
      `WITH siguiente AS (
         UPDATE nomade.folio SET ultimo = ultimo + 1 WHERE tipo = $1 RETURNING ultimo
       ) SELECT ultimo FROM siguiente`,
      [tipo],
    );
    if (filas.length === 0) throw new Error(`Folio no configurado: ${tipo}`);
    return Number(filas[0].ultimo);
  }

  /** Obras, proveedores y nombres de usuarios para proyectar los documentos (aun eliminados). */
  async referencias(ids: {
    obras: Iterable<number>;
    proveedores: Iterable<number>;
    usuarios: Iterable<number>;
  }): Promise<Referencias> {
    const obras = [...new Set(ids.obras)];
    const proveedores = [...new Set(ids.proveedores)];
    const [filasObras, filasProveedores, usuarios] = await Promise.all([
      obras.length === 0
        ? []
        : this.dataSource.query<
            {
              id: string;
              codigo_centro_costo: string;
              nombre: string;
              estado: string;
            }[]
          >(
            `SELECT o.id, o.codigo_centro_costo, o.nombre, e.codigo AS estado
             FROM nomade.obra o JOIN nomade.catalogo e ON e.id = o.estado_id
             WHERE o.id = ANY($1::bigint[])`,
            [obras],
          ),
      proveedores.length === 0
        ? []
        : this.dataSource.query<
            { id: string; rut: string; razon_social: string }[]
          >(
            'SELECT id, rut, razon_social FROM nomade.proveedor WHERE id = ANY($1::bigint[])',
            [proveedores],
          ),
      nombresDeUsuarios(this.dataSource, [...new Set(ids.usuarios)]),
    ]);
    return {
      obras: new Map(
        filasObras.map((o) => [
          Number(o.id),
          {
            id: Number(o.id),
            codigoCentroCosto: o.codigo_centro_costo,
            nombre: o.nombre,
            cerrada: o.estado === 'cerrada',
          },
        ]),
      ),
      proveedores: new Map(
        filasProveedores.map((p) => [
          Number(p.id),
          { id: Number(p.id), rut: p.rut, razonSocial: p.razon_social },
        ]),
      ),
      usuarios,
    };
  }

  /** Filtros comunes (`d` = documento) y paginación, del folio más reciente al más antiguo. */
  private paginar<E extends ObjectLiteral>(
    consulta: SelectQueryBuilder<E>,
    filtro: FiltroDocumentos,
    extra: (consulta: SelectQueryBuilder<E>) => void = () => {},
  ): Promise<[E[], number]> {
    consulta.where('d.eliminadoEn IS NULL');
    if (filtro.obraId !== undefined) {
      consulta.andWhere('d.obraId = :obraId', { obraId: filtro.obraId });
    }
    if (filtro.proveedorId !== undefined) {
      consulta.andWhere('d.proveedorId = :proveedorId', {
        proveedorId: filtro.proveedorId,
      });
    }
    if (filtro.estado !== undefined) {
      consulta.andWhere('d.estado = :estado', { estado: filtro.estado });
    }
    if (filtro.q) {
      const numero = /\d+/.exec(filtro.q)?.[0];
      consulta.leftJoin(Proveedor, 'p', 'p.id = d.proveedorId').andWhere(
        new Brackets((o) => {
          o.where(`d.descripcion ILIKE :q ESCAPE '\\'`, {
            q: `%${escaparLike(filtro.q!)}%`,
          }).orWhere(`p.razonSocial ILIKE :q ESCAPE '\\'`);
          if (numero !== undefined && numero.length <= 15) {
            o.orWhere('d.numero = :numero', { numero: Number(numero) });
          }
        }),
      );
    }
    extra(consulta);
    const { skip, take } = rangoPagina(filtro);
    return consulta
      .orderBy('d.numero', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  // --- Cotizaciones -----------------------------------------------------------

  listarCotizaciones(
    filtro: FiltroCotizaciones,
  ): Promise<[Cotizacion[], number]> {
    return this.paginar(
      this.cotizaciones.createQueryBuilder('d'),
      filtro,
      (consulta) => {
        if (!filtro.disponiblesParaOt) return;
        consulta
          .andWhere('d.estado = :aprobada', {
            aprobada: EstadoDocumentoCompra.Aprobada,
          })
          .andWhere(
            `NOT EXISTS (SELECT 1 FROM nomade.orden_trabajo ot
             WHERE ot.cotizacion_id = d.id AND ot.eliminado_en IS NULL
               AND ot.estado NOT IN (:...noVigentes))`,
            { noVigentes: NO_VIGENTES_OT },
          );
      },
    );
  }

  buscarCotizacion(id: number, tx?: EntityManager): Promise<Cotizacion | null> {
    return this.de(this.cotizaciones, tx).findOne({
      where: { id, eliminadoEn: IsNull() },
    });
  }

  buscarCotizacionBloqueando(
    id: number,
    tx: EntityManager,
  ): Promise<Cotizacion | null> {
    return this.de(this.cotizaciones, tx).findOne({
      where: { id, eliminadoEn: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
  }

  crearCotizacion(
    datos: DeepPartial<Cotizacion>,
    tx: EntityManager,
  ): Promise<Cotizacion> {
    const repo = this.de(this.cotizaciones, tx);
    return repo.save(repo.create(datos));
  }

  guardarCotizacion(c: Cotizacion, tx: EntityManager): Promise<Cotizacion> {
    return this.de(this.cotizaciones, tx).save(c);
  }

  cotizacionesPorIds(ids: readonly number[]): Promise<Cotizacion[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.cotizaciones.find({ where: { id: In([...new Set(ids)]) } });
  }

  /** OT vigente de cada cotización indicada. */
  async otVigentesDeCotizaciones(
    ids: readonly number[],
    tx?: EntityManager,
  ): Promise<Map<number, OtDeCotizacion>> {
    if (ids.length === 0) return new Map();
    const filas = await this.de(this.ordenesTrabajo, tx)
      .createQueryBuilder('ot')
      .where('ot.cotizacionId IN (:...ids)', { ids: [...ids] })
      .andWhere('ot.eliminadoEn IS NULL')
      .andWhere('ot.estado NOT IN (:...noVigentes)', {
        noVigentes: NO_VIGENTES_OT,
      })
      .getMany();
    return new Map(
      filas.map((ot) => [
        ot.cotizacionId,
        {
          cotizacionId: ot.cotizacionId,
          id: ot.id,
          numero: ot.numero,
          estado: ot.estado,
        },
      ]),
    );
  }

  // --- Órdenes de trabajo -----------------------------------------------------

  listarOrdenesTrabajo(
    filtro: FiltroOrdenesTrabajo,
  ): Promise<[OrdenTrabajo[], number]> {
    return this.paginar(
      this.ordenesTrabajo.createQueryBuilder('d'),
      filtro,
      (consulta) => {
        if (!filtro.conSaldo) return;
        consulta
          .andWhere('d.estado = :aprobada', {
            aprobada: EstadoDocumentoCompra.Aprobada,
          })
          .andWhere(
            `d.monto_neto > (SELECT coalesce(sum(oc.monto_neto), 0) FROM nomade.orden_compra oc
             WHERE oc.orden_trabajo_id = d.id AND oc.eliminado_en IS NULL
               AND oc.estado IN (:...ocVigentes))`,
            { ocVigentes: OC_VIGENTES },
          );
      },
    );
  }

  buscarOrdenTrabajo(
    id: number,
    tx?: EntityManager,
  ): Promise<OrdenTrabajo | null> {
    return this.de(this.ordenesTrabajo, tx).findOne({
      where: { id, eliminadoEn: IsNull() },
    });
  }

  buscarOrdenTrabajoBloqueando(
    id: number,
    tx: EntityManager,
  ): Promise<OrdenTrabajo | null> {
    return this.de(this.ordenesTrabajo, tx).findOne({
      where: { id, eliminadoEn: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
  }

  crearOrdenTrabajo(
    datos: DeepPartial<OrdenTrabajo>,
    tx: EntityManager,
  ): Promise<OrdenTrabajo> {
    const repo = this.de(this.ordenesTrabajo, tx);
    return repo.save(repo.create(datos));
  }

  guardarOrdenTrabajo(
    ot: OrdenTrabajo,
    tx: EntityManager,
  ): Promise<OrdenTrabajo> {
    return this.de(this.ordenesTrabajo, tx).save(ot);
  }

  listarHitos(
    ordenTrabajoIds: readonly number[],
    tx?: EntityManager,
  ): Promise<OrdenTrabajoHito[]> {
    if (ordenTrabajoIds.length === 0) return Promise.resolve([]);
    return this.de(this.hitos, tx).find({
      where: { ordenTrabajoId: In([...ordenTrabajoIds]) },
      order: { ordenTrabajoId: 'ASC', numero: 'ASC' },
    });
  }

  buscarHito(id: number, tx?: EntityManager): Promise<OrdenTrabajoHito | null> {
    return this.de(this.hitos, tx).findOne({ where: { id } });
  }

  /** Reemplaza todos los hitos de un borrador. */
  async reemplazarHitos(
    ordenTrabajoId: number,
    hitos: DeepPartial<OrdenTrabajoHito>[],
    tx: EntityManager,
  ): Promise<void> {
    const repo = this.de(this.hitos, tx);
    await repo.delete({ ordenTrabajoId });
    if (hitos.length > 0) await repo.insert(hitos);
  }

  /** Porcentaje y monto ocupados por las OC parciales vigentes, por hito. */
  async ocupacionDeHitos(
    ordenTrabajoIds: readonly number[],
    tx?: EntityManager,
    excluirOcId?: number,
  ): Promise<OcupacionHito[]> {
    if (ordenTrabajoIds.length === 0) return [];
    const consulta = this.de(this.ordenesCompra, tx)
      .createQueryBuilder('oc')
      .select('oc.hitoId', 'hitoId')
      .addSelect('oc.ordenTrabajoId', 'ordenTrabajoId')
      .addSelect('sum(oc.porcentaje)', 'porcentaje')
      .addSelect('sum(oc.montoNeto)', 'monto')
      .where('oc.ordenTrabajoId IN (:...ids)', { ids: [...ordenTrabajoIds] })
      .andWhere('oc.eliminadoEn IS NULL')
      .andWhere('oc.estado IN (:...vigentes)', { vigentes: OC_VIGENTES })
      .groupBy('oc.hitoId')
      .addGroupBy('oc.ordenTrabajoId');
    if (excluirOcId !== undefined) {
      consulta.andWhere('oc.id <> :excluir', { excluir: excluirOcId });
    }
    const filas = await consulta.getRawMany<{
      hitoId: string;
      ordenTrabajoId: string;
      porcentaje: string;
      monto: string;
    }>();
    return filas.map((f) => ({
      hitoId: Number(f.hitoId),
      ordenTrabajoId: Number(f.ordenTrabajoId),
      porcentaje: Number(f.porcentaje),
      monto: Number(f.monto),
    }));
  }

  /** OC parciales vigentes de una OT (impiden anularla). */
  contarOcVigentesDeOrdenTrabajo(
    ordenTrabajoId: number,
    tx: EntityManager,
  ): Promise<number> {
    return this.de(this.ordenesCompra, tx).count({
      where: {
        ordenTrabajoId,
        eliminadoEn: IsNull(),
        estado: In(OC_VIGENTES),
      },
    });
  }

  // --- Órdenes de compra ------------------------------------------------------

  listarOrdenesCompra(
    filtro: FiltroOrdenesCompra,
  ): Promise<[OrdenCompra[], number]> {
    return this.paginar(
      this.ordenesCompra.createQueryBuilder('d'),
      filtro,
      (consulta) => {
        if (filtro.tipo !== undefined) {
          consulta.andWhere('d.tipo = :tipo', { tipo: filtro.tipo });
        }
        if (filtro.ordenTrabajoId !== undefined) {
          consulta.andWhere('d.ordenTrabajoId = :ot', {
            ot: filtro.ordenTrabajoId,
          });
        }
      },
    );
  }

  buscarOrdenCompra(
    id: number,
    tx?: EntityManager,
  ): Promise<OrdenCompra | null> {
    return this.de(this.ordenesCompra, tx).findOne({
      where: { id, eliminadoEn: IsNull() },
    });
  }

  buscarOrdenCompraBloqueando(
    id: number,
    tx: EntityManager,
  ): Promise<OrdenCompra | null> {
    return this.de(this.ordenesCompra, tx).findOne({
      where: { id, eliminadoEn: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
  }

  ordenesTrabajoPorIds(ids: readonly number[]): Promise<OrdenTrabajo[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.ordenesTrabajo.find({ where: { id: In([...new Set(ids)]) } });
  }

  hitosPorIds(ids: readonly number[]): Promise<OrdenTrabajoHito[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.hitos.find({ where: { id: In([...new Set(ids)]) } });
  }

  crearOrdenCompra(
    datos: DeepPartial<OrdenCompra>,
    tx: EntityManager,
  ): Promise<OrdenCompra> {
    const repo = this.de(this.ordenesCompra, tx);
    return repo.save(repo.create(datos));
  }

  guardarOrdenCompra(oc: OrdenCompra, tx: EntityManager): Promise<OrdenCompra> {
    return this.de(this.ordenesCompra, tx).save(oc);
  }

  listarLineas(
    ordenCompraIds: readonly number[],
    tx?: EntityManager,
  ): Promise<OrdenCompraLinea[]> {
    if (ordenCompraIds.length === 0) return Promise.resolve([]);
    return this.de(this.lineas, tx).find({
      where: { ordenCompraId: In([...ordenCompraIds]) },
      order: { ordenCompraId: 'ASC', numero: 'ASC' },
    });
  }

  /** Reemplaza todas las líneas de un borrador. */
  async reemplazarLineas(
    ordenCompraId: number,
    lineas: DeepPartial<OrdenCompraLinea>[],
    tx: EntityManager,
  ): Promise<void> {
    const repo = this.de(this.lineas, tx);
    await repo.delete({ ordenCompraId });
    if (lineas.length > 0) await repo.insert(lineas);
  }
}
