import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearApi } from './config';
import {
  ProveedoresApi,
  type ActualizarCuentaBancariaDto,
  type ActualizarProveedorDto,
  type CrearCuentaBancariaDto,
  type CrearProveedorDto,
  type CuentaBancariaDto,
  type DireccionOrden,
  type ListarProveedoresOrdenarPorEnum,
  type ProveedorDto,
} from './generated';

const proveedoresApi = crearApi(ProveedoresApi);

export interface FiltroProveedores {
  pagina: number;
  tamanio: number;
  q?: string;
  ordenarPor?: ListarProveedoresOrdenarPorEnum;
  direccion?: DireccionOrden;
}

export const claveProveedores = ['proveedores'] as const;
const claveCuentas = (proveedorId: number) => ['proveedores', proveedorId, 'cuentas'] as const;

export function useProveedores(filtro: FiltroProveedores) {
  return useQuery({
    queryKey: [...claveProveedores, 'lista', filtro],
    queryFn: async () => (await proveedoresApi.listarProveedores(filtro)).data,
    placeholderData: keepPreviousData,
  });
}

function useMutacionProveedores<TVariables, TResultado>(
  fn: (variables: TVariables) => Promise<TResultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveProveedores }),
  });
}

export function useCrearProveedor() {
  return useMutacionProveedores(
    async (datos: CrearProveedorDto) =>
      (await proveedoresApi.crearProveedor({ crearProveedorDto: datos })).data,
  );
}

export function useActualizarProveedor() {
  return useMutacionProveedores(
    async ({ id, ...datos }: ActualizarProveedorDto & { id: number }) =>
      (await proveedoresApi.actualizarProveedor({ id, actualizarProveedorDto: datos })).data,
  );
}

export function useEliminarProveedor() {
  return useMutacionProveedores(
    async ({ id, version, motivo }: { id: number; version: number; motivo?: string }) => {
      await proveedoresApi.eliminarProveedor({ id, eliminarProveedorDto: { version, motivo } });
    },
  );
}

// ---------------------------------------------------------------------------
// Cuentas bancarias (solo admin; cada consulta queda en la bitácora)
// ---------------------------------------------------------------------------

export function useCuentasBancarias(proveedorId: number | undefined, habilitado = true) {
  return useQuery({
    queryKey: claveCuentas(proveedorId ?? 0),
    queryFn: async () =>
      (await proveedoresApi.listarCuentasBancarias({ proveedorId: proveedorId! })).data,
    enabled: proveedorId !== undefined && habilitado,
    // Cada lectura se audita: no se vuelve a pedir al cambiar de pestaña ni se conserva en caché.
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

function useMutacionCuentas<TVariables, TResultado>(
  proveedorId: number,
  fn: (variables: TVariables) => Promise<TResultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: claveCuentas(proveedorId) }),
        queryClient.invalidateQueries({ queryKey: claveProveedores }),
      ]);
    },
  });
}

export function useCrearCuentaBancaria(proveedorId: number) {
  return useMutacionCuentas(
    proveedorId,
    async (datos: CrearCuentaBancariaDto) =>
      (await proveedoresApi.crearCuentaBancaria({ proveedorId, crearCuentaBancariaDto: datos }))
        .data,
  );
}

export function useActualizarCuentaBancaria(proveedorId: number) {
  return useMutacionCuentas(
    proveedorId,
    async ({ cuentaId, ...datos }: ActualizarCuentaBancariaDto & { cuentaId: number }) =>
      (
        await proveedoresApi.actualizarCuentaBancaria({
          proveedorId,
          cuentaId,
          actualizarCuentaBancariaDto: datos,
        })
      ).data,
  );
}

export function useEliminarCuentaBancaria(proveedorId: number) {
  return useMutacionCuentas(
    proveedorId,
    async ({
      cuentaId,
      version,
      motivo,
    }: {
      cuentaId: number;
      version: number;
      motivo?: string;
    }) => {
      await proveedoresApi.eliminarCuentaBancaria({
        proveedorId,
        cuentaId,
        eliminarCuentaBancariaDto: { version, motivo },
      });
    },
  );
}

export type { CuentaBancariaDto, ProveedorDto };
