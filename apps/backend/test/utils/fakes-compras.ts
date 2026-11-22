import { QueryFailedError, type EntityManager } from 'typeorm';
import type {
  FiltroCotizaciones,
  FiltroDocumentos,
  FiltroOrdenesCompra,
  FiltroOrdenesTrabajo,
  OcupacionHito,
  OtDeCotizacion,
  Referencias,
} from '../../src/modules/compras/compras.repositorio.js';
import {
  ESTADOS_OC_VIGENTES,
  EstadoDocumentoCompra,
  TipoOrdenCompra,
  type TipoDocumentoCompra,
} from '../../src/modules/compras/compras.tipos.js';
import type { Cotizacion } from '../../src/modules/compras/cotizacion.entity.js';
import type {
  OrdenCompra,
  OrdenCompraLinea,
} from '../../src/modules/compras/orden-compra.entity.js';
import type {
  OrdenTrabajo,
  OrdenTrabajoHito,
} from '../../src/modules/compras/orden-trabajo.entity.js';
import type { Movimiento } from '../../src/modules/movimientos/movimiento.entity.js';
import type {
  OrigenMovimiento,
  TipoMovimiento,
} from '../../src/modules/movimientos/movimientos.tipos.js';
import { FECHA } from './fakes-maestros.js';

const violacionUnica = (restriccion: string): QueryFailedError =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate key value'), {
      code: '23505',
      constraint: restriccion,
    }),
  );

const trazabilidad = {
  estado: EstadoDocumentoCompra.Borrador,
  enviadoEn: null,
  enviadoPor: null,
  resueltoEn: null,
  resueltoPor: null,
  motivoResolucion: null,
  version: 1,
  createdAt: FECHA,
  createdBy: 2,
  updatedAt: FECHA,
  updatedBy: 2,
  eliminadoEn: null,
  eliminadoPor: null,
};

export function crearCotizacion(parcial: Partial<Cotizacion> = {}): Cotizacion {
  return {
    id: 1,
    numero: 1,
    obraId: 1,
    proveedorId: 1,
    categoriaGastoId: 21,
    descripcion: 'Instalación eléctrica',
    referenciaProveedor: null,
    fecha: '2026-11-18',
    validezHasta: null,
    montoNeto: 10_000_000,
    ...trazabilidad,
    ...parcial,
  };
}

export function crearOrdenTrabajo(
  parcial: Partial<OrdenTrabajo> = {},
): OrdenTrabajo {
  return {
    id: 1,
    numero: 1,
    obraId: 1,
    proveedorId: 1,
    categoriaGastoId: 21,
    cotizacionId: 1,
    descripcion: 'Instalación eléctrica',
    montoNeto: 10_000_000,
    fechaInicio: null,
    fechaTermino: null,
    anuladoEn: null,
    anuladoPor: null,
    motivoAnulacion: null,
    ...trazabilidad,
    ...parcial,
  };
}

export function crearHito(
  parcial: Partial<OrdenTrabajoHito> = {},
): OrdenTrabajoHito {
  return {
    id: 1,
    ordenTrabajoId: 1,
    numero: 1,
    descripcion: 'Anticipo',
    porcentaje: 30,
    montoNeto: 3_000_000,
    fechaEstimada: null,
    createdAt: FECHA,
    createdBy: 2,
    ...parcial,
  };
}

export function crearOrdenCompra(
  parcial: Partial<OrdenCompra> = {},
): OrdenCompra {
  return {
    id: 1,
    numero: 1,
    tipo: TipoOrdenCompra.Materiales,
    obraId: 1,
    proveedorId: 1,
    categoriaGastoId: 20,
    ordenTrabajoId: null,
    hitoId: null,
    porcentaje: null,
    descripcion: 'Cemento',
    fecha: '2026-11-19',
    fechaEntrega: null,
    afectaIva: true,
    tasaIva: 19,
    montoNeto: 0,
    montoIva: 0,
    montoTotal: 0,
    recibidoEn: null,
    recibidoPor: null,
    fechaRecepcion: null,
    observacionRecepcion: null,
    anuladoEn: null,
    anuladoPor: null,
    motivoAnulacion: null,
    ...trazabilidad,
    ...parcial,
  };
}

/**
 * Repositorio en memoria de compras. Reproduce lo que la lógica necesita de la BD: folios
 * correlativos, una OT vigente por cotización (`ux_orden_trabajo_cotizacion`) y la ocupación de los
 * hitos por OC vigentes.
 */
export class ComprasRepositorioFake {
  cotizaciones = new Map<number, Cotizacion>();
  ots = new Map<number, OrdenTrabajo>();
  hitos = new Map<number, OrdenTrabajoHito>();
  ocs = new Map<number, OrdenCompra>();
  lineas: OrdenCompraLinea[] = [];
  folios = new Map<string, number>();
  usuarios = new Map<number, string>([
    [1, 'Administrador'],
    [2, 'Camila Rojas'],
    [3, 'Tomás Silva'],
  ]);
  /** Bitácora de bloqueos; se comparte con la de las obras para verificar el orden. */
  llamadas: string[] = [];
  private ids = { cot: 100, ot: 100, hito: 100, oc: 100, linea: 100 };

  semilla(datos: {
    cotizaciones?: Cotizacion[];
    ots?: OrdenTrabajo[];
    hitos?: OrdenTrabajoHito[];
    ocs?: OrdenCompra[];
  }): this {
    for (const c of datos.cotizaciones ?? [])
      this.cotizaciones.set(c.id, { ...c });
    for (const o of datos.ots ?? []) this.ots.set(o.id, { ...o });
    for (const h of datos.hitos ?? []) this.hitos.set(h.id, { ...h });
    for (const o of datos.ocs ?? []) this.ocs.set(o.id, { ...o });
    return this;
  }

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return trabajo({} as EntityManager);
  }

  siguienteFolio(tipo: TipoDocumentoCompra): Promise<number> {
    const n = (this.folios.get(tipo) ?? 0) + 1;
    this.folios.set(tipo, n);
    return Promise.resolve(n);
  }

  referencias(ids: {
    obras: Iterable<number>;
    proveedores: Iterable<number>;
    usuarios: Iterable<number>;
  }): Promise<Referencias> {
    return Promise.resolve({
      obras: new Map(
        [...ids.obras].map((id) => [
          id,
          {
            id,
            codigoCentroCosto: `CC-00${id}`,
            nombre: `Obra ${id}`,
            cerrada: false,
          },
        ]),
      ),
      proveedores: new Map(
        [...ids.proveedores].map((id) => [
          id,
          { id, rut: '11111111-1', razonSocial: `Proveedor ${id}` },
        ]),
      ),
      usuarios: new Map(
        [...ids.usuarios].flatMap((id) => {
          const n = this.usuarios.get(id);
          return n ? [[id, n] as [number, string]] : [];
        }),
      ),
    });
  }

  private paginar<
    E extends {
      numero: number;
      eliminadoEn: Date | null;
      obraId: number;
      proveedorId: number;
      estado: EstadoDocumentoCompra;
    },
  >(
    todos: E[],
    filtro: FiltroDocumentos,
    extra: (e: E) => boolean,
  ): Promise<[E[], number]> {
    const filtrados = todos
      .filter(
        (e) =>
          !e.eliminadoEn &&
          (filtro.obraId === undefined || e.obraId === filtro.obraId) &&
          (filtro.proveedorId === undefined ||
            e.proveedorId === filtro.proveedorId) &&
          (filtro.estado === undefined || e.estado === filtro.estado) &&
          extra(e),
      )
      .sort((a, b) => b.numero - a.numero);
    const desde = (filtro.pagina - 1) * filtro.tamanio;
    return Promise.resolve([
      filtrados.slice(desde, desde + filtro.tamanio).map((e) => ({ ...e })),
      filtrados.length,
    ]);
  }

  // --- Cotizaciones -----------------------------------------------------------

  listarCotizaciones(filtro: FiltroCotizaciones) {
    const conOt = new Set(this.otsVigentes().map((o) => o.cotizacionId));
    return this.paginar(
      [...this.cotizaciones.values()],
      filtro,
      (c) =>
        !filtro.disponiblesParaOt ||
        (c.estado === EstadoDocumentoCompra.Aprobada && !conOt.has(c.id)),
    );
  }

  buscarCotizacion(id: number): Promise<Cotizacion | null> {
    const c = this.cotizaciones.get(id);
    return Promise.resolve(c && !c.eliminadoEn ? { ...c } : null);
  }

  buscarCotizacionBloqueando(id: number): Promise<Cotizacion | null> {
    this.llamadas.push(`bloquear-cotizacion:${id}`);
    return this.buscarCotizacion(id);
  }

  crearCotizacion(datos: Partial<Cotizacion>): Promise<Cotizacion> {
    const c = crearCotizacion({ ...datos, id: this.ids.cot++ });
    this.cotizaciones.set(c.id, c);
    return Promise.resolve({ ...c });
  }

  guardarCotizacion(c: Cotizacion): Promise<Cotizacion> {
    this.cotizaciones.set(c.id, { ...c });
    return Promise.resolve({ ...c });
  }

  cotizacionesPorIds(ids: readonly number[]): Promise<Cotizacion[]> {
    return Promise.resolve(
      ids.flatMap((id) => {
        const c = this.cotizaciones.get(id);
        return c ? [{ ...c }] : [];
      }),
    );
  }

  private otsVigentes(): OrdenTrabajo[] {
    return [...this.ots.values()].filter(
      (o) =>
        !o.eliminadoEn &&
        o.estado !== EstadoDocumentoCompra.Rechazada &&
        o.estado !== EstadoDocumentoCompra.Anulada,
    );
  }

  otVigentesDeCotizaciones(
    ids: readonly number[],
  ): Promise<Map<number, OtDeCotizacion>> {
    return Promise.resolve(
      new Map(
        this.otsVigentes()
          .filter((o) => ids.includes(o.cotizacionId))
          .map((o) => [
            o.cotizacionId,
            {
              cotizacionId: o.cotizacionId,
              id: o.id,
              numero: o.numero,
              estado: o.estado,
            },
          ]),
      ),
    );
  }

  // --- OT -----------------------------------------------------------------------

  listarOrdenesTrabajo(filtro: FiltroOrdenesTrabajo) {
    return this.paginar([...this.ots.values()], filtro, (o) => {
      if (!filtro.conSaldo) return true;
      const ordenado = this.ocsVigentes()
        .filter((oc) => oc.ordenTrabajoId === o.id)
        .reduce((s, oc) => s + oc.montoNeto, 0);
      return (
        o.estado === EstadoDocumentoCompra.Aprobada && o.montoNeto > ordenado
      );
    });
  }

  buscarOrdenTrabajo(id: number): Promise<OrdenTrabajo | null> {
    const o = this.ots.get(id);
    return Promise.resolve(o && !o.eliminadoEn ? { ...o } : null);
  }

  buscarOrdenTrabajoBloqueando(id: number): Promise<OrdenTrabajo | null> {
    this.llamadas.push(`bloquear-ot:${id}`);
    return this.buscarOrdenTrabajo(id);
  }

  crearOrdenTrabajo(datos: Partial<OrdenTrabajo>): Promise<OrdenTrabajo> {
    const ot = crearOrdenTrabajo({ ...datos, id: this.ids.ot++ });
    if (this.otsVigentes().some((o) => o.cotizacionId === ot.cotizacionId)) {
      return Promise.reject(violacionUnica('ux_orden_trabajo_cotizacion'));
    }
    this.ots.set(ot.id, ot);
    return Promise.resolve({ ...ot });
  }

  guardarOrdenTrabajo(ot: OrdenTrabajo): Promise<OrdenTrabajo> {
    this.ots.set(ot.id, { ...ot });
    return Promise.resolve({ ...ot });
  }

  ordenesTrabajoPorIds(ids: readonly number[]): Promise<OrdenTrabajo[]> {
    return Promise.resolve(
      ids.flatMap((id) => {
        const o = this.ots.get(id);
        return o ? [{ ...o }] : [];
      }),
    );
  }

  listarHitos(ids: readonly number[]): Promise<OrdenTrabajoHito[]> {
    return Promise.resolve(
      [...this.hitos.values()]
        .filter((h) => ids.includes(h.ordenTrabajoId))
        .sort(
          (a, b) => a.ordenTrabajoId - b.ordenTrabajoId || a.numero - b.numero,
        )
        .map((h) => ({ ...h })),
    );
  }

  buscarHito(id: number): Promise<OrdenTrabajoHito | null> {
    const h = this.hitos.get(id);
    return Promise.resolve(h ? { ...h } : null);
  }

  hitosPorIds(ids: readonly number[]): Promise<OrdenTrabajoHito[]> {
    return Promise.resolve(
      ids.flatMap((id) => {
        const h = this.hitos.get(id);
        return h ? [{ ...h }] : [];
      }),
    );
  }

  reemplazarHitos(
    ordenTrabajoId: number,
    hitos: Partial<OrdenTrabajoHito>[],
  ): Promise<void> {
    for (const [id, h] of this.hitos) {
      if (h.ordenTrabajoId === ordenTrabajoId) this.hitos.delete(id);
    }
    for (const h of hitos) {
      const nuevo = crearHito({ ...h, id: this.ids.hito++ });
      this.hitos.set(nuevo.id, nuevo);
    }
    return Promise.resolve();
  }

  private ocsVigentes(excluir?: number): OrdenCompra[] {
    return [...this.ocs.values()].filter(
      (o) =>
        !o.eliminadoEn &&
        o.id !== excluir &&
        ESTADOS_OC_VIGENTES.includes(o.estado),
    );
  }

  ocupacionDeHitos(
    ids: readonly number[],
    _tx?: EntityManager,
    excluirOcId?: number,
  ): Promise<OcupacionHito[]> {
    const porHito = new Map<number, OcupacionHito>();
    for (const oc of this.ocsVigentes(excluirOcId)) {
      if (oc.ordenTrabajoId === null || !ids.includes(oc.ordenTrabajoId))
        continue;
      const actual = porHito.get(oc.hitoId!) ?? {
        hitoId: oc.hitoId!,
        ordenTrabajoId: oc.ordenTrabajoId,
        porcentaje: 0,
        monto: 0,
      };
      actual.porcentaje =
        Math.round((actual.porcentaje + oc.porcentaje!) * 100) / 100;
      actual.monto += oc.montoNeto;
      porHito.set(actual.hitoId, actual);
    }
    return Promise.resolve([...porHito.values()]);
  }

  contarOcVigentesDeOrdenTrabajo(ordenTrabajoId: number): Promise<number> {
    return Promise.resolve(
      this.ocsVigentes().filter((o) => o.ordenTrabajoId === ordenTrabajoId)
        .length,
    );
  }

  // --- OC -----------------------------------------------------------------------

  listarOrdenesCompra(filtro: FiltroOrdenesCompra) {
    return this.paginar(
      [...this.ocs.values()],
      filtro,
      (o) =>
        (filtro.tipo === undefined || o.tipo === filtro.tipo) &&
        (filtro.ordenTrabajoId === undefined ||
          o.ordenTrabajoId === filtro.ordenTrabajoId),
    );
  }

  buscarOrdenCompra(id: number): Promise<OrdenCompra | null> {
    const o = this.ocs.get(id);
    return Promise.resolve(o && !o.eliminadoEn ? { ...o } : null);
  }

  buscarOrdenCompraBloqueando(id: number): Promise<OrdenCompra | null> {
    this.llamadas.push(`bloquear-oc:${id}`);
    return this.buscarOrdenCompra(id);
  }

  crearOrdenCompra(datos: Partial<OrdenCompra>): Promise<OrdenCompra> {
    const oc = crearOrdenCompra({ ...datos, id: this.ids.oc++ });
    this.ocs.set(oc.id, oc);
    return Promise.resolve({ ...oc });
  }

  guardarOrdenCompra(oc: OrdenCompra): Promise<OrdenCompra> {
    this.ocs.set(oc.id, { ...oc });
    return Promise.resolve({ ...oc });
  }

  listarLineas(ids: readonly number[]): Promise<OrdenCompraLinea[]> {
    return Promise.resolve(
      this.lineas
        .filter((l) => ids.includes(l.ordenCompraId))
        .sort((a, b) => a.numero - b.numero)
        .map((l) => ({ ...l })),
    );
  }

  reemplazarLineas(
    ordenCompraId: number,
    lineas: Partial<OrdenCompraLinea>[],
  ): Promise<void> {
    this.lineas = this.lineas.filter((l) => l.ordenCompraId !== ordenCompraId);
    for (const l of lineas) {
      this.lineas.push({
        id: this.ids.linea++,
        createdAt: FECHA,
        createdBy: 2,
        ...l,
      } as OrdenCompraLinea);
    }
    return Promise.resolve();
  }
}

/** Libro de movimientos en memoria (append-only, un original por hecho). */
export class MovimientosRepositorioFake {
  filas: Movimiento[] = [];
  private siguienteId = 1;

  insertar(datos: Partial<Movimiento>): Promise<Movimiento> {
    if (
      datos.reversaDeId === null &&
      this.filas.some(
        (m) =>
          m.reversaDeId === null &&
          m.tipo === datos.tipo &&
          m.origenTipo === datos.origenTipo &&
          m.origenId === datos.origenId,
      )
    ) {
      return Promise.reject(violacionUnica('ux_movimiento_origen'));
    }
    const m = {
      createdAt: FECHA,
      ...datos,
      id: this.siguienteId++,
    } as Movimiento;
    this.filas.push(m);
    return Promise.resolve({ ...m });
  }

  buscarOriginal(
    tipo: TipoMovimiento,
    origenTipo: OrigenMovimiento,
    origenId: number,
  ): Promise<Movimiento | null> {
    const m = this.filas.find(
      (x) =>
        x.tipo === tipo &&
        x.origenTipo === origenTipo &&
        x.origenId === origenId &&
        x.reversaDeId === null,
    );
    return Promise.resolve(m ? { ...m } : null);
  }

  buscarReversaDe(id: number): Promise<Movimiento | null> {
    const m = this.filas.find((x) => x.reversaDeId === id);
    return Promise.resolve(m ? { ...m } : null);
  }

  listarDeOrigen(origenTipo: OrigenMovimiento, origenId: number) {
    return Promise.resolve(
      this.filas.filter(
        (m) => m.origenTipo === origenTipo && m.origenId === origenId,
      ),
    );
  }

  totalesPorCategoria(obraId: number, tipo: TipoMovimiento) {
    const totales = new Map<number | null, number>();
    for (const m of this.filas) {
      if (m.obraId !== obraId || m.tipo !== tipo) continue;
      totales.set(
        m.categoriaGastoId,
        (totales.get(m.categoriaGastoId) ?? 0) + m.montoClp,
      );
    }
    return Promise.resolve(
      [...totales].map(([categoriaGastoId, totalClp]) => ({
        categoriaGastoId,
        totalClp,
      })),
    );
  }
}
