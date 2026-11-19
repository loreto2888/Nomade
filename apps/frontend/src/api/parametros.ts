import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearApi } from './config';
import {
  ParametrosApi,
  UfApi,
  type AgregarValorParametroDto,
  type ParametroDto,
  type ValorParametroDto,
  type ValorUfDto,
} from './generated';

const parametrosApi = crearApi(ParametrosApi);
const ufApi = crearApi(UfApi);

export const claveParametros = ['parametros'] as const;
export const claveUf = ['uf'] as const;

export function useParametros() {
  return useQuery({
    queryKey: claveParametros,
    queryFn: async () => (await parametrosApi.listarParametros()).data,
  });
}

export function useHistorialParametro(id: number | undefined) {
  return useQuery({
    queryKey: [...claveParametros, id, 'valores'],
    queryFn: async () => (await parametrosApi.listarValoresParametro({ id: id! })).data,
    enabled: id !== undefined,
  });
}

function useMutacionParametros<TVariables, TResultado>(
  fn: (variables: TVariables) => Promise<TResultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveParametros }),
  });
}

export function useAgregarValorParametro() {
  return useMutacionParametros(
    async ({ id, ...datos }: AgregarValorParametroDto & { id: number }) =>
      (await parametrosApi.agregarValorParametro({ id, agregarValorParametroDto: datos })).data,
  );
}

export function useEliminarValorParametro() {
  return useMutacionParametros(
    async (p: { id: number; valorId: number; version: number; motivo?: string }) =>
      (
        await parametrosApi.eliminarValorParametro({
          id: p.id,
          valorId: p.valorId,
          eliminarValorParametroDto: { version: p.version, motivo: p.motivo },
        })
      ).data,
  );
}

// ---------------------------------------------------------------------------
// Valores de la UF
// ---------------------------------------------------------------------------

/** Valor de la UF aplicable a una fecha (por defecto hoy). Cualquier usuario puede consultarlo. */
export function useValorUf(fecha?: string, habilitado = true) {
  return useQuery({
    queryKey: [...claveUf, 'valor', fecha ?? 'hoy'],
    queryFn: async () => (await ufApi.obtenerValorUf({ fecha })).data,
    enabled: habilitado,
    retry: false,
  });
}

/** Lista de valores cargados (solo admin). */
export function useValoresUf(filtro: { pagina: number; tamanio: number }) {
  return useQuery({
    queryKey: [...claveUf, 'lista', filtro],
    queryFn: async () => (await ufApi.listarValoresUf(filtro)).data,
    placeholderData: keepPreviousData,
  });
}

export function useGuardarValorUf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fecha, valor }: { fecha: string; valor: number }) =>
      (await ufApi.guardarValorUf({ fecha, guardarValorUfDto: { valor } })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveUf }),
  });
}

export type { ParametroDto, ValorParametroDto, ValorUfDto };
