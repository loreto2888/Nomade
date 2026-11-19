import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearApi } from './config';
import {
  ClientesApi,
  type ActualizarClienteDto,
  type ClienteDto,
  type CrearClienteDto,
  type DireccionOrden,
  type ListarClientesOrdenarPorEnum,
} from './generated';

const clientesApi = crearApi(ClientesApi);

export interface FiltroClientes {
  pagina: number;
  tamanio: number;
  q?: string;
  ordenarPor?: ListarClientesOrdenarPorEnum;
  direccion?: DireccionOrden;
}

export const claveClientes = ['clientes'] as const;

export function useClientes(filtro: FiltroClientes, opciones: { habilitado?: boolean } = {}) {
  return useQuery({
    queryKey: [...claveClientes, filtro],
    queryFn: async () => (await clientesApi.listarClientes(filtro)).data,
    placeholderData: keepPreviousData,
    enabled: opciones.habilitado ?? true,
  });
}

function useMutacionClientes<TVariables, TResultado>(
  fn: (variables: TVariables) => Promise<TResultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Los clientes aparecen también en obras (nombre del cliente): se refrescan ambos.
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: claveClientes }),
        queryClient.invalidateQueries({ queryKey: ['obras'] }),
      ]);
    },
  });
}

export function useCrearCliente() {
  return useMutacionClientes(
    async (datos: CrearClienteDto) =>
      (await clientesApi.crearCliente({ crearClienteDto: datos })).data,
  );
}

export function useActualizarCliente() {
  return useMutacionClientes(
    async ({ id, ...datos }: ActualizarClienteDto & { id: number }) =>
      (await clientesApi.actualizarCliente({ id, actualizarClienteDto: datos })).data,
  );
}

export function useEliminarCliente() {
  return useMutacionClientes(
    async ({ id, version, motivo }: { id: number; version: number; motivo?: string }) => {
      await clientesApi.eliminarCliente({ id, eliminarClienteDto: { version, motivo } });
    },
  );
}

export type { ClienteDto };
