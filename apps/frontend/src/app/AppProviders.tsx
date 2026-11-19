import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { ModoTema } from './theme';
import { ProveedorTema } from './tema/ProveedorTema';

interface AppProvidersProps {
  queryClient: QueryClient;
  children: ReactNode;
  /** Solo para pruebas: fuerza el modo de tema inicial. */
  modoInicial?: ModoTema;
}

export function AppProviders({ queryClient, children, modoInicial }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProveedorTema modoInicial={modoInicial}>{children}</ProveedorTema>
    </QueryClientProvider>
  );
}
