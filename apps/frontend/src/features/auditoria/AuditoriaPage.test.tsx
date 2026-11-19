import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EventoAuditoriaDto, PaginaAuditoriaDto } from '@/api/generated';
import { simularApi } from '@/test/api';
import { sesionAdmin, sesionUsuario } from '@/test/fixtures';
import { renderApp } from '@/test/utils';

const evento = (parcial: Partial<EventoAuditoriaDto> = {}): EventoAuditoriaDto => ({
  id: 10,
  ocurridoEn: '2026-11-19T12:30:00.000Z',
  usuarioId: 1,
  usuarioCorreo: 'admin@nomade.cl',
  usuarioNombre: 'Ana Administradora',
  accion: 'usuario.crear',
  entidad: 'usuario',
  entidadId: '12',
  antes: null,
  despues: { correo: 'camila@nomade.cl', rol: 'usuario' },
  motivo: null,
  ip: '10.0.0.5',
  idCorrelacion: 'abc',
  ...parcial,
});

const pagina: PaginaAuditoriaDto = {
  items: [
    evento(),
    evento({
      id: 9,
      usuarioId: null,
      usuarioNombre: null,
      usuarioCorreo: null,
      accion: 'auth.login_fallido',
      entidad: 'sesion',
      entidadId: null,
      despues: { correo: 'x@nomade.cl', motivo: 'correo_inexistente' },
    }),
    evento({
      id: 8,
      accion: 'usuario.desactivar',
      antes: { activo: true },
      despues: { activo: false },
      motivo: 'Dejó la empresa',
    }),
  ],
  total: 3,
  pagina: 1,
  tamanio: 25,
};

const CONSULTAR = 'GET /api/auditoria';

describe('AuditoriaPage (P26)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista la bitácora con acción, entidad y responsable', async () => {
    simularApi({ [CONSULTAR]: () => pagina });
    renderApp('/admin/auditoria', { sesion: sesionAdmin });

    const tabla = await screen.findByRole('grid');
    expect(await within(tabla).findByText('usuario.crear')).toBeInTheDocument();
    expect(within(tabla).getAllByText('usuario #12').length).toBeGreaterThan(0);
    expect(within(tabla).getAllByText('Ana Administradora').length).toBeGreaterThan(0);
    // Un intento de ingreso fallido no tiene actor.
    expect(within(tabla).getByText('Sin sesión')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Auditoría y bitácora' }),
    ).toBeInTheDocument();
  });

  it('es solo lectura: no ofrece crear, editar ni eliminar eventos', async () => {
    simularApi({ [CONSULTAR]: () => pagina });
    renderApp('/admin/auditoria', { sesion: sesionAdmin });
    await screen.findByText('usuario.crear');
    expect(
      screen.queryByRole('button', { name: /eliminar|editar|nuevo/i }),
    ).not.toBeInTheDocument();
  });

  it('pagina y filtra en el servidor', async () => {
    const api = simularApi({ [CONSULTAR]: () => pagina });
    const user = userEvent.setup();
    renderApp('/admin/auditoria', { sesion: sesionAdmin });
    await screen.findByText('usuario.crear');

    const urlInicial = api.llamadas[0].config.url ?? '';
    expect(urlInicial).toContain('pagina=1');
    expect(urlInicial).toContain('tamanio=25');

    await user.click(screen.getByRole('combobox', { name: 'Tipo de evento' }));
    await user.click(await screen.findByRole('option', { name: 'Accesos y sesiones' }));
    await waitFor(() =>
      expect([...api.llamadas].reverse()[0].config.url).toContain('accion=auth.'),
    );

    await user.type(screen.getByLabelText('Desde'), '2026-11-01');
    await waitFor(() =>
      expect([...api.llamadas].reverse()[0].config.url).toContain('desde=2026-11-01'),
    );

    await user.type(screen.getByLabelText('Buscar (acción, responsable, motivo)'), 'dejó');
    await waitFor(() => expect([...api.llamadas].reverse()[0].config.url).toMatch(/q=dej/));
  });

  it('muestra el detalle antes/después de un evento sin datos sensibles', async () => {
    simularApi({ [CONSULTAR]: () => pagina });
    const user = userEvent.setup();
    renderApp('/admin/auditoria', { sesion: sesionAdmin });
    await screen.findByText('usuario.desactivar');

    await user.click(screen.getByRole('button', { name: 'Ver detalle del evento 8' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Detalle del evento 8' });
    expect(within(dialogo).getByText('Motivo: Dejó la empresa')).toBeInTheDocument();
    expect(within(dialogo).getByText(/"activo": true/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/"activo": false/)).toBeInTheDocument();
  });

  it('el rol usuario no accede a la auditoría', async () => {
    const api = simularApi({ [CONSULTAR]: () => pagina });
    const { router } = renderApp('/admin/auditoria', { sesion: sesionUsuario });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(api.veces(CONSULTAR)).toBe(0);
  });
});
