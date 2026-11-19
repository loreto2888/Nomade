import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { sesionClaveTemporal, sesionUsuario } from '@/test/fixtures';
import { renderApp } from '@/test/utils';

async function completar(
  user: ReturnType<typeof userEvent.setup>,
  valores: [string, string, string],
) {
  await user.type(screen.getByLabelText('Contraseña actual'), valores[0]);
  await user.type(screen.getByLabelText('Nueva contraseña'), valores[1]);
  await user.type(screen.getByLabelText('Repite la nueva contraseña'), valores[2]);
  await user.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));
}

describe('CambiarClavePage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('con contraseña temporal bloquea el resto: cualquier ruta redirige al cambio', async () => {
    const { router } = renderApp('/obras', { sesion: sesionClaveTemporal });

    await waitFor(() => expect(router.state.location.pathname).toBe('/cambiar-clave'));
    expect(
      screen.getByText(/reemplaza la contraseña temporal entregada por tu administrador/i),
    ).toBeInTheDocument();
    // Sin menú ni barra: no hay forma de navegar a otra pantalla.
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('exige al menos 12 caracteres y que ambas contraseñas coincidan', async () => {
    const api = simularApi({});
    const user = userEvent.setup();
    renderApp('/cambiar-clave', { sesion: sesionClaveTemporal });

    await completar(user, ['temporal-123456', 'corta', 'otra']);
    expect(
      await screen.findByText('La contraseña debe tener al menos 12 caracteres.'),
    ).toBeInTheDocument();
    expect(api.veces('POST /api/auth/cambiar-clave')).toBe(0);
  });

  it('detecta contraseñas que no coinciden o iguales a la actual', async () => {
    const api = simularApi({});
    const user = userEvent.setup();
    renderApp('/cambiar-clave', { sesion: sesionClaveTemporal });

    await completar(user, ['temporal-123456', 'nueva-clave-segura-1', 'nueva-clave-segura-2']);
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Nueva contraseña'));
    await user.clear(screen.getByLabelText('Repite la nueva contraseña'));
    await user.type(screen.getByLabelText('Nueva contraseña'), 'temporal-123456');
    await user.type(screen.getByLabelText('Repite la nueva contraseña'), 'temporal-123456');
    await user.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));
    expect(
      await screen.findByText('La nueva contraseña debe ser distinta de la actual.'),
    ).toBeInTheDocument();
    expect(api.veces('POST /api/auth/cambiar-clave')).toBe(0);
  });

  it('cambia la contraseña y desbloquea la aplicación', async () => {
    const api = simularApi({
      'POST /api/auth/cambiar-clave': () => sesionUsuario,
    });
    const user = userEvent.setup();
    const { router } = renderApp('/cambiar-clave', { sesion: sesionClaveTemporal });

    await completar(user, ['temporal-123456', 'nueva-clave-segura-1', 'nueva-clave-segura-1']);

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(api.cuerpo('POST /api/auth/cambiar-clave')).toEqual({
      claveActual: 'temporal-123456',
      claveNueva: 'nueva-clave-segura-1',
    });
    expect(
      await screen.findByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument();
  });

  it('muestra el error del servidor si la contraseña actual es incorrecta', async () => {
    simularApi({
      'POST /api/auth/cambiar-clave': () =>
        errorApi(400, 'CLAVE_ACTUAL_INCORRECTA', 'La contraseña actual no es correcta.'),
    });
    const user = userEvent.setup();
    renderApp('/cambiar-clave', { sesion: sesionClaveTemporal });

    await completar(user, ['equivocada-123456', 'nueva-clave-segura-1', 'nueva-clave-segura-1']);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña actual no es correcta.',
    );
  });

  it('el cambio voluntario permite volver y se llega desde la barra («Clave»)', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/', { sesion: sesionUsuario });

    const barra = screen.getByRole('banner', { name: 'Barra superior' });
    await user.click(within(barra).getByRole('link', { name: 'Cambiar contraseña' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/cambiar-clave'));
    expect(
      screen.getByText('Ingresa tu contraseña actual y una nueva contraseña.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Volver' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('cerrar sesión desde el cambio obligatorio lleva al login', async () => {
    const api = simularApi({ 'POST /api/auth/logout': () => undefined });
    const user = userEvent.setup();
    const { router } = renderApp('/cambiar-clave', { sesion: sesionClaveTemporal });

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/ingresar'));
    expect(api.veces('POST /api/auth/logout')).toBe(1);
  });
});
