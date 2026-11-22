import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import {
  cotizacionEjemplo,
  obraEjemplo,
  ordenCompraEjemplo,
  ordenTrabajoEjemplo,
  pagina,
  resumenEjemplo,
  sesionAdmin,
  sesionUsuario,
} from '@/test/fixtures';
import { renderApp } from '@/test/utils';

const camila = { id: 2, nombre: 'Camila Rojas' };
const tomas = { id: 3, nombre: 'Tomás Silva' };

const enRevision = ordenCompraEjemplo({
  estado: 'en_revision',
  enviadoEn: '2026-11-19T13:00:00.000Z',
  enviadoPor: camila,
  version: 2,
});

const comunes = {
  'GET /api/adjuntos': () => [],
  'GET /api/catalogos/categoria_gasto': () => [],
};

describe('Compras (fase 4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ficha de la orden de compra (P10)', () => {
    it('muestra montos con IVA, líneas y trazabilidad', async () => {
      simularApi({
        ...comunes,
        'GET /api/ordenes-compra/12': () => ({ ordenCompra: enRevision, movimientos: [] }),
      });
      renderApp('/ordenes-compra/12', { sesion: sesionUsuario });

      expect(
        await screen.findByRole('heading', { name: 'Orden de compra OC-000012' }),
      ).toBeInTheDocument();
      const montos = screen.getByRole('group', { name: 'Montos de la OC' });
      expect(within(montos).getByText('$ 874.455')).toBeInTheDocument();
      expect(within(montos).getByText('IVA (19 %)')).toBeInTheDocument();
      expect(within(montos).getByText('$ 1.040.601')).toBeInTheDocument();
      const lineas = screen.getByRole('table', { name: 'Líneas de la OC' });
      expect(within(lineas).getByText('Cemento')).toBeInTheDocument();
      expect(within(lineas).getByText('10,5')).toBeInTheDocument();
      expect(within(lineas).getByText('$ 780.060')).toBeInTheDocument();
      const traza = screen.getByRole('region', { name: 'Trazabilidad' });
      expect(within(traza).getAllByText('Camila Rojas')).toHaveLength(2);
      expect(screen.getByText(/el compromiso se registra al aprobar/)).toBeInTheDocument();
    });

    it('D-10: quien la creó no puede aprobarla (solo rechazar)', async () => {
      simularApi({
        ...comunes,
        'GET /api/ordenes-compra/12': () => ({ ordenCompra: enRevision, movimientos: [] }),
      });
      renderApp('/ordenes-compra/12', { sesion: sesionUsuario });
      await screen.findByRole('heading', { name: 'Orden de compra OC-000012' });
      expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
      expect(screen.getByText(/debe aprobarla otra persona/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    });

    it('otra persona la aprueba: confirma el compromiso y envía la versión cargada', async () => {
      const api = simularApi({
        ...comunes,
        'GET /api/ordenes-compra/12': () => ({ ordenCompra: enRevision, movimientos: [] }),
        'POST /api/ordenes-compra/12/aprobar': () => ({
          ordenCompra: { ...enRevision, estado: 'aprobada', version: 3 },
          movimientos: [],
        }),
      });
      const user = userEvent.setup();
      renderApp('/ordenes-compra/12', { sesion: sesionAdmin });
      await user.click(await screen.findByRole('button', { name: 'Aprobar' }));
      const dialogo = screen.getByRole('dialog', { name: 'Aprobar OC-000012' });
      expect(within(dialogo).getByText(/compromiso de \$ 874\.455/)).toBeInTheDocument();
      await user.type(within(dialogo).getByLabelText('Motivo (opcional)'), 'Conforme');
      await user.click(within(dialogo).getByRole('button', { name: 'Aprobar' }));
      await waitFor(() =>
        expect(api.cuerpo('POST /api/ordenes-compra/12/aprobar')).toEqual({
          version: 2,
          motivo: 'Conforme',
        }),
      );
      expect(
        await screen.findByText('La orden de compra OC-000012 quedó aprobada.'),
      ).toBeInTheDocument();
    });

    it('aprobada: muestra el compromiso del libro y permite anular con motivo obligatorio', async () => {
      const aprobada = {
        ...enRevision,
        estado: 'aprobada' as const,
        resueltoPor: tomas,
        resueltoEn: '2026-11-19T15:00:00.000Z',
        version: 3,
      };
      const api = simularApi({
        ...comunes,
        'GET /api/ordenes-compra/12': () => ({
          ordenCompra: aprobada,
          movimientos: [
            {
              id: 1,
              fecha: '2026-11-19',
              tipo: 'compromiso',
              origenTipo: 'orden_compra',
              origenId: 12,
              montoClp: 874_455,
              reversaDeId: null,
              descripcion: 'Compromiso OC-000012',
              creadoEn: '2026-11-19T15:00:00.000Z',
            },
          ],
        }),
        'POST /api/ordenes-compra/12/anular': () =>
          errorApi(422, 'TRANSICION_NO_VALIDA', 'La OC está recibida: no puede quedar anulada.'),
      });
      const user = userEvent.setup();
      renderApp('/ordenes-compra/12', { sesion: sesionUsuario });
      const libro = await screen.findByRole('table', { name: 'Movimientos de la OC' });
      expect(within(libro).getByText('Compromiso OC-000012')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Registrar recepción' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Anular' }));
      const dialogo = screen.getByRole('dialog', { name: 'Anular OC-000012' });
      const confirmar = within(dialogo).getByRole('button', { name: 'Anular' });
      expect(confirmar).toBeDisabled();
      await user.type(within(dialogo).getByLabelText('Motivo'), 'Hito equivocado');
      await user.click(confirmar);
      expect(
        await within(dialogo).findByText('La OC está recibida: no puede quedar anulada.'),
      ).toBeInTheDocument();
      expect(api.cuerpo('POST /api/ordenes-compra/12/anular')).toEqual({
        version: 3,
        motivo: 'Hito equivocado',
      });
    });
  });

  describe('ficha de la orden de trabajo (P11)', () => {
    it('muestra los hitos con lo ordenado y crea una OC parcial con tope en el disponible del hito', async () => {
      const ot = ordenTrabajoEjemplo({
        estado: 'aprobada',
        resueltoPor: tomas,
        resueltoEn: '2026-11-19T15:00:00.000Z',
      });
      const api = simularApi({
        ...comunes,
        'GET /api/ordenes-trabajo/4': () => ot,
        'GET /api/ordenes-trabajo': () => pagina([ot]),
        'GET /api/ordenes-compra': () => pagina([]),
        'POST /api/ordenes-compra': () => ({
          ordenCompra: ordenCompraEjemplo({ id: 13, folio: 'OC-000013', tipo: 'parcial_ot' }),
          movimientos: [],
        }),
        'GET /api/ordenes-compra/13': () => ({
          ordenCompra: ordenCompraEjemplo({
            id: 13,
            folio: 'OC-000013',
            tipo: 'parcial_ot',
            lineas: [],
          }),
          movimientos: [],
        }),
      });
      const user = userEvent.setup();
      const { router } = renderApp('/ordenes-trabajo/4', { sesion: sesionUsuario });

      const hitos = await screen.findByRole('table', { name: 'Hitos de la OT' });
      expect(within(hitos).getByText('1. Anticipo')).toBeInTheDocument();
      expect(within(hitos).getByText('10 %')).toBeInTheDocument();
      expect(screen.getByText('$ 8.000.000')).toBeInTheDocument(); // saldo

      await user.click(within(hitos).getAllByRole('button', { name: 'Ordenar' })[0]);
      const dialogo = await screen.findByRole('dialog', { name: 'Nueva orden de compra' });
      const porcentaje = within(dialogo).getByLabelText(/Porcentaje de la OT/);
      await waitFor(() => expect(porcentaje).toHaveValue('10'));
      await user.clear(porcentaje);
      await user.type(porcentaje, '15');
      await user.click(within(dialogo).getByRole('button', { name: 'Crear OC' }));
      expect(within(dialogo).getByText('El hito tiene disponible 10 %.')).toBeInTheDocument();
      expect(api.veces('POST /api/ordenes-compra')).toBe(0);

      await user.clear(porcentaje);
      await user.type(porcentaje, '7,5');
      expect(within(dialogo).getByText('$ 750.000')).toBeInTheDocument();
      await user.click(within(dialogo).getByRole('button', { name: 'Crear OC' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/ordenes-compra/13'));
      expect(api.cuerpo('POST /api/ordenes-compra')).toMatchObject({
        tipo: 'parcial_ot',
        ordenTrabajoId: 4,
        hitoId: 50,
        porcentaje: 7.5,
        afectaIva: true,
      });
    });

    it('nueva OT desde una cotización aprobada: los hitos deben no superar 100 %', async () => {
      const aprobada = cotizacionEjemplo({ estado: 'aprobada' });
      const api = simularApi({
        ...comunes,
        'GET /api/ordenes-trabajo': () => pagina([]),
        'GET /api/cotizaciones': () => pagina([aprobada]),
        'POST /api/ordenes-trabajo': () => ordenTrabajoEjemplo({ id: 9 }),
        'GET /api/ordenes-trabajo/9': () => ordenTrabajoEjemplo({ id: 9 }),
        'GET /api/ordenes-compra': () => pagina([]),
      });
      const user = userEvent.setup();
      const { router } = renderApp('/ordenes-trabajo', { sesion: sesionUsuario });
      await user.click(await screen.findByRole('button', { name: 'Nueva orden de trabajo' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Nueva orden de trabajo' });
      await user.click(within(dialogo).getByRole('combobox', { name: /Cotización aprobada/ }));
      await user.click(await screen.findByRole('option', { name: /COT-000008/ }));
      expect(within(dialogo).getByLabelText(/Alcance del trabajo/)).toHaveValue(
        'Instalación eléctrica del local',
      );

      const grupo = within(dialogo).getByRole('group', { name: 'Hitos de pago' });
      await user.type(within(grupo).getByLabelText('Hito 1'), 'Anticipo');
      const pct1 = within(grupo).getByLabelText('Porcentaje del hito 1');
      await user.clear(pct1);
      await user.type(pct1, '60');
      expect(within(grupo).getByText(/Suman 60 %/)).toBeInTheDocument();
      await user.click(within(grupo).getByRole('button', { name: 'Agregar hito' }));
      expect(within(grupo).getByLabelText('Porcentaje del hito 2')).toHaveValue('40');
      await user.type(within(grupo).getByLabelText('Hito 2'), 'Entrega');
      expect(within(grupo).getByText('Suman 100 %')).toBeInTheDocument();

      await user.click(within(dialogo).getByRole('button', { name: 'Crear OT' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/ordenes-trabajo/9'));
      expect(api.cuerpo('POST /api/ordenes-trabajo')).toEqual({
        cotizacionId: 8,
        descripcion: 'Instalación eléctrica del local',
        fechaInicio: null,
        fechaTermino: null,
        hitos: [
          { descripcion: 'Anticipo', porcentaje: 60, fechaEstimada: null },
          { descripcion: 'Entrega', porcentaje: 40, fechaEstimada: null },
        ],
      });
    });
  });

  describe('bandeja de aprobación (P30)', () => {
    it('lista lo pendiente por tipo y aprueba desde la fila', async () => {
      const deTomas = { ...enRevision, creadoPor: tomas };
      const api = simularApi({
        ...comunes,
        'GET /api/ordenes-compra': () => pagina([deTomas]),
        'GET /api/ordenes-trabajo': () => pagina([]),
        'GET /api/cotizaciones': () => pagina([]),
        'POST /api/ordenes-compra/12/aprobar': () => ({ ordenCompra: deTomas, movimientos: [] }),
      });
      const user = userEvent.setup();
      renderApp('/pagos', { sesion: sesionUsuario });
      const ocs = await screen.findByRole('region', { name: 'Órdenes de compra por aprobar' });
      expect(await within(ocs).findByText('OC-000012')).toBeInTheDocument();
      expect(within(ocs).getByLabelText('1 pendientes')).toBeInTheDocument();
      const ots = screen.getByRole('region', { name: 'Órdenes de trabajo por aprobar' });
      expect(
        await within(ots).findByText('No hay órdenes de trabajo pendientes de aprobación.'),
      ).toBeInTheDocument();
      expect(screen.getByText(/Lotes de pago y planilla bancaria: pendientes/)).toBeInTheDocument();

      await user.click(within(ocs).getByRole('button', { name: 'Aprobar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));
      await waitFor(() => expect(api.veces('POST /api/ordenes-compra/12/aprobar')).toBe(1));
    });
  });

  it('pestaña «Compras» de la obra: compromisos vigentes por categoría', async () => {
    simularApi({
      ...comunes,
      'GET /api/obras/1/resumen': () => resumenEjemplo({ obra: obraEjemplo() }),
      'GET /api/obras/1/compromisos': () => ({
        obraId: 1,
        totalClp: 2_874_455,
        porCategoria: [
          { categoria: { id: 20, codigo: 'materiales', nombre: 'Materiales' }, totalClp: 874_455 },
          {
            categoria: { id: 21, codigo: 'subcontratos', nombre: 'Subcontratos' },
            totalClp: 2_000_000,
          },
        ],
      }),
      'GET /api/ordenes-trabajo': () => pagina([ordenTrabajoEjemplo({ estado: 'aprobada' })]),
      'GET /api/ordenes-compra': () => pagina([ordenCompraEjemplo({ estado: 'aprobada' })]),
      'GET /api/cotizaciones': () => pagina([]),
    });
    renderApp('/obras/1?pestana=compras', { sesion: sesionUsuario });
    const total = await screen.findByLabelText('Total comprometido');
    await waitFor(() => expect(total).toHaveTextContent('$ 2.874.455'));
    const categorias = screen.getByRole('table', { name: 'Compromisos por categoría' });
    expect(within(categorias).getByText('Subcontratos')).toBeInTheDocument();
    expect(await screen.findByText('OT-000004')).toBeInTheDocument();
    expect(screen.getByText('OC-000012')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva OC de materiales' })).toBeInTheDocument();
  });
});
