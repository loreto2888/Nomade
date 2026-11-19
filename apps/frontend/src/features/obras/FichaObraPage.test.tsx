import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { adjuntoEjemplo, obraEjemplo, resumenEjemplo, sesionUsuario } from '@/test/fixtures';
import { renderApp } from '@/test/utils';
import { PESTANAS_OBRA, pestanaValida } from './pestanas';

const base = (resumen = resumenEjemplo()) => ({
  'GET /api/obras/1/resumen': () => resumen,
  'GET /api/adjuntos': () => [adjuntoEjemplo()],
});

describe('FichaObraPage (P05)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el encabezado con estado y la pestaña Resumen con los datos de la obra', async () => {
    simularApi(base());
    renderApp('/obras/1', { sesion: sesionUsuario });

    expect(await screen.findByRole('heading', { name: 'Local Parque Norte' })).toBeInTheDocument();
    expect(screen.getByText('CC-001 · Grupo Andino SpA')).toBeInTheDocument();
    const resumen = screen.getByRole('tabpanel');
    expect(within(resumen).getByText('Camila Rojas')).toBeInTheDocument();
    expect(within(resumen).getByText('RUT 76.086.428-5')).toBeInTheDocument();
    expect(within(resumen).getByText('Monto del contrato (CLP)')).toBeInTheDocument();
    expect(within(resumen).getAllByText('$ 185.000.000').length).toBeGreaterThan(0);
    // Adjuntos de la obra (AttachmentUploader).
    expect(
      await within(resumen).findByRole('link', { name: /Contrato firmado\.pdf/ }),
    ).toBeInTheDocument();
  });

  it('un contrato en UF muestra la fotografía de la conversión y el equivalente de hoy', async () => {
    simularApi(
      base(
        resumenEjemplo({
          obra: obraEjemplo({
            monedaContrato: 'UF',
            montoContrato: 4710.5,
            montoContratoClp: 185_051_386,
            fechaValorUf: '2026-11-10',
            valorUf: 39_284.8712,
          }),
          montoContratoClpHoy: 190_000_000,
          valorUfHoy: { fecha: '2026-11-19', valor: 40_000 },
        }),
      ),
    );
    renderApp('/obras/1', { sesion: sesionUsuario });

    const resumen = await screen.findByRole('tabpanel');
    expect(within(resumen).getByText('UF 4.710,50')).toBeInTheDocument();
    expect(within(resumen).getByText('$ 185.051.386')).toBeInTheDocument();
    expect(within(resumen).getByText(/Al valor de la UF del/)).toBeInTheDocument();
    expect(within(resumen).getByText('$ 190.000.000')).toBeInTheDocument();
    expect(within(resumen).getByText(/UF de hoy: \$ 40\.000/)).toBeInTheDocument();
  });

  it('solo Resumen y Presupuesto están implementadas; el resto figura como pendiente y explica qué incluirá', async () => {
    simularApi(base());
    const user = userEvent.setup();
    renderApp('/obras/1', { sesion: sesionUsuario });
    await screen.findByRole('heading', { name: 'Local Parque Norte' });

    const pestanas = screen.getAllByRole('tab');
    expect(pestanas.map((t) => t.textContent?.replace('Pendiente', ''))).toEqual(
      PESTANAS_OBRA.map((p) => p.etiqueta),
    );
    for (const pestana of pestanas.slice(0, 2)) {
      expect(within(pestana).queryByText('Pendiente')).not.toBeInTheDocument();
    }
    for (const pestana of pestanas.slice(2)) {
      expect(within(pestana).getByText('Pendiente')).toBeInTheDocument();
    }

    await user.click(screen.getByRole('tab', { name: /Compras/ }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('heading', { name: 'Compras: pendiente' })).toBeInTheDocument();
    expect(within(panel).getByText(/fase 4/)).toBeInTheDocument();
  });

  it('la pestaña queda en la URL (?pestana=) y se respeta al abrir el enlace', async () => {
    simularApi(base());
    const user = userEvent.setup();
    const { router } = renderApp('/obras/1?pestana=cierre', { sesion: sesionUsuario });
    expect(await screen.findByRole('heading', { name: 'Cierre: pendiente' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Resumen/ }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Datos generales');
  });

  it('pestanaValida cae en «resumen» si el valor no existe', () => {
    expect(pestanaValida('compras')).toBe('compras');
    expect(pestanaValida('inventada')).toBe('resumen');
    expect(pestanaValida(null)).toBe('resumen');
  });

  it('«Editar» lleva a la edición; no se puede editar una obra cerrada', async () => {
    simularApi(base());
    renderApp('/obras/1', { sesion: sesionUsuario });
    expect(await screen.findByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      '/obras/1/editar',
    );
  });

  it('una obra cerrada deshabilita Editar y los adjuntos quedan de solo lectura', async () => {
    simularApi(
      base(
        resumenEjemplo({
          obra: obraEjemplo({ estado: { id: 5, codigo: 'cerrada', nombre: 'Cerrada' } }),
        }),
      ),
    );
    renderApp('/obras/1', { sesion: sesionUsuario });
    await screen.findByRole('heading', { name: 'Local Parque Norte' });
    expect(screen.getByText('Editar').closest('a')).toHaveAttribute('aria-disabled', 'true');
    expect(await screen.findByRole('link', { name: /Contrato firmado/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjuntar archivo' })).not.toBeInTheDocument();
  });

  it('solo una obra en preparación ofrece «Eliminar»; al confirmar vuelve al listado', async () => {
    const api = simularApi({
      ...base(
        resumenEjemplo({
          obra: obraEjemplo({
            estado: { id: 1, codigo: 'en_preparacion', nombre: 'En preparación' },
          }),
        }),
      ),
      'POST /api/obras/1/eliminar': () => undefined,
      'GET /api/obras': () => ({ items: [], total: 0, pagina: 1, tamanio: 25 }),
      'GET /api/catalogos/estado_obra': () => [],
    });
    const user = userEvent.setup();
    const { router } = renderApp('/obras/1', { sesion: sesionUsuario });

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Eliminar obra' })).getByRole('button', {
        name: 'Eliminar',
      }),
    );

    await waitFor(() => expect(api.veces('POST /api/obras/1/eliminar')).toBe(1));
    await waitFor(() => expect(router.state.location.pathname).toBe('/obras'));
  });

  it('una obra activa no ofrece «Eliminar»', async () => {
    simularApi(base());
    renderApp('/obras/1', { sesion: sesionUsuario });
    await screen.findByRole('heading', { name: 'Local Parque Norte' });
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });

  it('si la obra no existe, lo informa', async () => {
    simularApi({
      'GET /api/obras/1/resumen': () => errorApi(404, 'OBRA_NO_ENCONTRADA', 'La obra no existe.'),
    });
    renderApp('/obras/1', { sesion: sesionUsuario });
    expect(await screen.findByText('La obra no existe o fue eliminada.')).toBeInTheDocument();
  });

  it('un identificador inválido en la URL muestra el mismo aviso sin consultar', async () => {
    const api = simularApi({});
    renderApp('/obras/abc', { sesion: sesionUsuario });
    expect(await screen.findByText('La obra no existe o fue eliminada.')).toBeInTheDocument();
    expect(api.llamadas).toHaveLength(0);
  });
});
