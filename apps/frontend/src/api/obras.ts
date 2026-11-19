import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearApi } from './config';
import {
  ObrasApi,
  type ActualizarObraDto,
  type CrearObraDto,
  type DireccionOrden,
  type ListarObrasOrdenarPorEnum,
  type ObraDto,
  type ResumenObraDto,
} from './generated';

const obrasApi = crearApi(ObrasApi);

export interface FiltroObras {
  pagina: number;
  tamanio: number;
  q?: string;
  estadoId?: number;
  clienteId?: number;
  ordenarPor?: ListarObrasOrdenarPorEnum;
  direccion?: DireccionOrden;
}

export const claveObras = ['obras'] as const;

export function useObras(filtro: FiltroObras) {
  return useQuery({
    queryKey: [...claveObras, 'lista', filtro],
    queryFn: async () => (await obrasApi.listarObras(filtro)).data,
    placeholderData: keepPreviousData,
  });
}

/** Datos de la obra para editarla. */
export function useObra(id: number | undefined) {
  return useQuery({
    queryKey: [...claveObras, 'detalle', id],
    queryFn: async () => (await obrasApi.obtenerObra({ id: id! })).data,
    enabled: id !== undefined,
  });
}

/** Ficha 360° (pestaña Resumen). */
export function useResumenObra(id: number | undefined) {
  return useQuery({
    queryKey: [...claveObras, 'resumen', id],
    queryFn: async () => (await obrasApi.obtenerResumenObra({ id: id! })).data,
    enabled: id !== undefined,
  });
}

/** Vuelve a pedir la obra al servidor (p. ej. tras un conflicto de versión). */
export function useCargarObra() {
  const queryClient = useQueryClient();
  return (id: number) =>
    queryClient.fetchQuery({
      queryKey: [...claveObras, 'detalle', id],
      queryFn: async () => (await obrasApi.obtenerObra({ id })).data,
      staleTime: 0,
    });
}

function useMutacionObras<TVariables, TResultado>(
  fn: (variables: TVariables) => Promise<TResultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveObras }),
  });
}

export function useCrearObra() {
  return useMutacionObras(
    async (datos: CrearObraDto) => (await obrasApi.crearObra({ crearObraDto: datos })).data,
  );
}

export function useActualizarObra() {
  return useMutacionObras(
    async ({ id, ...datos }: ActualizarObraDto & { id: number }) =>
      (await obrasApi.actualizarObra({ id, actualizarObraDto: datos })).data,
  );
}

export function useEliminarObra() {
  return useMutacionObras(
    async ({ id, version, motivo }: { id: number; version: number; motivo?: string }) => {
      await obrasApi.eliminarObra({ id, eliminarObraDto: { version, motivo } });
    },
  );
}

export type { ObraDto, ResumenObraDto };
