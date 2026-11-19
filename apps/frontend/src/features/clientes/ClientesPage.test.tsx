import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { clienteEjemplo, sesionUsuario } from '@/test/fixtures';
import { renderApp } from '@/test/utils';

const pagina = {
  items: [
    clienteEjemplo(),
    clienteEjemplo({ id: 6, rut: '11111111-1', razonSocial: 'Inmobiliaria Central' }),
  ],
  total: 2,
  pagina: 1,
  tamanio: 25,
};

describe('ClientesPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista clientes y aparece en el menú Obras', async () => {
    simularApi({ 'GET /api/clientes': () => pagina });
    renderApp('/clientes', { sesion: sesionUsuario });

    const tabla = await screen.findByRole('grid');
    expect(await within(tabla).findByText('Grupo Andino SpA')).toBeInTheDocument();
    expect(within(tabla).getByText('76.086.428-5')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(within(nav).getByRole('link', { name: 'Clientes' })).toBeInTheDocument();
  });

  it('busca en el servidor con el texto escrito', async () => {
    const api = simularApi({ 'GET /api/clientes': () => pagina });
    const user = userEvent.setup();
    renderApp('/clientes', { sesion: sesionUsuario });
    await screen.findByRole('grid');

    await user.type(screen.getByLabelText('Buscar por razón social o RUT'), 'central');
    await waitFor(() =>
      expect(api.llamadas.some((l) => /q=central/.test(l.config.url ?? ''))).toBe(true),
    );
  });

  it('no deja eliminar un cliente con obras y muestra el motivo', async () => {
    simularApi({
      'GET /api/clientes': () => pagina,
      'POST /api/clientes/5/eliminar': () =>
        errorApi(
          422,
          'CLIENTE_CON_OBRAS',
          'No se puede eliminar el cliente: tiene 2 obras vigentes.',
        ),
    });
    const user = userEvent.setup();
    renderApp('/clientes', { sesion: sesionUsuario });

    await user.click(await screen.findByRole('button', { name: 'Acciones de Grupo Andino SpA' }));
    await user.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Eliminar' }),
    );
    const dialogo = await screen.findByRole('dialog', { name: 'Eliminar cliente' });
    await user.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

    expect(
      await within(dialogo).findByText('No se puede eliminar el cliente: tiene 2 obras vigentes.'),
    ).toBeInTheDocument();
  });

  it('crea un cliente desde «Nuevo cliente»', async () => {
    const api = simularApi({
      'GET /api/clientes': () => pagina,
      'POST /api/clientes': () => clienteEjemplo({ id: 7, razonSocial: 'Comercial Austral' }),
    });
    const user = userEvent.setup();
    renderApp('/clientes', { sesion: sesionUsuario });
    await screen.findByRole('grid');

    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo cliente' });
    await user.type(within(dialogo).getByLabelText(/RUT/), '100000 13K');
    await user.type(within(dialogo).getByLabelText(/Razón social/), 'Comercial Austral');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear cliente' }));

    await waitFor(() => expect(api.veces('POST /api/clientes')).toBe(1));
    expect(api.cuerpo('POST /api/clientes')).toMatchObject({
      rut: '10000013-K',
      razonSocial: 'Comercial Austral',
    });
    expect(await screen.findByText('Se creó el cliente Comercial Austral.')).toBeInTheDocument();
  });
});
