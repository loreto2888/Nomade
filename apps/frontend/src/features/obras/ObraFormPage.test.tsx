import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import {
  ESTADOS_OBRA,
  clienteEjemplo,
  obraEjemplo,
  resumenEjemplo,
  sesionUsuario,
} from '@/test/fixtures';
import { renderApp } from '@/test/utils';

const base = {
  'GET /api/catalogos/estado_obra': () => ESTADOS_OBRA,
  'GET /api/clientes': () => ({ items: [clienteEjemplo()], total: 1, pagina: 1, tamanio: 20 }),
  'GET /api/uf/valor': () => ({ fecha: '2026-11-19', valor: 39284.8712 }),
};

describe('ObraFormPage (P04)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('/obras/nueva muestra el formulario de alta', async () => {
    simularApi(base);
    renderApp('/obras/nueva', { sesion: sesionUsuario });
    expect(await screen.findByRole('heading', { name: 'Nueva obra' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Nueva obra' })).toBeInTheDocument();
    const migas = screen.getByRole('navigation', { name: 'Ubicación' });
    expect(within(migas).getByText('Nueva obra')).toBeInTheDocument();
  });

  it('al guardar una obra nueva abre su ficha', async () => {
    simularApi({
      ...base,
      'POST /api/obras': () => obraEjemplo({ id: 8 }),
      'GET /api/obras/8/resumen': () =>
        resumenEjemplo({ obra: obraEjemplo({ id: 8, nombre: 'Obra recién creada' }) }),
      'GET /api/adjuntos': () => [],
    });
    const user = userEvent.setup();
    const { router } = renderApp('/obras/nueva', { sesion: sesionUsuario });

    await user.type(await screen.findByLabelText(/Centro de costo/), 'CC-008');
    await user.type(screen.getByLabelText(/Nombre de la obra/), 'Obra recién creada');
    await user.click(screen.getByLabelText(/^Cliente/));
    await user.click(await screen.findByRole('option', { name: 'Grupo Andino SpA' }));
    await user.click(screen.getByRole('button', { name: 'Guardar obra' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/obras/8'));
    expect(await screen.findByRole('heading', { name: 'Obra recién creada' })).toBeInTheDocument();
  });

  it('/obras/:id/editar carga la obra y precarga el formulario', async () => {
    simularApi({ ...base, 'GET /api/obras/1': () => obraEjemplo() });
    renderApp('/obras/1/editar', { sesion: sesionUsuario });
    expect(await screen.findByRole('heading', { name: 'Editar obra' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText(/Nombre de la obra/)).toHaveValue('Local Parque Norte'),
    );
  });

  it('«Cancelar» vuelve a la ficha en edición y al listado en alta', async () => {
    simularApi({
      ...base,
      'GET /api/obras/1': () => obraEjemplo(),
      'GET /api/obras': () => ({ items: [], total: 0, pagina: 1, tamanio: 25 }),
    });
    const user = userEvent.setup();
    const { router } = renderApp('/obras/nueva', { sesion: sesionUsuario });
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/obras'));
  });

  it('si la obra a editar no existe, lo informa', async () => {
    simularApi({
      ...base,
      'GET /api/obras/1': () => errorApi(404, 'OBRA_NO_ENCONTRADA', 'La obra no existe.'),
    });
    renderApp('/obras/1/editar', { sesion: sesionUsuario });
    expect(await screen.findByText('La obra no existe o fue eliminada.')).toBeInTheDocument();
  });
});
