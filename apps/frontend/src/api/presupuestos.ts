import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearApi } from './config';
import {
  PresupuestosApi,
  type ActualizarPartidaDto,
  type ComparacionPresupuestoDto,
  type CrearPartidaDto,
  type EstadoPresupuesto,
  type PartidaDto,
  type PresupuestoDetalleDto,
  type PresupuestoVersionDto,
} from './generated';

const presupuestosApi = crearApi(PresupuestosApi);

export const clavePresupuestos = ['presupuestos'] as const;

/** Versiones de presupuesto de una obra (de la más reciente a la más antigua). */
export function usePresupuestos(obraId: number) {
  return useQuery({
    queryKey: [...clavePresupuestos, 'obra', obraId],
    queryFn: async () => (await presupuestosApi.listarPresupuestos({ obraId })).data,
  });
}

/** Una versión con sus partidas y totales por familia. */
export function usePresupuesto(id: number | undefined) {
  return useQuery({
    queryKey: [...clavePresupuestos, 'detalle', id],
    queryFn: async () => (await presupuestosApi.obtenerPresupuesto({ id: id! })).data,
    enabled: id !== undefined,
  });
}

/** Comparación de una versión con la vigente (o con `baseId`). Solo se consulta si `habilitado`. */
export function useComparacionPresupuesto(
  id: number | undefined,
  baseId: number | undefined,
  habilitado: boolean,
) {
  return useQuery({
    queryKey: [...clavePresupuestos, 'comparacion', id, baseId],
    queryFn: async () => (await presupuestosApi.compararPresupuesto({ id: id!, baseId })).data,
    enabled: habilitado && id !== undefined,
    retry: false,
  });
}

function useMutacionPresupuestos<TVariables, TResultado>(
  fn: (variables: TVariables) => Promise<TResultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Cualquier cambio de una versión o de sus partidas altera listas, detalles y comparaciones.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavePresupuestos }),
  });
}

export function useCrearPresupuesto(obraId: number) {
  return useMutacionPresupuestos(
    async (datos: { copiarDeId?: number; descripcion?: string | null }) =>
      (await presupuestosApi.crearPresupuesto({ obraId, crearPresupuestoDto: datos })).data,
  );
}

export function useActualizarPresupuesto() {
  return useMutacionPresupuestos(
    async ({
      id,
      version,
      descripcion,
    }: {
      id: number;
      version: number;
      descripcion: string | null;
    }) =>
      (
        await presupuestosApi.actualizarPresupuesto({
          id,
          actualizarPresupuestoDto: { version, descripcion },
        })
      ).data,
  );
}

export function useEliminarPresupuesto() {
  return useMutacionPresupuestos(
    async ({ id, version, motivo }: { id: number; version: number; motivo?: string }) => {
      await presupuestosApi.eliminarPresupuesto({
        id,
        eliminarPresupuestoDto: { version, motivo },
      });
    },
  );
}

export function useEnviarPresupuestoARevision() {
  return useMutacionPresupuestos(
    async ({ id, version }: { id: number; version: number }) =>
      (await presupuestosApi.enviarPresupuestoARevision({ id, enviarPresupuestoDto: { version } }))
        .data,
  );
}

export function useAprobarPresupuesto() {
  return useMutacionPresupuestos(
    async ({ id, version, motivo }: { id: number; version: number; motivo?: string }) =>
      (await presupuestosApi.aprobarPresupuesto({ id, aprobarPresupuestoDto: { version, motivo } }))
        .data,
  );
}

export function useRechazarPresupuesto() {
  return useMutacionPresupuestos(
    async ({ id, version, motivo }: { id: number; version: number; motivo: string }) =>
      (
        await presupuestosApi.rechazarPresupuesto({
          id,
          rechazarPresupuestoDto: { version, motivo },
        })
      ).data,
  );
}

export function useCrearPartida(versionId: number) {
  return useMutacionPresupuestos(
    async (datos: CrearPartidaDto) =>
      (await presupuestosApi.crearPartida({ id: versionId, crearPartidaDto: datos })).data,
  );
}

export function useActualizarPartida(versionId: number) {
  return useMutacionPresupuestos(
    async ({ partidaId, ...datos }: ActualizarPartidaDto & { partidaId: number }) =>
      (
        await presupuestosApi.actualizarPartida({
          id: versionId,
          partidaId,
          actualizarPartidaDto: datos,
        })
      ).data,
  );
}

export function useEliminarPartida(versionId: number) {
  return useMutacionPresupuestos(
    async ({ partidaId, version }: { partidaId: number; version: number }) => {
      await presupuestosApi.eliminarPartida({
        id: versionId,
        partidaId,
        eliminarPartidaDto: { version },
      });
    },
  );
}

/** Descarga directa (cookie de sesión): Excel de la versión. */
export const urlExportarPresupuesto = (id: number): string => `/api/presupuestos/${id}/exportar`;

export type {
  ComparacionPresupuestoDto,
  EstadoPresupuesto,
  PartidaDto,
  PresupuestoDetalleDto,
  PresupuestoVersionDto,
};
