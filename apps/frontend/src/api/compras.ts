import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearApi } from './config';
import {
  CotizacionesApi,
  MovimientosApi,
  OrdenesCompraApi,
  OrdenesTrabajoApi,
  type ActualizarCotizacionDto,
  type ActualizarOrdenCompraDto,
  type ActualizarOrdenTrabajoDto,
  type CotizacionDto,
  type CrearCotizacionDto,
  type CrearOrdenCompraDto,
  type CrearOrdenTrabajoDto,
  type EstadoDocumentoCompra,
  type HitoDto,
  type LineaOrdenCompraDto,
  type MovimientoDto,
  type OrdenCompraDetalleDto,
  type OrdenCompraDto,
  type OrdenTrabajoDto,
  type TipoOrdenCompra,
} from './generated';

const cotizacionesApi = crearApi(CotizacionesApi);
const ordenesTrabajoApi = crearApi(OrdenesTrabajoApi);
const ordenesCompraApi = crearApi(OrdenesCompraApi);
const movimientosApi = crearApi(MovimientosApi);

/**
 * Una sola raíz de caché para compras: aprobar una cotización habilita OT, una OC cambia el saldo de
 * su OT y los compromisos de la obra. Cualquier mutación invalida todo lo de compras.
 */
export const claveCompras = ['compras'] as const;

export interface FiltroDocumentosCompra {
  pagina: number;
  tamanio: number;
  q?: string;
  obraId?: number;
  proveedorId?: number;
  estado?: EstadoDocumentoCompra;
}

// --- Consultas ----------------------------------------------------------------

export function useCotizaciones(
  filtro: FiltroDocumentosCompra & { disponiblesParaOt?: boolean },
  habilitado = true,
) {
  return useQuery({
    queryKey: [...claveCompras, 'cotizaciones', filtro],
    queryFn: async () => (await cotizacionesApi.listarCotizaciones(filtro)).data,
    placeholderData: keepPreviousData,
    enabled: habilitado,
  });
}

export function useCotizacion(id: number | undefined) {
  return useQuery({
    queryKey: [...claveCompras, 'cotizacion', id],
    queryFn: async () => (await cotizacionesApi.obtenerCotizacion({ id: id! })).data,
    enabled: id !== undefined,
  });
}

export function useOrdenesTrabajo(
  filtro: FiltroDocumentosCompra & { conSaldo?: boolean },
  habilitado = true,
) {
  return useQuery({
    queryKey: [...claveCompras, 'ordenes-trabajo', filtro],
    queryFn: async () => (await ordenesTrabajoApi.listarOrdenesTrabajo(filtro)).data,
    placeholderData: keepPreviousData,
    enabled: habilitado,
  });
}

export function useOrdenTrabajo(id: number | undefined) {
  return useQuery({
    queryKey: [...claveCompras, 'orden-trabajo', id],
    queryFn: async () => (await ordenesTrabajoApi.obtenerOrdenTrabajo({ id: id! })).data,
    enabled: id !== undefined,
  });
}

export function useOrdenesCompra(
  filtro: FiltroDocumentosCompra & { tipo?: TipoOrdenCompra; ordenTrabajoId?: number },
  habilitado = true,
) {
  return useQuery({
    queryKey: [...claveCompras, 'ordenes-compra', filtro],
    queryFn: async () => (await ordenesCompraApi.listarOrdenesCompra(filtro)).data,
    placeholderData: keepPreviousData,
    enabled: habilitado,
  });
}

export function useOrdenCompra(id: number | undefined) {
  return useQuery({
    queryKey: [...claveCompras, 'orden-compra', id],
    queryFn: async () => (await ordenesCompraApi.obtenerOrdenCompra({ id: id! })).data,
    enabled: id !== undefined,
  });
}

/** Compromisos vigentes de una obra (libro de movimientos), por categoría de gasto. */
export function useCompromisosObra(obraId: number) {
  return useQuery({
    queryKey: [...claveCompras, 'compromisos', obraId],
    queryFn: async () => (await movimientosApi.resumenCompromisos({ obraId })).data,
  });
}

// --- Mutaciones -----------------------------------------------------------------

function useMutacionCompras<TVariables, TResultado>(
  fn: (variables: TVariables) => Promise<TResultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveCompras }),
  });
}

export type TipoDocumento = 'cotizacion' | 'orden_trabajo' | 'orden_compra';

interface Flujo {
  id: number;
  version: number;
  motivo?: string;
}

/** Acciones del flujo de aprobación comunes a los tres documentos. */
const FLUJO = {
  cotizacion: {
    enviar: ({ id, version }: Flujo) =>
      cotizacionesApi.enviarCotizacionARevision({ id, enviarDocumentoCompraDto: { version } }),
    aprobar: ({ id, version, motivo }: Flujo) =>
      cotizacionesApi.aprobarCotizacion({ id, aprobarDocumentoCompraDto: { version, motivo } }),
    rechazar: ({ id, version, motivo }: Flujo) =>
      cotizacionesApi.rechazarCotizacion({
        id,
        rechazarDocumentoCompraDto: { version, motivo: motivo ?? '' },
      }),
    eliminar: ({ id, version, motivo }: Flujo) =>
      cotizacionesApi.eliminarCotizacion({ id, eliminarDocumentoCompraDto: { version, motivo } }),
    anular: null,
  },
  orden_trabajo: {
    enviar: ({ id, version }: Flujo) =>
      ordenesTrabajoApi.enviarOrdenTrabajoARevision({ id, enviarDocumentoCompraDto: { version } }),
    aprobar: ({ id, version, motivo }: Flujo) =>
      ordenesTrabajoApi.aprobarOrdenTrabajo({ id, aprobarDocumentoCompraDto: { version, motivo } }),
    rechazar: ({ id, version, motivo }: Flujo) =>
      ordenesTrabajoApi.rechazarOrdenTrabajo({
        id,
        rechazarDocumentoCompraDto: { version, motivo: motivo ?? '' },
      }),
    eliminar: ({ id, version, motivo }: Flujo) =>
      ordenesTrabajoApi.eliminarOrdenTrabajo({
        id,
        eliminarDocumentoCompraDto: { version, motivo },
      }),
    anular: ({ id, version, motivo }: Flujo) =>
      ordenesTrabajoApi.anularOrdenTrabajo({
        id,
        anularDocumentoCompraDto: { version, motivo: motivo ?? '' },
      }),
  },
  orden_compra: {
    enviar: ({ id, version }: Flujo) =>
      ordenesCompraApi.enviarOrdenCompraARevision({ id, enviarDocumentoCompraDto: { version } }),
    aprobar: ({ id, version, motivo }: Flujo) =>
      ordenesCompraApi.aprobarOrdenCompra({ id, aprobarDocumentoCompraDto: { version, motivo } }),
    rechazar: ({ id, version, motivo }: Flujo) =>
      ordenesCompraApi.rechazarOrdenCompra({
        id,
        rechazarDocumentoCompraDto: { version, motivo: motivo ?? '' },
      }),
    eliminar: ({ id, version, motivo }: Flujo) =>
      ordenesCompraApi.eliminarOrdenCompra({ id, eliminarDocumentoCompraDto: { version, motivo } }),
    anular: ({ id, version, motivo }: Flujo) =>
      ordenesCompraApi.anularOrdenCompra({
        id,
        anularDocumentoCompraDto: { version, motivo: motivo ?? '' },
      }),
  },
} as const;

export type AccionFlujo = 'enviar' | 'aprobar' | 'rechazar' | 'eliminar' | 'anular';

/** Mutación de una acción del flujo (enviar, aprobar, rechazar, eliminar o anular) de un documento. */
export function useAccionDocumento(tipo: TipoDocumento, accion: AccionFlujo) {
  return useMutacionCompras(async (datos: Flujo) => {
    const fn = FLUJO[tipo][accion];
    if (!fn) throw new Error(`Acción no disponible: ${accion}`);
    await fn(datos);
  });
}

export function useCrearCotizacion() {
  return useMutacionCompras(
    async (datos: CrearCotizacionDto) =>
      (await cotizacionesApi.crearCotizacion({ crearCotizacionDto: datos })).data,
  );
}

export function useActualizarCotizacion() {
  return useMutacionCompras(
    async ({ id, ...datos }: ActualizarCotizacionDto & { id: number }) =>
      (await cotizacionesApi.actualizarCotizacion({ id, actualizarCotizacionDto: datos })).data,
  );
}

export function useCrearOrdenTrabajo() {
  return useMutacionCompras(
    async (datos: CrearOrdenTrabajoDto) =>
      (await ordenesTrabajoApi.crearOrdenTrabajo({ crearOrdenTrabajoDto: datos })).data,
  );
}

export function useActualizarOrdenTrabajo() {
  return useMutacionCompras(
    async ({ id, ...datos }: ActualizarOrdenTrabajoDto & { id: number }) =>
      (await ordenesTrabajoApi.actualizarOrdenTrabajo({ id, actualizarOrdenTrabajoDto: datos }))
        .data,
  );
}

export function useCrearOrdenCompra() {
  return useMutacionCompras(
    async (datos: CrearOrdenCompraDto) =>
      (await ordenesCompraApi.crearOrdenCompra({ crearOrdenCompraDto: datos })).data,
  );
}

export function useActualizarOrdenCompra() {
  return useMutacionCompras(
    async ({ id, ...datos }: ActualizarOrdenCompraDto & { id: number }) =>
      (await ordenesCompraApi.actualizarOrdenCompra({ id, actualizarOrdenCompraDto: datos })).data,
  );
}

export function useRecibirOrdenCompra() {
  return useMutacionCompras(
    async ({
      id,
      version,
      fechaRecepcion,
      observacion,
    }: {
      id: number;
      version: number;
      fechaRecepcion?: string;
      observacion?: string | null;
    }) =>
      (
        await ordenesCompraApi.recibirOrdenCompra({
          id,
          recibirOrdenCompraDto: { version, fechaRecepcion, observacion },
        })
      ).data,
  );
}

export type {
  CotizacionDto,
  EstadoDocumentoCompra,
  HitoDto,
  LineaOrdenCompraDto,
  MovimientoDto,
  OrdenCompraDetalleDto,
  OrdenCompraDto,
  OrdenTrabajoDto,
  TipoOrdenCompra,
};
