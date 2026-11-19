import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { ESTADOS_OBRA, obraEjemplo, sesionUsuario } from '@/test/fixtures';
import { renderApp } from '@/test/utils';

const obras = [
  obraEjemplo(),
  obraEjemplo({
    id: 2,
    codigoCentroCosto: 'CC-002',
    nombre: 'Oficinas Nueva Vista',
    cliente: { id: 6, rut: '11111111-1', razonSocial: 'Inmobiliaria Central' },
    estado: { id: 1, codigo: 'en_preparacion', nombre: 'En preparación' },
    monedaContrato: 'UF',
    montoContrato: 4710.5,
    montoContratoClp: 185_051_386,
  }),
  obraEjemplo({
    id: 3,
    codigoCentroCosto: 'CC-003',
    nombre: 'Tienda Los Robles',
    estado: { id: 5, codigo: 'cerrada', nombre: 'Cerrada' },
  }),
];
const pagina = { items: obras, total: 3, pagina: 1, tamanio: 25 };

const base = {
  'GET /api/obras': () => pagina,
  'GET /api/catalogos/estado_obra': () => ESTADOS_OBRA,
};

describe('ObrasPage (P03)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista las obras con centro de costo, cliente, estado y contrato en su moneda', async () => {
    simularApi(base);
    renderApp('/obras', { sesion: sesionUsuario });

    const tabla = await screen.findByRole('grid');
    expect(await within(tabla).findByRole('link', { name: 'Local Parque Norte' })).toHaveAttribute(
      'href',
      '/obras/1',
    );
    expect(within(tabla).getByText('CC-001')).toBeInTheDocument();
    expect(within(tabla).getAllByText('Grupo Andino SpA').length).toBeGreaterThan(0);
    expect(within(tabla).getAllByText('$ 185.000.000')).toHaveLength(2);
    // Contrato en UF: monto UF y equivalente en pesos.
    expect(within(tabla).getByText('UF 4.710,50')).toBeInTheDocument();
    expect(within(tabla).getByText('≈ $ 185.051.386')).toBeInTheDocument();
    // Los estados usan StatusChip con la etiqueta del catálogo.
    expect(within(tabla).getAllByText('Activa').length).toBeGreaterThan(0);
    expect(within(tabla).getByText('Cerrada').closest('.MuiChip-root')).toHaveClass(
      'MuiChip-outlined',
    );
  });

  it('«Nueva obra» lleva al formulario de alta', async () => {
    simularApi(base);
    const user = userEvent.setup();
    const { router } = renderApp('/obras', { sesion: sesionUsuario });
    await user.click(await screen.findByRole('link', { name: 'Nueva obra' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/obras/nueva'));
  });

  it('filtra por estado y busca en el servidor', async () => {
    const api = simularApi(base);
    const user = userEvent.setup();
    renderApp('/obras', { sesion: sesionUsuario });
    await screen.findByRole('grid');

    await user.click(screen.getByLabelText('Estado'));
    await user.click(await screen.findByRole('option', { name: 'Suspendida' }));
    await waitFor(() =>
      expect(api.llamadas.some((l) => /estadoId=3/.test(l.config.url ?? ''))).toBe(true),
    );

    await user.type(screen.getByLabelText(/Buscar por obra/), 'robles');
    await waitFor(() =>
      expect(api.llamadas.some((l) => /q=robles/.test(l.config.url ?? ''))).toBe(true),
    );
  });

  it('ordena en el servidor al hacer clic en una columna', async () => {
    const api = simularApi(base);
    const user = userEvent.setup();
    renderApp('/obras', { sesion: sesionUsuario });
    await screen.findByRole('grid');

    await user.click(screen.getByRole('columnheader', { name: /Cliente/ }));
    await waitFor(() =>
      expect(
        api.llamadas.some(
          (l) =>
            /ordenarPor=cliente/.test(l.config.url ?? '') &&
            /direccion=asc/.test(l.config.url ?? ''),
        ),
      ).toBe(true),
    );
  });

  it('solo permite eliminar obras en preparación y editar las no cerradas', async () => {
    simularApi(base);
    const user = userEvent.setup();
    renderApp('/obras', { sesion: sesionUsuario });

    await user.click(await screen.findByRole('button', { name: 'Acciones de Local Parque Norte' }));
    let menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /Eliminar/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(menu).getByRole('menuitem', { name: 'Editar' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.keyboard('{Escape}');

    await user.click(await screen.findByRole('button', { name: 'Acciones de Tienda Los Robles' }));
    menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Editar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('elimina una obra en preparación tras confirmar', async () => {
    const api = simularApi({ ...base, 'POST /api/obras/2/eliminar': () => undefined });
    const user = userEvent.setup();
    renderApp('/obras', { sesion: sesionUsuario });

    await user.click(
      await screen.findByRole('button', { name: 'Acciones de Oficinas Nueva Vista' }),
    );
    await user.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', { name: /Eliminar/ }),
    );
    const dialogo = await screen.findByRole('dialog', { name: 'Eliminar obra' });
    await user.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(api.veces('POST /api/obras/2/eliminar')).toBe(1));
    expect(api.cuerpo('POST /api/obras/2/eliminar')).toMatchObject({ version: 3 });
  });

  it('muestra el error del listado con opción de reintentar', async () => {
    simularApi({
      ...base,
      'GET /api/obras': () =>
        errorApi(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Intenta nuevamente.'),
    });
    renderApp('/obras', { sesion: sesionUsuario });
    expect(
      await screen.findByText('Ocurrió un error inesperado. Intenta nuevamente.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
