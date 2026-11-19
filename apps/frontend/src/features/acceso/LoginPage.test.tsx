import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { sesionAdmin, sesionClaveTemporal } from '@/test/fixtures';
import { renderApp } from '@/test/utils';

describe('LoginPage (P01)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('una ruta protegida sin sesión redirige al login por correo (sin selector de tipo de acceso)', async () => {
    renderApp('/obras', { sesion: null });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bienvenido de nuevo' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.queryByText(/tipo de acceso/i)).not.toBeInTheDocument();
  });

  it('valida el formulario antes de llamar a la API', async () => {
    const api = simularApi({});
    const user = userEvent.setup();
    renderApp('/ingresar', { sesion: null });

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Ingresa tu correo.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Correo'), 'no-es-correo');
    await user.type(screen.getByLabelText('Contraseña'), 'x');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Ingresa un correo válido.')).toBeInTheDocument();
    expect(api.veces('POST /api/auth/login')).toBe(0);
  });

  it('inicia sesión y vuelve a la ruta que se intentaba abrir', async () => {
    const api = simularApi({ 'POST /api/auth/login': () => sesionAdmin });
    const user = userEvent.setup();
    const { router } = renderApp('/obras', { sesion: null });

    await user.type(await screen.findByLabelText('Correo'), ' Admin@Nomade.cl ');
    await user.type(screen.getByLabelText('Contraseña'), 'clave-correcta-123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/obras'));
    expect(api.cuerpo('POST /api/auth/login')).toEqual({
      correo: 'admin@nomade.cl',
      clave: 'clave-correcta-123',
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Obras y centros de costo' }),
    ).toBeInTheDocument();
  });

  it('con contraseña temporal lleva al cambio obligatorio', async () => {
    simularApi({ 'POST /api/auth/login': () => sesionClaveTemporal });
    const user = userEvent.setup();
    const { router } = renderApp('/ingresar', { sesion: null });

    await user.type(await screen.findByLabelText('Correo'), 'camila@nomade.cl');
    await user.type(screen.getByLabelText('Contraseña'), 'temporal-1234567');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/cambiar-clave'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cambia tu contraseña' }),
    ).toBeInTheDocument();
  });

  it.each([
    [401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.'],
    [
      423,
      'CUENTA_BLOQUEADA',
      'La cuenta está bloqueada temporalmente por intentos fallidos. Intenta nuevamente en 15 minutos.',
    ],
    [403, 'CUENTA_DESACTIVADA', 'La cuenta está desactivada. Contacta al administrador.'],
    [429, 'DEMASIADAS_SOLICITUDES', 'Demasiadas solicitudes. Intenta nuevamente en unos momentos.'],
  ])('muestra el mensaje del servidor ante un %i', async (estado, codigo, mensaje) => {
    simularApi({ 'POST /api/auth/login': () => errorApi(estado, codigo, mensaje) });
    const user = userEvent.setup();
    renderApp('/ingresar', { sesion: null });

    await user.type(await screen.findByLabelText('Correo'), 'a@nomade.cl');
    await user.type(screen.getByLabelText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);
  });

  it('muestra un aviso si no hay conexión con el servidor', async () => {
    simularApi({});
    const user = userEvent.setup();
    renderApp('/ingresar', { sesion: null });

    await user.type(await screen.findByLabelText('Correo'), 'a@nomade.cl');
    await user.type(screen.getByLabelText('Contraseña'), 'x');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    );
  });

  it('con sesión activa, /ingresar redirige al inicio', async () => {
    const { router } = renderApp('/ingresar');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
