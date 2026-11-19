import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http } from '@/api/http';
import { EstadoSalud, type SaludDto } from '@/api/salud';
import { EstadoSistemaCard } from './EstadoSistemaCard';

function renderTarjeta() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EstadoSistemaCard />
    </QueryClientProvider>,
  );
}

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

function respuesta(data: unknown, status = 200): AxiosResponse<unknown> {
  return { data, status, statusText: '', headers: {}, config };
}

/** Error que lanza axios ante un estado HTTP fuera de 2xx (p. ej. el 503 de `/api/health`). */
function errorHttp(data: unknown, status: number): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    respuesta(data, status),
  );
}

const saludOk: SaludDto = {
  estado: EstadoSalud.Ok,
  baseDatos: EstadoSalud.Ok,
  version: '0.1.0',
  fecha: '2026-11-18T12:00:00.000Z',
};

describe('EstadoSistemaCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra API y BD en OK con versión y fecha', async () => {
    const request = vi.spyOn(http, 'request').mockResolvedValue(respuesta(saludOk));

    renderTarjeta();

    expect(await screen.findByText('API: OK')).toBeInTheDocument();
    expect(screen.getByText('Base de datos: OK')).toBeInTheDocument();
    expect(screen.getByText('0.1.0')).toBeInTheDocument();
    // Llamada hecha por el cliente generado (SaludApi.obtenerSalud) sobre la instancia compartida.
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/health', method: 'GET', withCredentials: true }),
    );
  });

  it('muestra la BD en error cuando el backend responde 503 con el estado', async () => {
    vi.spyOn(http, 'request').mockRejectedValue(
      errorHttp({ ...saludOk, estado: EstadoSalud.Error, baseDatos: EstadoSalud.Error }, 503),
    );

    renderTarjeta();

    expect(await screen.findByText('Base de datos: Error')).toBeInTheDocument();
    expect(screen.getByText('API: OK')).toBeInTheDocument();
  });

  it('muestra un error amigable si el 503 no trae un estado válido', async () => {
    vi.spyOn(http, 'request').mockRejectedValue(errorHttp('<html>Service Unavailable</html>', 503));

    renderTarjeta();

    expect(await screen.findByText(/No fue posible conectar con el servidor/)).toBeInTheDocument();
  });

  it('muestra un error amigable si no hay backend', async () => {
    vi.spyOn(http, 'request').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));

    renderTarjeta();

    expect(await screen.findByText(/No fue posible conectar con el servidor/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
