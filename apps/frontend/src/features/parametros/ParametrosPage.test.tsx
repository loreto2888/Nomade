import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { ESTADOS_OBRA, parametroEjemplo, sesionAdmin, sesionUsuario } from '@/test/fixtures';
import { renderApp } from '@/test/utils';

const iva = parametroEjemplo();
const plazo = parametroEjemplo({
  id: 2,
  codigo: 'plazo_pago_proveedores_dias',
  nombre: 'Plazo de pago a proveedores',
  descripcion: 'Días corridos hasta el vencimiento.',
  categoria: 'Compras',
  tipoValor: 'entero',
  unidad: 'días',
  valorVigente: {
    id: 2,
    valor: '30',
    valorNumerico: 30,
    vigenteDesde: '2003-01-01',
    vigenteHasta: null,
    motivo: null,
    creadoEn: '2026-11-01T12:00:00.000Z',
    creadoPor: null,
  },
  proximoValor: {
    id: 9,
    valor: '45',
    valorNumerico: 45,
    vigenteDesde: '2027-01-01',
    vigenteHasta: null,
    motivo: null,
    creadoEn: '2026-11-10T12:00:00.000Z',
    creadoPor: 1,
  },
});

const base = { 'GET /api/parametros': () => [iva, plazo] };

describe('ParametrosPage (P27)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('el administrador accede y el menú ya no la marca como pendiente', async () => {
    simularApi(base);
    renderApp('/admin/parametros', { sesion: sesionAdmin });
    expect(
      await screen.findByRole('heading', { name: 'Parámetros financieros' }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(within(nav).getByRole('link', { name: 'Parámetros' })).not.toHaveTextContent(
      'Pendiente',
    );
  });

  it('el rol usuario no puede abrirla: vuelve al inicio sin consultar parámetros', async () => {
    const api = simularApi({});
    const { router } = renderApp('/admin/parametros', { sesion: sesionUsuario });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(api.llamadas.some((l) => l.clave === 'GET /api/parametros')).toBe(false);
  });

  it('lista los parámetros con su valor vigente (incluido el IVA) y el próximo valor', async () => {
    simularApi(base);
    renderApp('/admin/parametros', { sesion: sesionAdmin });

    const tabla = await screen.findByRole('table', { name: 'Parámetros del sistema' });
    const filaIva = within(tabla).getByRole('row', { name: /IVA/ });
    expect(within(filaIva).getByText('19 %')).toBeInTheDocument();
    const filaPlazo = within(tabla).getByRole('row', { name: /Plazo de pago/ });
    expect(within(filaPlazo).getByText('30 días')).toBeInTheDocument();
    expect(within(filaPlazo).getByText('45 días')).toBeInTheDocument();
  });

  it('agrega una nueva versión del valor con vigencia, versión y motivo', async () => {
    const api = simularApi({
      ...base,
      'GET /api/parametros/1/valores': () => iva.valorVigente && [iva.valorVigente],
      'POST /api/parametros/1/valores': () => ({
        ...iva,
        version: 2,
        proximoValor: {
          ...iva.valorVigente!,
          id: 4,
          valor: '20',
          valorNumerico: 20,
          vigenteDesde: '2026-12-01',
        },
      }),
    });
    const user = userEvent.setup();
    renderApp('/admin/parametros', { sesion: sesionAdmin });

    await user.click(await screen.findByRole('button', { name: 'Cambiar valor de IVA' }));
    const dialogo = await screen.findByRole('dialog', { name: /Cambiar valor · IVA/ });
    await user.type(within(dialogo).getByLabelText(/Nuevo valor/), '20');
    const fecha = within(dialogo).getByLabelText(/Vigente desde/);
    await user.clear(fecha);
    await user.type(fecha, '2026-12-01');
    await user.type(within(dialogo).getByLabelText(/Motivo/), 'Reforma tributaria');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar nuevo valor' }));

    await waitFor(() => expect(api.veces('POST /api/parametros/1/valores')).toBe(1));
    expect(api.cuerpo('POST /api/parametros/1/valores')).toEqual({
      version: 1,
      valor: '20',
      vigenteDesde: '2026-12-01',
      motivo: 'Reforma tributaria',
    });
    expect(
      await within(dialogo).findByText('Se agregó la nueva versión del valor.'),
    ).toBeInTheDocument();
  });

  it('muestra el historial y solo permite eliminar valores programados', async () => {
    const api = simularApi({
      ...base,
      'GET /api/parametros/2/valores': () => [plazo.proximoValor, plazo.valorVigente],
      'POST /api/parametros/2/valores/9/eliminar': () => ({
        ...plazo,
        proximoValor: null,
        version: 2,
      }),
    });
    const user = userEvent.setup();
    renderApp('/admin/parametros', { sesion: sesionAdmin });

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar valor de Plazo de pago a proveedores' }),
    );
    const dialogo = await screen.findByRole('dialog', { name: /Cambiar valor/ });
    const historial = await within(dialogo).findByRole('list', { name: 'Historial de valores' });
    expect(within(historial).getAllByRole('listitem')).toHaveLength(2);
    expect(within(historial).getByText(/programado/)).toBeInTheDocument();
    // Solo la versión programada ofrece «Eliminar».
    expect(
      within(historial).getAllByRole('button', { name: /Eliminar valor programado/ }),
    ).toHaveLength(1);

    await user.click(
      within(historial).getByRole('button', { name: 'Eliminar valor programado 45 días' }),
    );
    const confirmar = await screen.findByRole('dialog', { name: 'Eliminar valor programado' });
    await user.click(within(confirmar).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(api.veces('POST /api/parametros/2/valores/9/eliminar')).toBe(1));
    expect(api.cuerpo('POST /api/parametros/2/valores/9/eliminar')).toMatchObject({ version: 1 });
  });

  it('muestra el error de validación del servidor en el campo valor', async () => {
    simularApi({
      ...base,
      'GET /api/parametros/1/valores': () => [iva.valorVigente],
      'POST /api/parametros/1/valores': () =>
        errorApi(400, 'VALIDACION', 'Los datos enviados no son válidos.', [
          { campo: 'valor', errores: ['Un porcentaje debe estar entre 0 y 100.'] },
        ]),
    });
    const user = userEvent.setup();
    renderApp('/admin/parametros', { sesion: sesionAdmin });
    await user.click(await screen.findByRole('button', { name: 'Cambiar valor de IVA' }));
    const dialogo = await screen.findByRole('dialog', { name: /Cambiar valor/ });
    await user.type(within(dialogo).getByLabelText(/Nuevo valor/), '150');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar nuevo valor' }));
    expect(
      await within(dialogo).findByText('Un porcentaje debe estar entre 0 y 100.'),
    ).toBeInTheDocument();
  });

  it('avisa del conflicto de versión', async () => {
    simularApi({
      ...base,
      'GET /api/parametros/1/valores': () => [iva.valorVigente],
      'POST /api/parametros/1/valores': () =>
        errorApi(
          409,
          'CONFLICTO_VERSION',
          'El registro fue modificado por otra persona. Recarga y reintenta.',
          [{ versionActual: 2 }],
        ),
    });
    const user = userEvent.setup();
    renderApp('/admin/parametros', { sesion: sesionAdmin });
    await user.click(await screen.findByRole('button', { name: 'Cambiar valor de IVA' }));
    const dialogo = await screen.findByRole('dialog', { name: /Cambiar valor/ });
    await user.type(within(dialogo).getByLabelText(/Nuevo valor/), '20');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar nuevo valor' }));
    expect(
      await within(dialogo).findByText(/Otra persona modificó este parámetro/),
    ).toBeInTheDocument();
  });

  describe('valor de la UF', () => {
    it('lista los valores cargados y guarda el valor de un día', async () => {
      let valores = [{ fecha: '2026-11-18', valor: 39280 }];
      const api = simularApi({
        ...base,
        'GET /api/uf': () => ({ items: valores, total: valores.length, pagina: 1, tamanio: 10 }),
        'PUT /api/uf/2026-11-19': () => {
          valores = [{ fecha: '2026-11-19', valor: 39284.8712 }, ...valores];
          return valores[0];
        },
      });
      const user = userEvent.setup();
      renderApp('/admin/parametros', { sesion: sesionAdmin });
      await user.click(await screen.findByRole('tab', { name: 'Valor de la UF' }));

      const lista = await screen.findByRole('grid');
      expect(await within(lista).findByText('$ 39.280,00')).toBeInTheDocument();

      const fecha = screen.getByLabelText(/^Fecha/);
      await user.clear(fecha);
      await user.type(fecha, '2026-11-19');
      await user.type(screen.getByLabelText(/Valor de la UF/), '39284,8712');
      await user.click(screen.getByRole('button', { name: 'Guardar valor' }));

      await waitFor(() => expect(api.veces('PUT /api/uf/2026-11-19')).toBe(1));
      expect(api.cuerpo('PUT /api/uf/2026-11-19')).toEqual({ valor: 39284.8712 });
      expect(await screen.findByText(/Se guardó la UF del/)).toBeInTheDocument();
      expect(await within(lista).findByText('$ 39.284,8712')).toBeInTheDocument();
    });
  });

  describe('catálogos', () => {
    it('lista los ítems del catálogo, marca los protegidos y permite agregar uno', async () => {
      let items = ESTADOS_OBRA;
      const api = simularApi({
        ...base,
        'GET /api/catalogos/estado_obra': () => items,
        'POST /api/catalogos/estado_obra': () => {
          const nuevo = {
            ...ESTADOS_OBRA[2],
            id: 9,
            codigo: 'en_garantia',
            nombre: 'En garantía',
            protegido: false,
            orden: 60,
          };
          items = [...items, nuevo];
          return nuevo;
        },
      });
      const user = userEvent.setup();
      renderApp('/admin/parametros', { sesion: sesionAdmin });
      await user.click(await screen.findByRole('tab', { name: 'Catálogos' }));

      const tabla = await screen.findByRole('table', { name: 'Estados de obra' });
      expect(await within(tabla).findByText('En preparación')).toBeInTheDocument();
      expect(within(tabla).getAllByTitle('Ítem usado por la aplicación')).toHaveLength(3);
      expect(screen.getByText(/Catálogo base provisorio/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Agregar ítem' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Nuevo ítem' });
      await user.type(within(dialogo).getByLabelText(/Código/), 'en_garantia');
      await user.type(within(dialogo).getByLabelText(/Nombre/), 'En garantía');
      await user.type(within(dialogo).getByLabelText(/Orden/), '60');
      await user.click(within(dialogo).getByRole('button', { name: 'Agregar ítem' }));

      await waitFor(() => expect(api.veces('POST /api/catalogos/estado_obra')).toBe(1));
      expect(api.cuerpo('POST /api/catalogos/estado_obra')).toEqual({
        codigo: 'en_garantia',
        nombre: 'En garantía',
        descripcion: null,
        orden: 60,
      });
      expect(await within(tabla).findByText('En garantía')).toBeInTheDocument();
    });

    it('edita un ítem: el código no se puede cambiar y los protegidos no se desactivan', async () => {
      const api = simularApi({
        ...base,
        'GET /api/catalogos/estado_obra': () => ESTADOS_OBRA,
        'PATCH /api/catalogos/estado_obra/1': () => ({
          ...ESTADOS_OBRA[0],
          nombre: 'Preparación',
          version: 2,
        }),
      });
      const user = userEvent.setup();
      renderApp('/admin/parametros', { sesion: sesionAdmin });
      await user.click(await screen.findByRole('tab', { name: 'Catálogos' }));

      await user.click(await screen.findByRole('button', { name: 'Editar En preparación' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Editar ítem' });
      expect(within(dialogo).getByLabelText(/Código/)).toBeDisabled();
      expect(within(dialogo).getByRole('switch', { name: /Activo/ })).toBeDisabled();

      const nombre = within(dialogo).getByLabelText(/Nombre/);
      await user.clear(nombre);
      await user.type(nombre, 'Preparación');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(api.veces('PATCH /api/catalogos/estado_obra/1')).toBe(1));
      expect(api.cuerpo('PATCH /api/catalogos/estado_obra/1')).toMatchObject({
        version: 1,
        nombre: 'Preparación',
        activo: true,
      });
    });

    it('cambia de catálogo con el selector', async () => {
      const api = simularApi({
        ...base,
        'GET /api/catalogos/estado_obra': () => ESTADOS_OBRA,
        'GET /api/catalogos/categoria_gasto': () => [
          {
            ...ESTADOS_OBRA[0],
            id: 20,
            tipo: 'categoria_gasto',
            codigo: 'materiales',
            nombre: 'Materiales',
            protegido: false,
          },
        ],
      });
      const user = userEvent.setup();
      renderApp('/admin/parametros', { sesion: sesionAdmin });
      await user.click(await screen.findByRole('tab', { name: 'Catálogos' }));
      await screen.findByRole('table', { name: 'Estados de obra' });

      await user.click(screen.getByLabelText('Catálogo'));
      await user.click(await screen.findByRole('option', { name: 'Categorías de gasto' }));
      const tabla = await screen.findByRole('table', { name: 'Categorías de gasto' });
      expect(await within(tabla).findByText('Materiales')).toBeInTheDocument();
      expect(api.veces('GET /api/catalogos/categoria_gasto')).toBe(1);
    });
  });
});
