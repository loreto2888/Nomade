import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { crearApi } from './config';
import { EstadoSalud, SaludApi, type SaludDto } from './generated';

export { EstadoSalud, type SaludDto };

const saludApi = crearApi(SaludApi);

const valoresEstado: readonly unknown[] = Object.values(EstadoSalud);

function esSaludDto(valor: unknown): valor is SaludDto {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    valoresEstado.includes(v.estado) &&
    valoresEstado.includes(v.baseDatos) &&
    typeof v.version === 'string' &&
    typeof v.fecha === 'string'
  );
}

/**
 * Consulta `GET /api/health` con `SaludApi.obtenerSalud()`.
 *
 * El backend responde 503 con el mismo `SaludDto` cuando la BD no responde («API OK / BD error»).
 * axios trata el 503 como error, así que en ese caso se usa `error.response.data`.
 */
export async function obtenerSalud(): Promise<SaludDto> {
  try {
    const { data } = await saludApi.obtenerSalud();
    return data;
  } catch (error) {
    const datos: unknown = isAxiosError(error) ? error.response?.data : undefined;
    if (isAxiosError(error) && error.response?.status === 503 && esSaludDto(datos)) {
      return datos;
    }
    throw error;
  }
}

export const claveSalud = ['salud'] as const;

export function useSalud() {
  return useQuery({
    queryKey: claveSalud,
    queryFn: obtenerSalud,
    refetchInterval: 30_000,
  });
}
