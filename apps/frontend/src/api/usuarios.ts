import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearApi } from './config';
import {
  UsuariosApi,
  type ActualizarUsuarioDto,
  type CrearUsuarioDto,
  type Rol,
  type UsuarioClaveTemporalDto,
  type UsuarioDto,
} from './generated';

const usuariosApi = crearApi(UsuariosApi);

export interface FiltroUsuarios {
  pagina: number;
  tamanio: number;
  q?: string;
  rol?: Rol;
  activo?: boolean;
}

export const claveUsuarios = ['usuarios'] as const;

export function useUsuarios(filtro: FiltroUsuarios) {
  return useQuery({
    queryKey: [...claveUsuarios, filtro],
    queryFn: async () => (await usuariosApi.listarUsuarios(filtro)).data,
    placeholderData: keepPreviousData,
  });
}

function useMutacionUsuarios<TVariables, TResultado>(
  fn: (variables: TVariables) => Promise<TResultado>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveUsuarios }),
  });
}

export function useCrearUsuario() {
  return useMutacionUsuarios(async (datos: CrearUsuarioDto) => {
    const { data } = await usuariosApi.crearUsuario({ crearUsuarioDto: datos });
    return data;
  });
}

export function useActualizarUsuario() {
  return useMutacionUsuarios(
    async ({ id, ...datos }: ActualizarUsuarioDto & { id: number }) =>
      (await usuariosApi.actualizarUsuario({ id, actualizarUsuarioDto: datos })).data,
  );
}

interface AccionUsuario {
  id: number;
  version: number;
  motivo?: string;
}

export function useDesactivarUsuario() {
  return useMutacionUsuarios(async ({ id, ...accion }: AccionUsuario) => {
    const { data } = await usuariosApi.desactivarUsuario({ id, accionUsuarioDto: accion });
    return data;
  });
}

export function useActivarUsuario() {
  return useMutacionUsuarios(async ({ id, ...accion }: AccionUsuario) => {
    const { data } = await usuariosApi.activarUsuario({ id, accionUsuarioDto: accion });
    return data;
  });
}

export function useRestablecerClave() {
  return useMutacionUsuarios(async ({ id, ...accion }: AccionUsuario) => {
    const { data } = await usuariosApi.restablecerClaveUsuario({ id, accionUsuarioDto: accion });
    return data;
  });
}

export type { UsuarioClaveTemporalDto, UsuarioDto, Rol };
