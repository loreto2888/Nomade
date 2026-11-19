import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { simularApi } from '@/test/api';
import { sesionAdmin } from '@/test/fixtures';
import { renderApp } from '@/test/utils';

const barra = () => screen.getByRole('banner', { name: 'Barra superior' });

describe('SelectorTema (D-12)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('alterna entre claro y oscuro, aplica el tema y recuerda la preferencia en el navegador', async () => {
    simularApi({
      'PATCH /api/auth/tema': () => ({
        ...sesionAdmin,
        usuario: { ...sesionAdmin.usuario, tema: 'oscuro' },
      }),
    });
    const user = userEvent.setup();
    renderApp('/', { modo: 'claro' });
    const fondoClaro = getComputedStyle(document.body).backgroundColor;

    const alternar = within(barra()).getByRole('button', { name: 'Cambiar a tema oscuro' });
    expect(alternar).toHaveAttribute('aria-pressed', 'false');
    await user.click(alternar);

    const alternarDeNuevo = within(barra()).getByRole('button', { name: 'Cambiar a tema claro' });
    expect(alternarDeNuevo).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('nomade.tema')).toBe('oscuro');
    await waitFor(() =>
      expect(getComputedStyle(document.body).backgroundColor).not.toBe(fondoClaro),
    );

    await user.click(alternarDeNuevo);
    expect(window.localStorage.getItem('nomade.tema')).toBe('claro');
    expect(
      within(barra()).getByRole('button', { name: 'Cambiar a tema oscuro' }),
    ).toBeInTheDocument();
  });

  it('guarda la preferencia en la cuenta del usuario', async () => {
    const api = simularApi({
      'PATCH /api/auth/tema': () => ({
        ...sesionAdmin,
        usuario: { ...sesionAdmin.usuario, tema: 'oscuro' },
      }),
    });
    const user = userEvent.setup();
    renderApp('/', { modo: 'claro' });

    await user.click(within(barra()).getByRole('button', { name: 'Cambiar a tema oscuro' }));
    await waitFor(() => expect(api.cuerpo('PATCH /api/auth/tema')).toEqual({ tema: 'oscuro' }));
  });

  it('al iniciar aplica el tema guardado en la cuenta', async () => {
    simularApi({});
    renderApp('/', {
      sesion: { ...sesionAdmin, usuario: { ...sesionAdmin.usuario, tema: 'oscuro' } },
      modo: 'claro',
    });
    expect(
      await within(barra()).findByRole('button', { name: 'Cambiar a tema claro' }),
    ).toBeInTheDocument();
  });

  it('en el login (sin sesión) también hay selector y se recuerda en el navegador', async () => {
    const user = userEvent.setup();
    renderApp('/ingresar', { sesion: null, modo: 'claro' });
    await user.click(await screen.findByRole('button', { name: 'Cambiar a tema oscuro' }));
    expect(window.localStorage.getItem('nomade.tema')).toBe('oscuro');
  });

  it('usa la preferencia guardada en el navegador al arrancar', () => {
    window.localStorage.setItem('nomade.tema', 'oscuro');
    simularApi({});
    renderApp('/', {
      sesion: { ...sesionAdmin, usuario: { ...sesionAdmin.usuario, tema: 'oscuro' } },
    });
    expect(
      within(barra()).getByRole('button', { name: 'Cambiar a tema claro' }),
    ).toBeInTheDocument();
  });
});
