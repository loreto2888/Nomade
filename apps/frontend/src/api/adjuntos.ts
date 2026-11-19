import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearApi } from './config';
import { AdjuntosApi, type AdjuntoDto, type EntidadAdjuntable } from './generated';

const adjuntosApi = crearApi(AdjuntosApi);

export const claveAdjuntos = ['adjuntos'] as const;

export function useAdjuntos(entidadTipo: EntidadAdjuntable, entidadId: number) {
  return useQuery({
    queryKey: [...claveAdjuntos, entidadTipo, entidadId],
    queryFn: async () => (await adjuntosApi.listarAdjuntos({ entidadTipo, entidadId })).data,
  });
}

export function useSubirAdjunto(entidadTipo: EntidadAdjuntable, entidadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ archivo, descripcion }: { archivo: File; descripcion?: string }) =>
      (await adjuntosApi.subirAdjunto({ archivo, entidadTipo, entidadId, descripcion })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...claveAdjuntos, entidadTipo, entidadId] }),
        // El resumen de la obra muestra la cantidad de adjuntos.
        queryClient.invalidateQueries({ queryKey: ['obras'] }),
      ]);
    },
  });
}

export function useEliminarAdjunto(entidadTipo: EntidadAdjuntable, entidadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo?: string }) => {
      await adjuntosApi.eliminarAdjunto({ id, eliminarAdjuntoDto: { motivo } });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...claveAdjuntos, entidadTipo, entidadId] }),
        queryClient.invalidateQueries({ queryKey: ['obras'] }),
      ]);
    },
  });
}

/**
 * Ruta de descarga. Es una URL de la API con la cookie de sesión: el navegador la descarga
 * directamente (Content-Disposition: attachment) sin cargar el archivo en memoria.
 */
export const urlDescargaAdjunto = (id: number): string => `/api/adjuntos/${id}/descargar`;

export type { AdjuntoDto, EntidadAdjuntable };
