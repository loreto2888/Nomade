import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { claveSesion } from '@/api/auth';
import { http } from '@/api/http';
import { errorApi, simularApi } from '@/test/api';
import { sesionAdmin, sesionUsuario } from '@/test/fixtures';
import { renderApp } from '@/test/utils';

describe('rutas protegidas y menú por rol', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('el admin ve la sección Administración con Usuarios y Auditoría', () => {
    simularApi({});
    renderApp('/', { sesion: sesionAdmin });
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    const admin = within(nav).getByRole('list', { name: 'Administración' });
    expect(within(admin).getByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
    expect(within(admin).getByRole('link', { name: 'Auditoría' })).toBeInTheDocument();
  });

  it('el rol usuario no ve el menú Administración', () => {
    simularApi({});
    renderApp('/', { sesion: sesionUsuario });
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(within(nav).queryByRole('list', { name: 'Administración' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
  });

  it('el rol usuario no puede abrir /admin/usuarios por URL: vuelve al inicio', async () => {
    simularApi({});
    const { router } = renderApp('/admin/usuarios', { sesion: sesionUsuario });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('P23 y P29 aparecen en el menú como «pendientes» (D-09); P27 ya está implementada', () => {
    simularApi({});
    renderApp('/', { sesion: sesionAdmin });
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(within(nav).getByRole('link', { name: 'Parámetros' })).not.toHaveTextContent(
      'Pendiente',
    );
    for (const nombre of ['Migración e integraciones', 'Asistencia con IA']) {
      const enlace = within(nav).getByRole('link', { name: new RegExp(nombre) });
      expect(within(enlace).getByText('Pendiente')).toBeInTheDocument();
    }
    expect(within(nav).getByRole('link', { name: 'Usuarios' })).not.toHaveTextContent('Pendiente');
  });

  it('la barra muestra avatar, nombre y rol del usuario', () => {
    simularApi({});
    renderApp('/', { sesion: sesionUsuario });
    const barra = screen.getByRole('banner', { name: 'Barra superior' });
    expect(within(barra).getByText('Camila Rojas')).toBeInTheDocument();
    expect(within(barra).getByText('Usuario')).toBeInTheDocument();
    expect(within(barra).getByText('CR')).toBeInTheDocument();
  });

  it('«Salir» cierra la sesión y lleva al login', async () => {
    const api = simularApi({ 'POST /api/auth/logout': () => undefined });
    const user = userEvent.setup();
    const { router, queryClient } = renderApp('/', { sesion: sesionAdmin });

    await user.click(
      within(screen.getByRole('banner', { name: 'Barra superior' })).getByRole('button', {
        name: 'Salir',
      }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/ingresar'));
    expect(api.veces('POST /api/auth/logout')).toBe(1);
    expect(queryClient.getQueryData(claveSesion)).toBeNull();
  });

  it('si el servidor responde 401 por sesión vencida, vuelve al login', async () => {
    simularApi({});
    const { router, queryClient } = renderApp('/obras', { sesion: sesionAdmin });
    vi.mocked(http.request).mockRestore();

    await act(async () => {
      await http
        .request({
          url: '/api/obras',
          adapter: () =>
            Promise.reject(
              errorApi(401, 'SESION_EXPIRADA', 'Tu sesión expiró. Inicia sesión nuevamente.'),
            ),
        })
        .catch(() => undefined);
    });

    await waitFor(() => expect(router.state.location.pathname).toBe('/ingresar'));
    expect(queryClient.getQueryData(claveSesion)).toBeNull();
  });

  it('un 401 de credenciales incorrectas NO cierra la sesión', async () => {
    simularApi({});
    const { router } = renderApp('/obras', { sesion: sesionAdmin });
    vi.mocked(http.request).mockRestore();

    await act(async () => {
      await http
        .request({
          url: '/api/auth/login',
          adapter: () =>
            Promise.reject(
              errorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.'),
            ),
        })
        .catch(() => undefined);
    });

    expect(router.state.location.pathname).toBe('/obras');
  });
});
