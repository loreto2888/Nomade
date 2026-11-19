import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearApi } from './config';
import {
  CatalogosApi,
  type ActualizarCatalogoItemDto,
  type CatalogoItemDto,
  type CrearCatalogoItemDto,
  type TipoCatalogo,
} from './generated';

const catalogosApi = crearApi(CatalogosApi);

export const claveCatalogos = ['catalogos'] as const;

/** Ítems de un catálogo (por defecto solo los activos, para los formularios). */
export function useCatalogo(tipo: TipoCatalogo, incluirInactivos = false) {
  return useQuery({
    queryKey: [...claveCatalogos, tipo, incluirInactivos],
    queryFn: async () => (await catalogosApi.listarCatalogo({ tipo, incluirInactivos })).data,
    staleTime: 5 * 60_000,
  });
}

function useMutacionCatalogos<TVariables, TResultado>(
  fn: (variables: TVariables) => Promise<TResultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: claveCatalogos }),
        // El estado de una obra viene del catálogo: se refrescan las obras al renombrarlo.
        queryClient.invalidateQueries({ queryKey: ['obras'] }),
      ]);
    },
  });
}

export function useCrearItemCatalogo(tipo: TipoCatalogo) {
  return useMutacionCatalogos(
    async (datos: CrearCatalogoItemDto) =>
      (await catalogosApi.crearItemCatalogo({ tipo, crearCatalogoItemDto: datos })).data,
  );
}

export function useActualizarItemCatalogo(tipo: TipoCatalogo) {
  return useMutacionCatalogos(
    async ({ id, ...datos }: ActualizarCatalogoItemDto & { id: number }) =>
      (await catalogosApi.actualizarItemCatalogo({ tipo, id, actualizarCatalogoItemDto: datos }))
        .data,
  );
}

export type { CatalogoItemDto, TipoCatalogo };
