import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http } from '@/api/http';
import { renderApp } from '@/test/utils';

describe('AppLayout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockSaludSinBackend() {
    vi.spyOn(http, 'request').mockRejectedValue(new Error('Network Error'));
  }

  it('renderiza la marca y las secciones del menú (incluida Administración para admin)', () => {
    mockSaludSinBackend();
    renderApp('/');

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(screen.getByText('NÓMADE')).toBeInTheDocument();
    for (const seccion of [
      'Inicio',
      'Obras',
      'Ingresos',
      'Compras y gastos',
      'Finanzas',
      'Reportes',
      'Herramientas',
      'Administración',
    ]) {
      expect(within(nav).getByRole('list', { name: seccion })).toBeInTheDocument();
    }
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('navega a una ruta del menú, resalta el ítem y actualiza los breadcrumbs', async () => {
    mockSaludSinBackend();
    const user = userEvent.setup();
    const { router } = renderApp('/');

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    await user.click(within(nav).getByRole('link', { name: 'Facturas' }));

    expect(router.state.location.pathname).toBe('/facturas');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Facturas y documentos de egreso' }),
    ).toBeInTheDocument();
    expect(screen.getByText('En construcción')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Facturas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
    );
    const migas = screen.getByRole('navigation', { name: 'Ubicación' });
    expect(within(migas).getByText('Espacio de trabajo')).toBeInTheDocument();
    expect(within(migas).getByText('Facturas')).toBeInTheDocument();
  });

  it('muestra la página 404 en español para rutas desconocidas', () => {
    renderApp('/no-existe');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });
});
