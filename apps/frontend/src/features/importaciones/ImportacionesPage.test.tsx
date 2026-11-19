import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import {
  filaImportacionEjemplo,
  loteEjemplo,
  obraEjemplo,
  sesionAdmin,
  sesionUsuario,
} from '@/test/fixtures';
import { renderApp } from '@/test/utils';

const paginaObras = { items: [obraEjemplo()], total: 1, pagina: 1, tamanio: 50 };
const paginaLotes = (items = [loteEjemplo()]) => ({
  items,
  total: items.length,
  pagina: 1,
  tamanio: 10,
});
const paginaFilas = (items = [filaImportacionEjemplo()]) => ({
  items,
  total: items.length,
  pagina: 1,
  tamanio: 25,
});

const filaConErrores = filaImportacionEjemplo({
  numeroFila: 4,
  valida: false,
  datos: {
    codigo: '1.1',
    familia: 'Inexistente',
    descripcion: null,
    unidad: 'm2',
    cantidad: '0',
    precioUnitario: '1,5',
  },
  errores: [
    { campo: 'codigo', mensaje: 'El código «1.1» ya aparece en la fila 2.' },
    {
      campo: 'familia',
      mensaje: 'La familia «Inexistente» no existe en el catálogo o está inactiva.',
    },
    { campo: 'cantidad', mensaje: 'La cantidad debe ser mayor que cero.' },
  ],
});

const planilla = () =>
  new File(['contenido'], 'presupuesto-local.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

function base(extra: Record<string, () => unknown> = {}) {
  return {
    'GET /api/obras': () => paginaObras,
    'GET /api/obras/1': () => obraEjemplo(),
    'GET /api/importaciones': () => paginaLotes([]),
    ...extra,
  };
}

async function elegirObra(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox', { name: /Obra de destino/ }));
  await user.click(await screen.findByRole('option', { name: 'CC-001 · Local Parque Norte' }));
}

describe('ImportacionesPage (P24)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('acceso (solo administradores, D-11)', () => {
    it('el administrador la ve en el menú y entra', async () => {
      simularApi(base());
      renderApp('/importaciones', { sesion: sesionAdmin });
      expect(
        await screen.findByRole('heading', { name: 'Importación masiva' }),
      ).toBeInTheDocument();
      const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
      expect(within(nav).getByRole('link', { name: 'Importación masiva' })).toBeInTheDocument();
    });

    it('un usuario no la ve en el menú y la ruta lo devuelve al inicio', async () => {
      const api = simularApi(base());
      const { router } = renderApp('/importaciones', { sesion: sesionUsuario });
      await waitFor(() => expect(router.state.location.pathname).toBe('/'));
      const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
      expect(
        within(nav).queryByRole('link', { name: 'Importación masiva' }),
      ).not.toBeInTheDocument();
      expect(api.llamadas.some((l) => l.clave.startsWith('GET /api/importaciones'))).toBe(false);
    });
  });

  describe('subida', () => {
    it('ofrece descargar la plantilla provisoria', async () => {
      simularApi(base());
      renderApp('/importaciones', { sesion: sesionAdmin });
      const enlace = await screen.findByRole('link', { name: 'Descargar plantilla' });
      expect(enlace).toHaveAttribute('href', '/api/importaciones/plantillas/presupuesto');
      expect(
        screen.getByText(/plantilla definitiva del cliente aún no existe/),
      ).toBeInTheDocument();
    });

    it('«Subir y previsualizar» exige obra y archivo', async () => {
      simularApi(base());
      const user = userEvent.setup();
      renderApp('/importaciones', { sesion: sesionAdmin });
      const subir = await screen.findByRole('button', { name: 'Subir y previsualizar' });
      expect(subir).toBeDisabled();

      await user.upload(screen.getByTestId('archivo-importacion'), planilla());
      expect(subir).toBeDisabled();
      await elegirObra(user);
      expect(subir).toBeEnabled();
    });

    it('la obra puede venir preseleccionada desde la pestaña Presupuesto (?obra=)', async () => {
      simularApi(base());
      const user = userEvent.setup();
      renderApp('/importaciones?obra=1', { sesion: sesionAdmin });
      await waitFor(() =>
        expect(screen.getByRole('combobox', { name: /Obra de destino/ })).toHaveValue(
          'CC-001 · Local Parque Norte',
        ),
      );
      await user.upload(screen.getByTestId('archivo-importacion'), planilla());
      expect(screen.getByRole('button', { name: 'Subir y previsualizar' })).toBeEnabled();
    });

    it('rechaza en el cliente un archivo que no es Excel ni CSV', async () => {
      simularApi(base());
      const user = userEvent.setup({ applyAccept: false });
      renderApp('/importaciones?obra=1', { sesion: sesionAdmin });
      await screen.findByRole('button', { name: 'Subir y previsualizar' });
      await user.upload(
        screen.getByTestId('archivo-importacion'),
        new File(['x'], 'presupuesto.pdf', { type: 'application/pdf' }),
      );
      expect(
        await screen.findByText('Sube un archivo Excel (.xlsx) o CSV (.csv).'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Subir y previsualizar' })).toBeDisabled();
    });

    it('sube la planilla con la obra y muestra la previsualización', async () => {
      const api = simularApi(
        base({
          'POST /api/importaciones/presupuestos': () => loteEjemplo({ id: 7 }),
          'GET /api/importaciones/7': () => loteEjemplo({ id: 7 }),
          'GET /api/importaciones/7/filas': () => paginaFilas(),
        }),
      );
      const user = userEvent.setup();
      const { router } = renderApp('/importaciones', { sesion: sesionAdmin });
      await screen.findByRole('button', { name: 'Subir y previsualizar' });
      await elegirObra(user);
      await user.upload(screen.getByTestId('archivo-importacion'), planilla());
      await user.click(screen.getByRole('button', { name: 'Subir y previsualizar' }));

      await waitFor(() => expect(api.veces('POST /api/importaciones/presupuestos')).toBe(1));
      const formulario = api.llamadas.find(
        (l) => l.clave === 'POST /api/importaciones/presupuestos',
      )!.config.data as FormData;
      expect(formulario.get('obraId')).toBe('1');
      expect((formulario.get('archivo') as File).name).toBe('presupuesto-local.xlsx');

      const preview = await screen.findByRole('region', {
        name: 'Previsualización de la importación',
      });
      expect(within(preview).getByText('presupuesto-local.xlsx')).toBeInTheDocument();
      expect(within(preview).getByText('Pendiente de confirmar')).toBeInTheDocument();
      expect(within(preview).getByText('3 fila(s)')).toBeInTheDocument();
      expect(within(preview).getByText('0 con errores')).toBeInTheDocument();
      expect(
        within(preview).getByText(/Monto de las filas válidas: \$ 3\.000\.000/),
      ).toBeInTheDocument();
      expect(router.state.location.search).toBe('?lote=7');
    });

    it('si la planilla no es válida (422) muestra el motivo y no previsualiza nada', async () => {
      simularApi(
        base({
          'POST /api/importaciones/presupuestos': () =>
            errorApi(
              422,
              'PLANTILLA_INVALIDA',
              'Faltan columnas en el encabezado: «Familia». Descarga la plantilla para ver el formato esperado.',
            ),
        }),
      );
      const user = userEvent.setup();
      renderApp('/importaciones?obra=1', { sesion: sesionAdmin });
      await screen.findByRole('button', { name: 'Subir y previsualizar' });
      await user.upload(screen.getByTestId('archivo-importacion'), planilla());
      await user.click(screen.getByRole('button', { name: 'Subir y previsualizar' }));
      expect(await screen.findByText(/Faltan columnas en el encabezado/)).toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Previsualización de la importación' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('previsualización', () => {
    it('con errores: muestra cada error en su fila y no deja confirmar', async () => {
      const lote = loteEjemplo({ id: 7, totalFilas: 3, filasValidas: 2, filasConError: 1 });
      const api = simularApi(
        base({
          'GET /api/importaciones/7': () => lote,
          'GET /api/importaciones/7/filas': () => paginaFilas([filaConErrores]),
        }),
      );
      renderApp('/importaciones?lote=7', { sesion: sesionAdmin });

      const preview = await screen.findByRole('region', {
        name: 'Previsualización de la importación',
      });
      expect(await within(preview).findByText('1 con errores')).toBeInTheDocument();
      expect(
        within(preview).getByText(/La planilla tiene 1 fila\(s\) con errores/),
      ).toBeInTheDocument();
      const tabla = within(preview).getByRole('grid');
      expect(
        await within(tabla).findByText(/El código «1\.1» ya aparece en la fila 2\./),
      ).toBeInTheDocument();
      expect(within(tabla).getByText(/La familia «Inexistente» no existe/)).toBeInTheDocument();
      expect(within(tabla).getByText(/La cantidad debe ser mayor que cero\./)).toBeInTheDocument();
      expect(within(tabla).getByText('4')).toBeInTheDocument(); // número de fila

      // Por defecto solo se piden las filas con errores.
      const pedido = api.llamadas.find((l) => l.clave === 'GET /api/importaciones/7/filas')!;
      expect(pedido.config.url).toContain('soloErrores=true');
      expect(within(preview).getByRole('button', { name: 'Confirmar importación' })).toBeDisabled();
      expect(within(preview).getByRole('button', { name: 'Descartar' })).toBeEnabled();
    });

    it('puede alternar entre solo errores y todas las filas', async () => {
      const lote = loteEjemplo({ id: 7, totalFilas: 3, filasValidas: 2, filasConError: 1 });
      const api = simularApi(
        base({
          'GET /api/importaciones/7': () => lote,
          'GET /api/importaciones/7/filas': () =>
            paginaFilas([filaConErrores, filaImportacionEjemplo()]),
        }),
      );
      const user = userEvent.setup();
      renderApp('/importaciones?lote=7', { sesion: sesionAdmin });
      const alternar = await screen.findByLabelText('Mostrar solo las filas con errores');
      expect(alternar).toBeChecked();
      await user.click(alternar);
      await waitFor(() => {
        const ultimo = [...api.llamadas]
          .reverse()
          .find((l) => l.clave === 'GET /api/importaciones/7/filas')!;
        expect(ultimo.config.url).not.toContain('soloErrores');
      });
    });

    it('sin errores: confirma y crea la versión; luego enlaza al presupuesto', async () => {
      let lote = loteEjemplo({ id: 7 });
      const api = simularApi(
        base({
          'GET /api/importaciones/7': () => lote,
          'GET /api/importaciones/7/filas': () => paginaFilas(),
          'POST /api/importaciones/7/confirmar': () => {
            lote = loteEjemplo({
              id: 7,
              estado: 'confirmado',
              version: 2,
              presupuestoVersionId: 55,
              confirmadoEn: '2026-11-19T13:00:00.000Z',
            });
            return lote;
          },
        }),
      );
      const user = userEvent.setup();
      renderApp('/importaciones?lote=7', { sesion: sesionAdmin });

      const preview = await screen.findByRole('region', {
        name: 'Previsualización de la importación',
      });
      expect(await within(preview).findByText(/Todas las filas son válidas/)).toBeInTheDocument();
      await user.click(within(preview).getByRole('button', { name: 'Confirmar importación' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Confirmar importación' });
      expect(within(dialogo).getByText(/nueva versión en borrador/)).toBeInTheDocument();
      await user.click(within(dialogo).getByRole('button', { name: 'Confirmar' }));

      await waitFor(() => expect(api.veces('POST /api/importaciones/7/confirmar')).toBe(1));
      expect(api.cuerpo('POST /api/importaciones/7/confirmar')).toEqual({ version: 1 });
      const enlace = await within(preview).findByRole('link', { name: 'Ver presupuesto' });
      expect(enlace).toHaveAttribute('href', '/obras/1?pestana=presupuesto&version=55');
      expect(within(preview).getByText('Confirmado')).toBeInTheDocument();
      expect(
        within(preview).queryByRole('button', { name: 'Confirmar importación' }),
      ).not.toBeInTheDocument();
    });

    it('un error al confirmar se muestra en el diálogo', async () => {
      simularApi(
        base({
          'GET /api/importaciones/7': () => loteEjemplo({ id: 7 }),
          'GET /api/importaciones/7/filas': () => paginaFilas(),
          'POST /api/importaciones/7/confirmar': () =>
            errorApi(
              422,
              'IMPORTACION_DESACTUALIZADA',
              'Los datos del lote ya no son válidos. Descarta el lote y vuelve a subir la planilla.',
            ),
        }),
      );
      const user = userEvent.setup();
      renderApp('/importaciones?lote=7', { sesion: sesionAdmin });
      await user.click(await screen.findByRole('button', { name: 'Confirmar importación' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Confirmar importación' });
      await user.click(within(dialogo).getByRole('button', { name: 'Confirmar' }));
      expect(await within(dialogo).findByText(/ya no son válidos/)).toBeInTheDocument();
    });

    it('descarta el lote con un motivo opcional', async () => {
      const api = simularApi(
        base({
          'GET /api/importaciones/7': () => loteEjemplo({ id: 7 }),
          'GET /api/importaciones/7/filas': () => paginaFilas(),
          'POST /api/importaciones/7/descartar': () =>
            loteEjemplo({ id: 7, estado: 'descartado', version: 2 }),
        }),
      );
      const user = userEvent.setup();
      renderApp('/importaciones?lote=7', { sesion: sesionAdmin });
      await user.click(await screen.findByRole('button', { name: 'Descartar' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Descartar importación' });
      await user.type(within(dialogo).getByLabelText('Motivo (opcional)'), 'Archivo equivocado');
      await user.click(within(dialogo).getByRole('button', { name: 'Descartar' }));
      await waitFor(() => expect(api.veces('POST /api/importaciones/7/descartar')).toBe(1));
      expect(api.cuerpo('POST /api/importaciones/7/descartar')).toEqual({
        version: 1,
        motivo: 'Archivo equivocado',
      });
    });

    it('un lote ya descartado no ofrece acciones', async () => {
      simularApi(
        base({
          'GET /api/importaciones/7': () => loteEjemplo({ id: 7, estado: 'descartado' }),
          'GET /api/importaciones/7/filas': () => paginaFilas(),
        }),
      );
      renderApp('/importaciones?lote=7', { sesion: sesionAdmin });
      expect(await screen.findByText(/Esta importación fue descartada/)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Confirmar importación' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('historial', () => {
    it('lista los lotes recientes y permite abrir uno', async () => {
      simularApi(
        base({
          'GET /api/importaciones': () =>
            paginaLotes([
              loteEjemplo({ id: 7, filasConError: 1, filasValidas: 2 }),
              loteEjemplo({
                id: 6,
                nombreArchivo: 'anterior.csv',
                estado: 'confirmado',
              }),
            ]),
          'GET /api/importaciones/7': () =>
            loteEjemplo({ id: 7, filasConError: 1, filasValidas: 2 }),
          'GET /api/importaciones/7/filas': () => paginaFilas([filaConErrores]),
        }),
      );
      const user = userEvent.setup();
      const { router } = renderApp('/importaciones', { sesion: sesionAdmin });
      const historial = await screen.findByRole('region', { name: 'Historial de importaciones' });
      expect(
        await within(historial).findByRole('button', { name: 'presupuesto-local.xlsx' }),
      ).toBeInTheDocument();
      expect(within(historial).getByText('anterior.csv')).toBeInTheDocument();
      expect(within(historial).getByText('Confirmado')).toBeInTheDocument();

      await user.click(within(historial).getByRole('button', { name: 'presupuesto-local.xlsx' }));
      expect(
        await screen.findByRole('region', { name: 'Previsualización de la importación' }),
      ).toBeInTheDocument();
      expect(router.state.location.search).toBe('?lote=7');
    });

    it('sin importaciones lo indica', async () => {
      simularApi(base());
      renderApp('/importaciones', { sesion: sesionAdmin });
      expect(await screen.findByText('Todavía no hay importaciones.')).toBeInTheDocument();
    });
  });
});
