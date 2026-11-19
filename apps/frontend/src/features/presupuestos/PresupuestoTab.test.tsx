import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SesionApi } from '@/api/auth';
import { errorApi, simularApi } from '@/test/api';
import {
  FAMILIAS_PARTIDA,
  comparacionEjemplo,
  detallePresupuestoEjemplo,
  obraEjemplo,
  partidaEjemplo,
  resumenEjemplo,
  sesionAdmin,
  sesionUsuario,
  versionPresupuestoEjemplo,
} from '@/test/fixtures';
import { renderApp } from '@/test/utils';

// sesionUsuario es la usuaria 2 (Camila); sesionAdmin es el admin 1.
const camila = { id: 2, nombre: 'Camila Rojas' };
const tomas = { id: 3, nombre: 'Tomás Silva' };
const ana = { id: 1, nombre: 'Ana Administradora' };

const vigente = versionPresupuestoEjemplo({
  id: 11,
  numero: 1,
  estado: 'aprobado',
  vigente: true,
  total: 2_070_750,
  totalClp: 2_070_750,
  creadoPor: tomas,
  enviadoEn: '2026-11-11T12:00:00.000Z',
  enviadoPor: tomas,
  resueltoEn: '2026-11-12T15:00:00.000Z',
  resueltoPor: camila,
  version: 6,
});

interface Opciones {
  versiones?: ReturnType<typeof versionPresupuestoEjemplo>[];
  detalle?: ReturnType<typeof detallePresupuestoEjemplo>;
  obra?: ReturnType<typeof obraEjemplo>;
  extra?: Record<string, () => unknown>;
}

/** Monta la pestaña con una versión seleccionada (`?version=`). */
function montar(
  sesion: SesionApi,
  { versiones, detalle, obra = obraEjemplo(), extra = {} }: Opciones = {},
  ruta = '/obras/1?pestana=presupuesto&version=12',
) {
  const det = detalle ?? detallePresupuestoEjemplo();
  const lista = versiones ?? [det.version];
  const api = simularApi({
    'GET /api/obras/1/resumen': () => resumenEjemplo({ obra }),
    'GET /api/obras/1/presupuestos': () => lista,
    [`GET /api/presupuestos/${det.version.id}`]: () => det,
    'GET /api/catalogos/familia_partida': () => FAMILIAS_PARTIDA,
    ...extra,
  });
  return { api, ...renderApp(ruta, { sesion }) };
}

const esperarVersion = (numero: number) =>
  screen.findByRole('heading', { name: `Versión ${numero}` });

describe('PresupuestoTab (P06)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('lectura', () => {
    it('muestra el presupuesto vigente frente al contrato, las versiones y la vigente seleccionada por defecto', async () => {
      const borrador = versionPresupuestoEjemplo({ id: 12, numero: 2, creadoPor: tomas });
      montar(
        sesionUsuario,
        {
          versiones: [borrador, vigente],
          detalle: detallePresupuestoEjemplo(vigente),
          extra: {
            'GET /api/presupuestos/11': () => detallePresupuestoEjemplo(vigente),
          },
        },
        '/obras/1?pestana=presupuesto',
      );

      await esperarVersion(1);
      const resumen = screen.getByRole('region', { name: 'Resumen del presupuesto' });
      expect(within(resumen).getByText('$ 2.070.750')).toBeInTheDocument();
      expect(within(resumen).getByText(/Versión 1 · aprobada el/)).toBeInTheDocument();
      // Contrato $ 185.000.000 − presupuesto $ 2.070.750
      expect(within(resumen).getByText('$ 185.000.000')).toBeInTheDocument();
      expect(within(resumen).getByText('$ 182.929.250')).toBeInTheDocument();

      const versiones = screen.getByRole('region', { name: 'Versiones del presupuesto' });
      expect(
        within(versiones).getByRole('button', { name: 'Ver la versión 2' }),
      ).toBeInTheDocument();
      const botonVigente = within(versiones).getByRole('button', { name: 'Ver la versión 1' });
      expect(botonVigente).toHaveAttribute('aria-current', 'true');
      expect(within(botonVigente).getByText('Vigente')).toBeInTheDocument();
    });

    it('detalle de la versión: trazabilidad, totales por familia y partidas', async () => {
      montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({
          estado: 'aprobado',
          vigente: true,
          descripcion: 'Presupuesto base',
          enviadoEn: '2026-11-11T12:00:00.000Z',
          enviadoPor: tomas,
          resueltoEn: '2026-11-12T15:00:00.000Z',
          resueltoPor: camila,
          motivoResolucion: 'Conforme',
          copiadaDeNumero: 1,
        }),
      });
      await esperarVersion(1);

      expect(screen.getAllByText('Presupuesto base').length).toBe(2); // lista y detalle
      const detalle = screen.getByRole('region', { name: 'Versión 1' });
      expect(within(detalle).getAllByText('Tomás Silva').length).toBe(2); // creó y envió
      expect(within(detalle).getByText('Camila Rojas')).toBeInTheDocument(); // aprobó
      expect(within(detalle).getAllByText('Aprobada').length).toBe(2); // estado y fecha de aprobación
      expect(within(detalle).getByText(/Conforme/)).toBeInTheDocument();
      expect(within(detalle).getByText('Copiada de')).toBeInTheDocument();

      const totales = screen.getByRole('table', { name: 'Totales por familia' });
      expect(within(totales).getByText('Obras preliminares')).toBeInTheDocument();
      expect(within(totales).getByText('Obra gruesa')).toBeInTheDocument();
      expect(within(totales).getByText('$ 770.750')).toBeInTheDocument();
      expect(within(totales).getAllByText('$ 3.000.000').length).toBeGreaterThan(0);

      const partidas = screen.getByRole('region', { name: 'Partidas de la versión' });
      const tabla = within(partidas).getByRole('grid');
      expect(within(tabla).getByText('Radier de hormigón')).toBeInTheDocument();
      expect(within(tabla).getByText('120,5')).toBeInTheDocument();
      expect(within(tabla).getByText('$ 2.229.250')).toBeInTheDocument();
    });

    it('filtra las partidas por texto', async () => {
      const user = userEvent.setup();
      montar(sesionUsuario);
      await esperarVersion(1);
      const tabla = screen.getByRole('grid');
      expect(within(tabla).getByText('Muros de albañilería')).toBeInTheDocument();

      await user.type(screen.getByLabelText(/Buscar por código/), 'muros');
      expect(within(tabla).queryByText('Radier de hormigón')).not.toBeInTheDocument();
      expect(within(tabla).getByText('Muros de albañilería')).toBeInTheDocument();
    });

    it('una versión rechazada muestra el motivo del rechazo', async () => {
      montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({
          estado: 'rechazado',
          resueltoEn: '2026-11-12T15:00:00.000Z',
          resueltoPor: tomas,
          motivoResolucion: 'Faltan las instalaciones',
        }),
      });
      await esperarVersion(1);
      expect(screen.getByText('Faltan las instalaciones')).toBeInTheDocument();
      expect(screen.getByText(/Rechazada por Tomás Silva/)).toBeInTheDocument();
    });

    it('una versión en UF muestra los totales en UF y en pesos con el valor de la UF usado', async () => {
      montar(sesionUsuario, {
        detalle: {
          ...detallePresupuestoEjemplo({
            moneda: 'UF',
            valorUf: 39_284.8712,
            fechaValorUf: '2026-11-19',
            total: 76.25,
            totalClp: 2_995_000,
          }),
          partidas: [
            partidaEjemplo({
              cantidad: 2.5,
              precioUnitario: 30.5,
              total: 76.25,
              totalClp: 2_995_000,
            }),
          ],
        },
      });
      await esperarVersion(1);
      expect(screen.getByText('Valor de la UF usado')).toBeInTheDocument();
      expect(screen.getByText('Total (UF)', { selector: 'div' })).toBeInTheDocument();
      expect(screen.getByText('Total en pesos')).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: /Precio unit\. \(UF\)/ }),
      ).toBeInTheDocument();
      expect(screen.getAllByText('UF 76,25').length).toBeGreaterThan(0);
    });

    it('sin versiones: invita a crear la primera', async () => {
      simularApi({
        'GET /api/obras/1/resumen': () => resumenEjemplo(),
        'GET /api/obras/1/presupuestos': () => [],
      });
      renderApp('/obras/1?pestana=presupuesto', { sesion: sesionUsuario });
      expect(
        await screen.findByRole('heading', { name: 'Sin versiones de presupuesto' }),
      ).toBeInTheDocument();
      expect(screen.getByText(/aún no tiene un presupuesto aprobado/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Nueva versión' })).toBeInTheDocument();
    });

    it('un error al cargar permite reintentar', async () => {
      simularApi({
        'GET /api/obras/1/resumen': () => resumenEjemplo(),
        'GET /api/obras/1/presupuestos': () => errorApi(500, 'ERROR', 'Falla del servidor'),
      });
      renderApp('/obras/1?pestana=presupuesto', { sesion: sesionUsuario });
      expect(await screen.findByText('Falla del servidor')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    });
  });

  describe('acciones de flujo según rol y estado', () => {
    const hayBoton = (nombre: string) =>
      screen.queryByRole('button', { name: nombre }) ??
      screen.queryByRole('link', { name: nombre });

    it('un borrador de otra persona se edita, se envía y se elimina; no se aprueba', async () => {
      montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({ estado: 'borrador', creadoPor: tomas }),
      });
      await esperarVersion(1);
      for (const nombre of [
        'Enviar a revisión',
        'Editar descripción',
        'Crear versión desde esta',
        'Exportar a Excel',
        'Eliminar borrador',
        'Agregar partida',
      ]) {
        expect(hayBoton(nombre), nombre).toBeInTheDocument();
      }
      expect(hayBoton('Aprobar')).toBeNull();
      expect(hayBoton('Rechazar')).toBeNull();
      expect(screen.getByRole('link', { name: 'Exportar a Excel' })).toHaveAttribute(
        'href',
        '/api/presupuestos/12/exportar',
      );
      expect(screen.getByRole('button', { name: 'Editar la partida 1.1' })).toBeInTheDocument();
    });

    it('un borrador sin partidas no se puede enviar y lo explica', async () => {
      montar(sesionUsuario, { detalle: detallePresupuestoEjemplo({ estado: 'borrador' }, []) });
      await esperarVersion(1);
      expect(screen.getByRole('button', { name: 'Enviar a revisión' })).toBeDisabled();
      expect(screen.getByText(/Agrega al menos una partida/)).toBeInTheDocument();
      expect(screen.getByText(/aún no tiene partidas/)).toBeInTheDocument();
    });

    it('en revisión creada por otra persona: se aprueba o rechaza, pero no se edita', async () => {
      montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({
          estado: 'en_revision',
          creadoPor: tomas,
          enviadoEn: '2026-11-11T12:00:00.000Z',
          enviadoPor: tomas,
        }),
      });
      await esperarVersion(1);
      expect(hayBoton('Aprobar')).toBeInTheDocument();
      expect(hayBoton('Rechazar')).toBeInTheDocument();
      expect(hayBoton('Agregar partida')).toBeNull();
      expect(hayBoton('Enviar a revisión')).toBeNull();
      expect(hayBoton('Eliminar borrador')).toBeNull();
      expect(screen.queryByRole('button', { name: /Editar la partida/ })).not.toBeInTheDocument();
    });

    it('D-10: un usuario no puede aprobar lo que creó (el botón no se ofrece y se explica)', async () => {
      montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({
          estado: 'en_revision',
          creadoPor: camila,
          enviadoEn: '2026-11-11T12:00:00.000Z',
          enviadoPor: camila,
        }),
      });
      await esperarVersion(1);
      expect(hayBoton('Aprobar')).toBeNull();
      expect(
        screen.getByText(/No puedes aprobar una versión que tú mismo creaste/),
      ).toBeInTheDocument();
      // Retirarla (rechazarla) sí puede.
      expect(hayBoton('Rechazar')).toBeInTheDocument();
    });

    it('D-10: el admin sí puede aprobar lo que creó', async () => {
      montar(sesionAdmin, {
        detalle: detallePresupuestoEjemplo({
          estado: 'en_revision',
          creadoPor: ana,
          enviadoEn: '2026-11-11T12:00:00.000Z',
          enviadoPor: ana,
        }),
      });
      await esperarVersion(1);
      expect(hayBoton('Aprobar')).toBeInTheDocument();
      expect(screen.queryByText(/No puedes aprobar/)).not.toBeInTheDocument();
    });

    it.each(['aprobado', 'rechazado'] as const)(
      'una versión %s es inmutable: solo se puede copiar y exportar',
      async (estado) => {
        montar(sesionAdmin, {
          detalle: detallePresupuestoEjemplo({
            estado,
            vigente: estado === 'aprobado',
            resueltoEn: '2026-11-12T15:00:00.000Z',
            resueltoPor: tomas,
            motivoResolucion: 'x',
          }),
        });
        await esperarVersion(1);
        for (const nombre of [
          'Agregar partida',
          'Editar descripción',
          'Enviar a revisión',
          'Aprobar',
          'Rechazar',
          'Eliminar borrador',
        ]) {
          expect(hayBoton(nombre), nombre).toBeNull();
        }
        expect(screen.queryByRole('button', { name: /Quitar la partida/ })).not.toBeInTheDocument();
        expect(hayBoton('Crear versión desde esta')).toBeInTheDocument();
        expect(hayBoton('Exportar a Excel')).toBeInTheDocument();
      },
    );

    it('una obra cerrada deja todo el presupuesto en solo lectura', async () => {
      montar(sesionAdmin, {
        obra: obraEjemplo({ estado: { id: 5, codigo: 'cerrada', nombre: 'Cerrada' } }),
        detalle: detallePresupuestoEjemplo({ estado: 'borrador', creadoPor: tomas }),
      });
      await esperarVersion(1);
      expect(screen.getAllByText(/La obra está cerrada/).length).toBeGreaterThan(0);
      for (const nombre of [
        'Nueva versión',
        'Agregar partida',
        'Enviar a revisión',
        'Crear versión desde esta',
        'Eliminar borrador',
      ]) {
        expect(hayBoton(nombre), nombre).toBeNull();
      }
      expect(hayBoton('Exportar a Excel')).toBeInTheDocument();
    });

    it('«Importar desde Excel» solo lo ve el administrador', async () => {
      const { unmount } = montar(sesionAdmin);
      expect(await screen.findByRole('link', { name: 'Importar desde Excel' })).toHaveAttribute(
        'href',
        '/importaciones?obra=1',
      );
      unmount();
      montar(sesionUsuario);
      await esperarVersion(1);
      expect(screen.queryByRole('link', { name: 'Importar desde Excel' })).not.toBeInTheDocument();
    });
  });

  describe('flujo de aprobación', () => {
    it('envía a revisión con confirmación, enviando la versión que se tiene cargada', async () => {
      const { api } = montar(sesionUsuario, {
        extra: {
          'POST /api/presupuestos/12/enviar-revision': () =>
            versionPresupuestoEjemplo({ estado: 'en_revision' }),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);

      await user.click(screen.getByRole('button', { name: 'Enviar a revisión' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Enviar a revisión' });
      expect(within(dialogo).getByText(/quedará congelada/)).toBeInTheDocument();
      await user.click(within(dialogo).getByRole('button', { name: 'Enviar a revisión' }));

      await waitFor(() => expect(api.veces('POST /api/presupuestos/12/enviar-revision')).toBe(1));
      expect(api.cuerpo('POST /api/presupuestos/12/enviar-revision')).toEqual({ version: 4 });
    });

    it('aprueba con un comentario opcional', async () => {
      const { api } = montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({
          estado: 'en_revision',
          creadoPor: tomas,
          enviadoEn: '2026-11-11T12:00:00.000Z',
          enviadoPor: tomas,
        }),
        extra: {
          'POST /api/presupuestos/12/aprobar': () =>
            versionPresupuestoEjemplo({ estado: 'aprobado', vigente: true }),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);

      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Aprobar versión' });
      await user.type(
        within(dialogo).getByLabelText('Motivo (opcional)'),
        'Conforme con los valores',
      );
      await user.click(within(dialogo).getByRole('button', { name: 'Aprobar' }));

      await waitFor(() => expect(api.veces('POST /api/presupuestos/12/aprobar')).toBe(1));
      expect(api.cuerpo('POST /api/presupuestos/12/aprobar')).toEqual({
        version: 4,
        motivo: 'Conforme con los valores',
      });
    });

    it('rechazar exige un motivo', async () => {
      const { api } = montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({
          estado: 'en_revision',
          creadoPor: tomas,
          enviadoEn: '2026-11-11T12:00:00.000Z',
          enviadoPor: tomas,
        }),
        extra: {
          'POST /api/presupuestos/12/rechazar': () =>
            versionPresupuestoEjemplo({ estado: 'rechazado' }),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);

      await user.click(screen.getByRole('button', { name: 'Rechazar' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Rechazar versión' });
      const confirmar = within(dialogo).getByRole('button', { name: 'Rechazar' });
      expect(confirmar).toBeDisabled();
      await user.type(within(dialogo).getByLabelText('Motivo'), 'Faltan partidas de instalaciones');
      expect(confirmar).toBeEnabled();
      await user.click(confirmar);

      await waitFor(() => expect(api.veces('POST /api/presupuestos/12/rechazar')).toBe(1));
      expect(api.cuerpo('POST /api/presupuestos/12/rechazar')).toEqual({
        version: 4,
        motivo: 'Faltan partidas de instalaciones',
      });
    });

    it('si el servidor rechaza la autoaprobación, lo informa en el diálogo', async () => {
      montar(sesionAdmin, {
        detalle: detallePresupuestoEjemplo({
          estado: 'en_revision',
          creadoPor: ana,
          enviadoEn: '2026-11-11T12:00:00.000Z',
          enviadoPor: ana,
        }),
        extra: {
          'POST /api/presupuestos/12/aprobar': () =>
            errorApi(
              403,
              'AUTOAPROBACION_NO_PERMITIDA',
              'No puedes aprobar un documento que tú mismo creaste.',
            ),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);
      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Aprobar versión' });
      await user.click(within(dialogo).getByRole('button', { name: 'Aprobar' }));
      expect(
        await within(dialogo).findByText('No puedes aprobar un documento que tú mismo creaste.'),
      ).toBeInTheDocument();
    });

    it('un conflicto de versión muestra el aviso y recarga los datos', async () => {
      let detalle = detallePresupuestoEjemplo({
        estado: 'en_revision',
        creadoPor: tomas,
        enviadoEn: '2026-11-11T12:00:00.000Z',
        enviadoPor: tomas,
      });
      const { api } = montar(sesionUsuario, {
        detalle,
        extra: {
          'GET /api/presupuestos/12': () => detalle,
          'POST /api/presupuestos/12/aprobar': () => {
            detalle = detallePresupuestoEjemplo({ ...detalle.version, version: 9 });
            return errorApi(
              409,
              'CONFLICTO_VERSION',
              'El registro fue modificado por otra persona. Recarga y reintenta.',
              [{ versionActual: 9 }],
            );
          },
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);
      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Aprobar versión' });
      await user.click(within(dialogo).getByRole('button', { name: 'Aprobar' }));

      expect(
        await within(dialogo).findByText(/fue modificado por otra persona/),
      ).toBeInTheDocument();
      await waitFor(() => expect(api.veces('GET /api/presupuestos/12')).toBeGreaterThan(1));
    });

    it('elimina un borrador con confirmación y vuelve a la lista', async () => {
      const { api } = montar(sesionUsuario, {
        extra: { 'POST /api/presupuestos/12/eliminar': () => undefined },
      });
      const user = userEvent.setup();
      await esperarVersion(1);

      await user.click(screen.getByRole('button', { name: 'Eliminar borrador' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Eliminar borrador' });
      await user.type(within(dialogo).getByLabelText('Motivo (opcional)'), 'Duplicado');
      await user.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

      await waitFor(() => expect(api.veces('POST /api/presupuestos/12/eliminar')).toBe(1));
      expect(api.cuerpo('POST /api/presupuestos/12/eliminar')).toEqual({
        version: 4,
        motivo: 'Duplicado',
      });
    });

    it('«Crear versión desde esta» copia la versión y la selecciona', async () => {
      const { api, router } = montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({ estado: 'aprobado', vigente: true }),
        extra: {
          'POST /api/obras/1/presupuestos': () => versionPresupuestoEjemplo({ id: 13, numero: 2 }),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);
      await user.click(screen.getByRole('button', { name: 'Crear versión desde esta' }));

      await waitFor(() => expect(api.veces('POST /api/obras/1/presupuestos')).toBe(1));
      expect(api.cuerpo('POST /api/obras/1/presupuestos')).toEqual({ copiarDeId: 12 });
      await waitFor(() => expect(router.state.location.search).toContain('version=13'));
    });

    it('edita la descripción del borrador', async () => {
      const { api } = montar(sesionUsuario, {
        extra: {
          'PATCH /api/presupuestos/12': () =>
            versionPresupuestoEjemplo({ descripcion: 'Con adicionales' }),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);
      await user.click(screen.getByRole('button', { name: 'Editar descripción' }));
      const dialogo = await screen.findByRole('dialog', { name: /Descripción de la versión 1/ });
      await user.type(within(dialogo).getByLabelText('Descripción'), 'Con adicionales');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
      await waitFor(() => expect(api.veces('PATCH /api/presupuestos/12')).toBe(1));
      expect(api.cuerpo('PATCH /api/presupuestos/12')).toEqual({
        version: 4,
        descripcion: 'Con adicionales',
      });
    });
  });

  describe('nueva versión', () => {
    it('ofrece copiar desde la vigente o crear una versión vacía', async () => {
      const { api } = montar(
        sesionUsuario,
        {
          versiones: [vigente],
          detalle: detallePresupuestoEjemplo(vigente),
          extra: {
            'GET /api/presupuestos/11': () => detallePresupuestoEjemplo(vigente),
            'POST /api/obras/1/presupuestos': () =>
              versionPresupuestoEjemplo({ id: 13, numero: 2 }),
          },
        },
        '/obras/1?pestana=presupuesto',
      );
      const user = userEvent.setup();
      await esperarVersion(1);

      await user.click(screen.getByRole('button', { name: 'Nueva versión' }));
      await user.click(
        await screen.findByRole('menuitem', { name: /Copiar desde la vigente \(versión 1\)/ }),
      );
      await waitFor(() => expect(api.veces('POST /api/obras/1/presupuestos')).toBe(1));
      expect(api.cuerpo('POST /api/obras/1/presupuestos')).toEqual({ copiarDeId: 11 });

      await user.click(screen.getByRole('button', { name: 'Nueva versión' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Versión vacía' }));
      await waitFor(() => expect(api.veces('POST /api/obras/1/presupuestos')).toBe(2));
      expect(api.cuerpo('POST /api/obras/1/presupuestos')).toEqual({});
    });

    it('sin versión vigente solo se ofrece la versión vacía', async () => {
      simularApi({
        'GET /api/obras/1/resumen': () => resumenEjemplo(),
        'GET /api/obras/1/presupuestos': () => [],
      });
      const user = userEvent.setup();
      renderApp('/obras/1?pestana=presupuesto', { sesion: sesionUsuario });
      await user.click(await screen.findByRole('button', { name: 'Nueva versión' }));
      expect(await screen.findByRole('menuitem', { name: 'Versión vacía' })).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: /Copiar desde la vigente/ }),
      ).not.toBeInTheDocument();
    });

    it('un error al crear (UF sin valor) se informa', async () => {
      simularApi({
        'GET /api/obras/1/resumen': () => resumenEjemplo(),
        'GET /api/obras/1/presupuestos': () => [],
        'POST /api/obras/1/presupuestos': () =>
          errorApi(422, 'UF_NO_DISPONIBLE', 'No hay valor de la UF cargado para hoy.'),
      });
      const user = userEvent.setup();
      renderApp('/obras/1?pestana=presupuesto', { sesion: sesionUsuario });
      await user.click(await screen.findByRole('button', { name: 'Nueva versión' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Versión vacía' }));
      expect(
        await screen.findByText('No hay valor de la UF cargado para hoy.'),
      ).toBeInTheDocument();
    });
  });

  describe('editor de partidas', () => {
    const elegirFamilia = async (user: ReturnType<typeof userEvent.setup>, nombre: string) => {
      await user.click(screen.getByRole('combobox', { name: /Familia/ }));
      await user.click(await screen.findByRole('option', { name: nombre }));
    };

    it('agrega una partida: valida el formulario, muestra el total estimado y envía el cuerpo', async () => {
      const { api } = montar(sesionUsuario, {
        extra: {
          'POST /api/presupuestos/12/partidas': () => partidaEjemplo({ id: 99, codigo: '3.1' }),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);

      await user.click(screen.getByRole('button', { name: 'Agregar partida' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Agregar partida' });
      await user.click(within(dialogo).getByRole('button', { name: 'Agregar partida' }));
      expect(await within(dialogo).findByText(/El código debe tener 1 a 30/)).toBeInTheDocument();
      expect(within(dialogo).getByText('Selecciona una familia.')).toBeInTheDocument();
      expect(within(dialogo).getByText(/al menos 2 caracteres/)).toBeInTheDocument();
      expect(within(dialogo).getByText('Indica la unidad.')).toBeInTheDocument();
      expect(
        within(dialogo).getByText(/cantidad debe ser un número mayor que cero/),
      ).toBeInTheDocument();
      expect(within(dialogo).getByText('Ingresa el precio unitario.')).toBeInTheDocument();
      expect(api.veces('POST /api/presupuestos/12/partidas')).toBe(0);

      await user.type(within(dialogo).getByLabelText(/^Código/), '3.1');
      await elegirFamilia(user, 'Obra gruesa');
      await user.type(within(dialogo).getByLabelText(/^Descripción/), 'Pintura de muros');
      await user.type(within(dialogo).getByLabelText(/^Unidad/), 'm2');
      await user.type(within(dialogo).getByLabelText(/^Cantidad/), '120,5');
      await user.type(within(dialogo).getByLabelText(/^Precio unitario \(CLP\)/), '18500');
      expect(within(dialogo).getByText('$ 2.229.250')).toBeInTheDocument();

      await user.click(within(dialogo).getByRole('button', { name: 'Agregar partida' }));
      await waitFor(() => expect(api.veces('POST /api/presupuestos/12/partidas')).toBe(1));
      expect(api.cuerpo('POST /api/presupuestos/12/partidas')).toEqual({
        codigo: '3.1',
        familiaId: 23,
        descripcion: 'Pintura de muros',
        unidad: 'm2',
        cantidad: 120.5,
        precioUnitario: 18500,
      });
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Agregar partida' })).not.toBeInTheDocument(),
      );
    });

    it('en una versión en UF el precio admite decimales', async () => {
      const { api } = montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({
          moneda: 'UF',
          valorUf: 40_000,
          fechaValorUf: '2026-11-19',
        }),
        extra: { 'POST /api/presupuestos/12/partidas': () => partidaEjemplo({ id: 99 }) },
      });
      const user = userEvent.setup();
      await esperarVersion(1);
      await user.click(screen.getByRole('button', { name: 'Agregar partida' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Agregar partida' });
      await user.type(within(dialogo).getByLabelText(/^Código/), '9');
      await elegirFamilia(user, 'Obra gruesa');
      await user.type(within(dialogo).getByLabelText(/^Descripción/), 'Global');
      await user.type(within(dialogo).getByLabelText(/^Unidad/), 'gl');
      await user.type(within(dialogo).getByLabelText(/^Cantidad/), '2,5');
      await user.type(within(dialogo).getByLabelText(/^Precio unitario \(UF\)/), '120,1234');
      expect(within(dialogo).getByText('UF 300,3085')).toBeInTheDocument();
      await user.click(within(dialogo).getByRole('button', { name: 'Agregar partida' }));
      await waitFor(() => expect(api.veces('POST /api/presupuestos/12/partidas')).toBe(1));
      expect(api.cuerpo('POST /api/presupuestos/12/partidas')).toMatchObject({
        cantidad: 2.5,
        precioUnitario: 120.1234,
      });
    });

    it('un código duplicado (409) se muestra en el campo', async () => {
      montar(sesionUsuario, {
        extra: {
          'POST /api/presupuestos/12/partidas': () =>
            errorApi(
              409,
              'PARTIDA_DUPLICADA',
              'Ya existe una partida con ese código en esta versión.',
              [
                {
                  campo: 'codigo',
                  errores: ['Ya existe una partida con ese código en esta versión.'],
                },
              ],
            ),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);
      await user.click(screen.getByRole('button', { name: 'Agregar partida' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Agregar partida' });
      await user.type(within(dialogo).getByLabelText(/^Código/), '1.1');
      await elegirFamilia(user, 'Obra gruesa');
      await user.type(within(dialogo).getByLabelText(/^Descripción/), 'Repetida');
      await user.type(within(dialogo).getByLabelText(/^Unidad/), 'm2');
      await user.type(within(dialogo).getByLabelText(/^Cantidad/), '1');
      await user.type(within(dialogo).getByLabelText(/^Precio unitario/), '100');
      await user.click(within(dialogo).getByRole('button', { name: 'Agregar partida' }));
      expect(
        await within(dialogo).findByText('Ya existe una partida con ese código en esta versión.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Agregar partida' })).toBeInTheDocument();
    });

    it('edita una partida enviando su versión (control optimista)', async () => {
      const { api } = montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({ estado: 'borrador' }, [
          partidaEjemplo({ version: 3 }),
        ]),
        extra: {
          'PATCH /api/presupuestos/12/partidas/31': () => partidaEjemplo({ cantidad: 200 }),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);

      await user.click(screen.getByRole('button', { name: 'Editar la partida 1.1' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Editar partida' });
      expect(within(dialogo).getByLabelText(/^Código/)).toHaveValue('1.1');
      expect(within(dialogo).getByLabelText(/^Cantidad/)).toHaveValue('120,5');
      const cantidad = within(dialogo).getByLabelText(/^Cantidad/);
      await user.clear(cantidad);
      await user.type(cantidad, '200');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(api.veces('PATCH /api/presupuestos/12/partidas/31')).toBe(1));
      expect(api.cuerpo('PATCH /api/presupuestos/12/partidas/31')).toMatchObject({
        version: 3,
        codigo: '1.1',
        cantidad: 200,
        precioUnitario: 18500,
      });
    });

    it('un conflicto al editar ofrece usar los datos vigentes', async () => {
      const { api } = montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({ estado: 'borrador' }, [partidaEjemplo()]),
        extra: {
          'PATCH /api/presupuestos/12/partidas/31': () =>
            errorApi(
              409,
              'CONFLICTO_VERSION',
              'El registro fue modificado por otra persona. Recarga y reintenta.',
              [{ versionActual: 2 }],
            ),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(1);
      await user.click(screen.getByRole('button', { name: 'Editar la partida 1.1' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Editar partida' });
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

      const conflicto = await screen.findByRole('dialog', {
        name: /Otra persona modificó la partida/,
      });
      const antes = api.veces('GET /api/presupuestos/12');
      await user.click(
        within(conflicto).getByRole('button', { name: /Usar los datos actuales|Usar/ }),
      );
      await waitFor(() => expect(api.veces('GET /api/presupuestos/12')).toBeGreaterThan(antes));
    });

    it('quita una partida con confirmación', async () => {
      const { api } = montar(sesionUsuario, {
        detalle: detallePresupuestoEjemplo({ estado: 'borrador' }, [
          partidaEjemplo({ version: 2 }),
        ]),
        extra: { 'POST /api/presupuestos/12/partidas/31/eliminar': () => undefined },
      });
      const user = userEvent.setup();
      await esperarVersion(1);
      await user.click(screen.getByRole('button', { name: 'Quitar la partida 1.1' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Quitar partida' });
      expect(within(dialogo).getByText(/Radier de hormigón/)).toBeInTheDocument();
      await user.click(within(dialogo).getByRole('button', { name: 'Quitar' }));
      await waitFor(() =>
        expect(api.veces('POST /api/presupuestos/12/partidas/31/eliminar')).toBe(1),
      );
      expect(api.cuerpo('POST /api/presupuestos/12/partidas/31/eliminar')).toEqual({ version: 2 });
    });
  });

  describe('comparación con la versión vigente', () => {
    const borrador = versionPresupuestoEjemplo({ id: 12, numero: 2, creadoPor: tomas });

    it('se ofrece solo si hay una vigente distinta de la versión mostrada; carga al abrir', async () => {
      const { api } = montar(sesionUsuario, {
        versiones: [borrador, vigente],
        detalle: detallePresupuestoEjemplo(borrador),
        extra: {
          'GET /api/presupuestos/12/comparacion': () => comparacionEjemplo(),
        },
      });
      const user = userEvent.setup();
      await esperarVersion(2);
      expect(api.veces('GET /api/presupuestos/12/comparacion')).toBe(0);

      await user.click(
        screen.getByRole('button', { name: /Comparar con la versión vigente \(versión 1\)/ }),
      );
      expect(await screen.findByText(/Versión 2 frente a la versión 1/)).toBeInTheDocument();
      expect(api.veces('GET /api/presupuestos/12/comparacion')).toBe(1);
      expect(
        api.llamadas.find((l) => l.clave === 'GET /api/presupuestos/12/comparacion')?.config.params,
      ).toBeUndefined();
      expect(screen.getByText('1 nuevas')).toBeInTheDocument();
      expect(screen.getByText('1 modificadas')).toBeInTheDocument();
      expect(screen.getByText('1 eliminadas')).toBeInTheDocument();

      const tabla = screen.getByRole('table', { name: 'Diferencias entre versiones' });
      expect(within(tabla).getByText('+$ 1.229.250')).toBeInTheDocument();
      expect(within(tabla).getByText('−$ 300.000')).toBeInTheDocument();
      // Por defecto solo las partidas con cambios.
      expect(within(tabla).queryByText('Muros')).not.toBeInTheDocument();
      await user.click(screen.getByLabelText('Mostrar solo las partidas con cambios'));
      expect(within(tabla).getByText('Muros')).toBeInTheDocument();
    });

    it('no se ofrece al mirar la propia versión vigente ni cuando no hay vigente', async () => {
      const { unmount } = montar(
        sesionUsuario,
        { versiones: [vigente], detalle: detallePresupuestoEjemplo(vigente) },
        '/obras/1?pestana=presupuesto&version=11',
      );
      await esperarVersion(1);
      expect(screen.queryByText(/Comparar con la versión vigente/)).not.toBeInTheDocument();
      unmount();

      montar(sesionUsuario, {
        versiones: [borrador],
        detalle: detallePresupuestoEjemplo(borrador),
      });
      await esperarVersion(2);
      expect(screen.queryByText(/Comparar con la versión vigente/)).not.toBeInTheDocument();
    });
  });
});
