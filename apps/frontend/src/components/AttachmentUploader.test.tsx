import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { adjuntoEjemplo } from '@/test/fixtures';
import { AttachmentUploader } from './AttachmentUploader';

const LISTA = 'GET /api/adjuntos';

function renderizar(props: Partial<Parameters<typeof AttachmentUploader>[0]> = {}) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <AttachmentUploader entidadTipo="obra" entidadId={1} {...props} />
    </QueryClientProvider>,
  );
}

const archivo = (nombre: string, contenido = 'contenido', tipo = 'application/pdf') =>
  new File([contenido], nombre, { type: tipo });

describe('AttachmentUploader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista los adjuntos con enlace de descarga, tamaño y fecha', async () => {
    simularApi({
      [LISTA]: () => [
        adjuntoEjemplo(),
        adjuntoEjemplo({ id: 10, nombreOriginal: 'Plano.png', tamanioBytes: 2048 }),
      ],
    });
    renderizar();

    const enlace = await screen.findByRole('link', { name: /Contrato firmado\.pdf/ });
    expect(enlace).toHaveAttribute('href', '/api/adjuntos/9/descargar');
    expect(enlace).toHaveAttribute('download', 'Contrato firmado.pdf');
    expect(screen.getByText(/471 KB/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Plano\.png/ })).toHaveAttribute(
      'href',
      '/api/adjuntos/10/descargar',
    );
  });

  it('pide los adjuntos de la entidad correcta', async () => {
    const api = simularApi({ [LISTA]: () => [] });
    renderizar({ entidadTipo: 'proveedor', entidadId: 7 });
    expect(await screen.findByText('Aún no hay archivos adjuntos.')).toBeInTheDocument();
    expect(api.llamadas[0].config.url).toMatch(/entidadTipo=proveedor/);
    expect(api.llamadas[0].config.url).toMatch(/entidadId=7/);
  });

  it('sube un archivo permitido enviando tipo y entidad, y refresca la lista', async () => {
    let lista = [adjuntoEjemplo()];
    const api = simularApi({
      [LISTA]: () => lista,
      'POST /api/adjuntos': () => {
        lista = [adjuntoEjemplo({ id: 11, nombreOriginal: 'Cotización.xlsx' }), ...lista];
        return lista[0];
      },
    });
    const user = userEvent.setup();
    renderizar();
    await screen.findByRole('link', { name: /Contrato firmado/ });

    await user.upload(
      screen.getByLabelText('Archivo a adjuntar'),
      archivo('Cotización.xlsx', 'x', 'application/vnd.ms-excel'),
    );

    expect(await screen.findByRole('link', { name: /Cotización\.xlsx/ })).toBeInTheDocument();
    expect(api.veces('POST /api/adjuntos')).toBe(1);
    const cuerpo = api.llamadas.find((l) => l.clave === 'POST /api/adjuntos')!.config
      .data as FormData;
    expect(cuerpo.get('entidadTipo')).toBe('obra');
    expect(cuerpo.get('entidadId')).toBe('1');
    expect((cuerpo.get('archivo') as File).name).toBe('Cotización.xlsx');
  });

  it('rechaza en el navegador los tipos no permitidos sin llamar al servidor', async () => {
    const api = simularApi({ [LISTA]: () => [] });
    const user = userEvent.setup({ applyAccept: false });
    renderizar();
    await screen.findByText('Aún no hay archivos adjuntos.');

    await user.upload(
      screen.getByLabelText('Archivo a adjuntar'),
      archivo('virus.exe', 'x', 'application/x-msdownload'),
    );

    expect(await screen.findByText(/Tipo de archivo no permitido/)).toBeInTheDocument();
    expect(api.veces('POST /api/adjuntos')).toBe(0);
  });

  it('rechaza archivos de más de 20 MB sin llamar al servidor', async () => {
    const api = simularApi({ [LISTA]: () => [] });
    const user = userEvent.setup();
    renderizar();
    await screen.findByText('Aún no hay archivos adjuntos.');

    const grande = archivo('grande.pdf');
    Object.defineProperty(grande, 'size', { value: 21 * 1024 * 1024 });
    await user.upload(screen.getByLabelText('Archivo a adjuntar'), grande);

    expect(await screen.findByText('El archivo supera el máximo de 20 MB.')).toBeInTheDocument();
    expect(api.veces('POST /api/adjuntos')).toBe(0);
  });

  it('muestra el error del servidor (p. ej. contenido que no corresponde al tipo)', async () => {
    simularApi({
      [LISTA]: () => [],
      'POST /api/adjuntos': () =>
        errorApi(
          415,
          'CONTENIDO_NO_COINCIDE',
          'El contenido del archivo no corresponde a un .pdf válido.',
        ),
    });
    const user = userEvent.setup();
    renderizar();
    await screen.findByText('Aún no hay archivos adjuntos.');

    await user.upload(screen.getByLabelText('Archivo a adjuntar'), archivo('falso.pdf'));
    expect(
      await screen.findByText('El contenido del archivo no corresponde a un .pdf válido.'),
    ).toBeInTheDocument();
  });

  it('elimina un adjunto tras confirmar, con motivo opcional', async () => {
    let lista = [adjuntoEjemplo()];
    const api = simularApi({
      [LISTA]: () => lista,
      'POST /api/adjuntos/9/eliminar': () => {
        lista = [];
        return undefined;
      },
    });
    const user = userEvent.setup();
    renderizar();

    await user.click(await screen.findByRole('button', { name: 'Eliminar Contrato firmado.pdf' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Eliminar adjunto' });
    await user.type(within(dialogo).getByLabelText(/Motivo/), 'Archivo equivocado');
    await user.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(api.veces('POST /api/adjuntos/9/eliminar')).toBe(1));
    expect(api.cuerpo('POST /api/adjuntos/9/eliminar')).toEqual({ motivo: 'Archivo equivocado' });
    expect(await screen.findByText('Aún no hay archivos adjuntos.')).toBeInTheDocument();
  });

  it('en modo solo lectura no ofrece subir ni eliminar', async () => {
    simularApi({ [LISTA]: () => [adjuntoEjemplo()] });
    renderizar({ soloLectura: true });
    await screen.findByRole('link', { name: /Contrato firmado/ });
    expect(screen.queryByRole('button', { name: 'Adjuntar archivo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
  });

  it('si falla la carga de la lista, permite reintentar', async () => {
    simularApi({
      [LISTA]: () =>
        errorApi(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Intenta nuevamente.'),
    });
    renderizar();
    expect(
      await screen.findByText('Ocurrió un error inesperado. Intenta nuevamente.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
