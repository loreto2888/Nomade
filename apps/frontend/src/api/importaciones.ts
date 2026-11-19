import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearApi } from './config';
import {
  ImportacionesApi,
  type EstadoImportacion,
  type FilaImportacionDto,
  type ImportacionLoteDto,
} from './generated';

const importacionesApi = crearApi(ImportacionesApi);

export const claveImportaciones = ['importaciones'] as const;

export interface FiltroImportaciones {
  pagina: number;
  tamanio: number;
  obraId?: number;
  estado?: EstadoImportacion;
}

export function useImportaciones(filtro: FiltroImportaciones) {
  return useQuery({
    queryKey: [...claveImportaciones, 'lista', filtro],
    queryFn: async () => (await importacionesApi.listarImportaciones(filtro)).data,
    placeholderData: keepPreviousData,
  });
}

export function useImportacion(id: number | undefined) {
  return useQuery({
    queryKey: [...claveImportaciones, 'detalle', id],
    queryFn: async () => (await importacionesApi.obtenerImportacion({ id: id! })).data,
    enabled: id !== undefined,
  });
}

export interface FiltroFilasImportacion {
  pagina: number;
  tamanio: number;
  soloErrores: boolean;
}

export function useFilasImportacion(id: number | undefined, filtro: FiltroFilasImportacion) {
  return useQuery({
    queryKey: [...claveImportaciones, 'filas', id, filtro],
    queryFn: async () =>
      (
        await importacionesApi.listarFilasImportacion({
          id: id!,
          pagina: filtro.pagina,
          tamanio: filtro.tamanio,
          soloErrores: filtro.soloErrores ? true : undefined,
        })
      ).data,
    enabled: id !== undefined,
    placeholderData: keepPreviousData,
  });
}

function useMutacionImportaciones<TVariables, TResultado>(
  fn: (variables: TVariables) => Promise<TResultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: claveImportaciones }),
        // Confirmar crea una versión de presupuesto.
        queryClient.invalidateQueries({ queryKey: ['presupuestos'] }),
      ]);
    },
  });
}

/** Sube la planilla y la previsualiza (valida fila a fila; no crea nada hasta confirmar). */
export function useSubirImportacionPresupuesto() {
  return useMutacionImportaciones(
    async ({ archivo, obraId }: { archivo: File; obraId: number }) =>
      (await importacionesApi.subirImportacionPresupuesto({ archivo, obraId })).data,
  );
}

export function useConfirmarImportacion() {
  return useMutacionImportaciones(
    async ({ id, version }: { id: number; version: number }) =>
      (await importacionesApi.confirmarImportacion({ id, confirmarImportacionDto: { version } }))
        .data,
  );
}

export function useDescartarImportacion() {
  return useMutacionImportaciones(
    async ({ id, version, motivo }: { id: number; version: number; motivo?: string }) =>
      (
        await importacionesApi.descartarImportacion({
          id,
          descartarImportacionDto: { version, motivo },
        })
      ).data,
  );
}

/** Plantilla provisoria de presupuesto (.xlsx), descarga directa con la cookie de sesión. */
export const URL_PLANTILLA_PRESUPUESTO = '/api/importaciones/plantillas/presupuesto';

export type { EstadoImportacion, FilaImportacionDto, ImportacionLoteDto };
