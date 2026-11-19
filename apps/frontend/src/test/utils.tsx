import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { claveSesion, type SesionApi } from '@/api/auth';
import { AppProviders } from '@/app/AppProviders';
import { rutas } from '@/app/rutas';
import type { ModoTema } from '@/app/theme';
import { sesionAdmin } from './fixtures';

interface OpcionesRender {
  /** Sesión precargada: por defecto un admin; `null` = sin sesión (muestra el login). */
  sesion?: SesionApi | null;
  modo?: ModoTema;
}

export function crearQueryClientPrueba(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchInterval: false },
      mutations: { retry: false },
    },
  });
}

/** Renderiza la app completa en memoria, en la ruta indicada. */
export function renderApp(rutaInicial = '/', opciones: OpcionesRender = {}) {
  const queryClient = crearQueryClientPrueba();
  const sesion = opciones.sesion === undefined ? sesionAdmin : opciones.sesion;
  queryClient.setQueryData(claveSesion, sesion);
  const router = createMemoryRouter(rutas, { initialEntries: [rutaInicial] });
  const resultado = render(
    <AppProviders queryClient={queryClient} modoInicial={opciones.modo}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...resultado, router, queryClient };
}
