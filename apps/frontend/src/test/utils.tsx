import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '@/app/AppProviders';
import { rutas } from '@/app/rutas';

/** Renderiza la app completa en memoria, en la ruta indicada. */
export function renderApp(rutaInicial = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });
  const router = createMemoryRouter(rutas, { initialEntries: [rutaInicial] });
  const resultado = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...resultado, router };
}
