import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { crearApi } from './config';
import { AuthApi, type Rol, type SesionActualDto, type TemaInterfaz } from './generated';

const authApi = crearApi(AuthApi);

export const claveSesion = ['sesion'] as const;

/**
 * Descarta los datos en caché de otras consultas (pertenecían a la sesión anterior) y fija la
 * sesión. La consulta de sesión se conserva (no se usa `clear()`) para no desuscribir a quienes
 * la observan.
 */
export function establecerSesion(queryClient: QueryClient, sesion: SesionApi | null): void {
  queryClient.removeQueries({ predicate: (consulta) => consulta.queryKey[0] !== claveSesion[0] });
  queryClient.setQueryData(claveSesion, sesion);
}

/** Sesión del usuario autenticado (`null` = sin sesión). */
export type SesionApi = SesionActualDto;

/**
 * `GET /api/auth/sesion`. Un 401 no es un error de la consulta: significa «sin sesión» y se
 * representa con `null` para que las rutas protegidas redirijan al login.
 */
export async function obtenerSesion(): Promise<SesionApi | null> {
  try {
    const { data } = await authApi.obtenerSesion();
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
}

export function useSesionQuery() {
  return useQuery({
    queryKey: claveSesion,
    queryFn: obtenerSesion,
    // La validez real la decide el backend en cada request (401 → sesión perdida).
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useIniciarSesion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: { correo: string; clave: string }) => {
      const { data } = await authApi.iniciarSesion({ iniciarSesionDto: datos });
      return data;
    },
    onSuccess: (sesion) => establecerSesion(queryClient, sesion),
  });
}

export function useCerrarSesion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.cerrarSesion(),
    // Aunque falle la red, el cliente descarta su estado: la cookie caduca sola.
    onSettled: () => establecerSesion(queryClient, null),
  });
}

export function useCambiarClave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: { claveActual: string; claveNueva: string }) => {
      const { data } = await authApi.cambiarClave({ cambiarClaveDto: datos });
      return data;
    },
    onSuccess: (sesion) => {
      queryClient.setQueryData(claveSesion, sesion);
    },
  });
}

export function useActualizarTemaUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tema: TemaInterfaz) => {
      const { data } = await authApi.actualizarTema({ actualizarTemaDto: { tema } });
      return data;
    },
    onSuccess: (sesion) => {
      queryClient.setQueryData(claveSesion, sesion);
    },
  });
}

export type { Rol, TemaInterfaz };
