import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { crearApi } from './config';
import { AuditoriaApi, type EventoAuditoriaDto } from './generated';

const auditoriaApi = crearApi(AuditoriaApi);

export interface FiltroAuditoria {
  pagina: number;
  tamanio: number;
  q?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
}

export function useAuditoria(filtro: FiltroAuditoria) {
  return useQuery({
    queryKey: ['auditoria', filtro],
    queryFn: async () =>
      (
        await auditoriaApi.consultarAuditoria({
          pagina: filtro.pagina,
          tamanio: filtro.tamanio,
          q: filtro.q,
          accion: filtro.accion,
          desde: filtro.desde,
          hasta: filtro.hasta,
        })
      ).data,
    placeholderData: keepPreviousData,
  });
}

export type { EventoAuditoriaDto };
