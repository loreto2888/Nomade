import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaginaUsuariosDto } from '@/api/generated';
import { errorApi, simularApi } from '@/test/api';
import { sesionAdmin, usuarioEjemplo } from '@/test/fixtures';
import { renderApp } from '@/test/utils';

const admin = usuarioEjemplo({
  id: 1,
  correo: 'admin@nomade.cl',
  nombre: 'Ana Administradora',
  rol: 'admin',
  version: 5,
});
const camila = usuarioEjemplo();
const tomas = usuarioEjemplo({
  id: 3,
  correo: 'tomas@nomade.cl',
  nombre: 'Tomás Silva',
  activo: false,
  debeCambiarClave: false,
  version: 2,
});
const pendiente = usuarioEjemplo({
  id: 4,
  correo: 'nuevo@nomade.cl',
  nombre: 'Nuevo Ingreso',
  debeCambiarClave: true,
  ultimoAccesoEn: null,
  version: 1,
});

const pagina = (items = [admin, camila, tomas, pendiente]): PaginaUsuariosDto => ({
  items,
  total: items.length,
  pagina: 1,
  tamanio: 25,
});

const LISTAR = 'GET /api/usuarios';

async function abrirPagina(manejadores: Parameters<typeof simularApi>[0] = {}) {
  const api = simularApi({ [LISTAR]: () => pagina(), ...manejadores });
  const user = userEvent.setup();
  const utilidades = renderApp('/admin/usuarios', { sesion: sesionAdmin });
  expect(await screen.findByText('Camila Rojas')).toBeInTheDocument();
  return { api, user, ...utilidades };
}

async function abrirMenu(user: ReturnType<typeof userEvent.setup>, nombre: string) {
  await user.click(await screen.findByRole('button', { name: `Acciones de ${nombre}` }));
  return screen.findByRole('menu');
}

describe('UsuariosPage (P25)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista los usuarios con rol y estado', async () => {
    await abrirPagina();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Usuarios y permisos' }),
    ).toBeInTheDocument();
    const tabla = screen.getByRole('grid');
    expect(within(tabla).getByText('admin@nomade.cl')).toBeInTheDocument();
    expect(within(tabla).getByText('Tomás Silva')).toBeInTheDocument();
    expect(within(tabla).getAllByText('Administrador')).toHaveLength(1);
    expect(within(tabla).getAllByText('Activo').length).toBeGreaterThan(0);
    expect(within(tabla).getByText('Desactivado')).toBeInTheDocument();
    expect(within(tabla).getByText('Cambio de clave pendiente')).toBeInTheDocument();
  });

  it('consulta con paginación del servidor y filtros', async () => {
    const { api, user } = await abrirPagina();
    const primera = api.llamadas.find((l) => l.clave === LISTAR)?.config.url ?? '';
    expect(primera).toContain('pagina=1');
    expect(primera).toContain('tamanio=25');

    await user.type(screen.getByLabelText('Buscar por nombre o correo'), 'cami');
    await waitFor(() => {
      const ultima = [...api.llamadas].reverse().find((l) => l.clave === LISTAR)?.config.url ?? '';
      expect(ultima).toContain('q=cami');
    });

    await user.click(screen.getByRole('combobox', { name: 'Estado' }));
    await user.click(await screen.findByRole('option', { name: 'Desactivados' }));
    await waitFor(() => {
      const ultima = [...api.llamadas].reverse().find((l) => l.clave === LISTAR)?.config.url ?? '';
      expect(ultima).toContain('activo=false');
    });
  });

  it('muestra un error con opción de reintentar si la consulta falla', async () => {
    simularApi({
      [LISTAR]: () =>
        errorApi(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Intenta nuevamente.'),
    });
    renderApp('/admin/usuarios', { sesion: sesionAdmin });
    expect(
      await screen.findByText('Ocurrió un error inesperado. Intenta nuevamente.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  describe('alta', () => {
    it('valida el formulario y no llama a la API si es inválido', async () => {
      const { api, user } = await abrirPagina();
      await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Nuevo usuario' });

      await user.type(within(dialogo).getByLabelText('Correo'), 'no-es-correo');
      await user.type(within(dialogo).getByLabelText('Nombre'), 'A');
      await user.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }));

      expect(await within(dialogo).findByText('Ingresa un correo válido.')).toBeInTheDocument();
      expect(
        within(dialogo).getByText('El nombre debe tener al menos 2 caracteres.'),
      ).toBeInTheDocument();
      expect(api.veces('POST /api/usuarios')).toBe(0);
    });

    it('crea el usuario y muestra una sola vez la contraseña temporal', async () => {
      const creado = usuarioEjemplo({
        id: 9,
        correo: 'beatriz@nomade.cl',
        nombre: 'Beatriz Mora',
        rol: 'admin',
        version: 1,
      });
      const { api, user } = await abrirPagina({
        'POST /api/usuarios': () => ({ usuario: creado, claveTemporal: 'Hq7mXk2pLw9RtNv4' }),
      });
      await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Nuevo usuario' });

      await user.type(within(dialogo).getByLabelText('Correo'), '  Beatriz@Nomade.cl ');
      await user.type(within(dialogo).getByLabelText('Nombre'), 'Beatriz Mora');
      await user.click(within(dialogo).getByRole('combobox', { name: 'Rol' }));
      await user.click(await screen.findByRole('option', { name: 'Administrador' }));
      await user.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }));

      const clave = await screen.findByRole('dialog', { name: 'Contraseña temporal' });
      expect(within(clave).getByDisplayValue('Hq7mXk2pLw9RtNv4')).toBeInTheDocument();
      expect(within(clave).getByText(/Beatriz Mora/)).toBeInTheDocument();
      expect(api.cuerpo('POST /api/usuarios')).toEqual({
        correo: 'beatriz@nomade.cl',
        nombre: 'Beatriz Mora',
        rol: 'admin',
      });
      // La contraseña no queda en pantalla tras cerrar el diálogo.
      await user.click(within(clave).getByRole('button', { name: 'Listo' }));
      await waitFor(() =>
        expect(screen.queryByDisplayValue('Hq7mXk2pLw9RtNv4')).not.toBeInTheDocument(),
      );
    });

    it('muestra el error del servidor (correo duplicado)', async () => {
      const { user } = await abrirPagina({
        'POST /api/usuarios': () =>
          errorApi(409, 'CORREO_DUPLICADO', 'Ya existe un usuario con ese correo.'),
      });
      await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Nuevo usuario' });
      await user.type(within(dialogo).getByLabelText('Correo'), 'camila@nomade.cl');
      await user.type(within(dialogo).getByLabelText('Nombre'), 'Camila Rojas');
      await user.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }));

      expect(
        await within(dialogo).findByText('Ya existe un usuario con ese correo.'),
      ).toBeInTheDocument();
    });
  });

  describe('edición', () => {
    it('envía la versión cargada para el control optimista', async () => {
      const { api, user } = await abrirPagina({
        'PATCH /api/usuarios/2': () => ({ ...camila, nombre: 'Camila R.', version: 4 }),
      });
      await user.click(
        within(await abrirMenu(user, 'Camila Rojas')).getByRole('menuitem', { name: 'Editar' }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Editar usuario' });
      expect(within(dialogo).getByLabelText('Correo')).toHaveValue('camila@nomade.cl');

      await user.clear(within(dialogo).getByLabelText('Nombre'));
      await user.type(within(dialogo).getByLabelText('Nombre'), 'Camila R.');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() =>
        expect(api.cuerpo('PATCH /api/usuarios/2')).toEqual({
          version: 3,
          correo: 'camila@nomade.cl',
          nombre: 'Camila R.',
          rol: 'usuario',
        }),
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Editar usuario' })).not.toBeInTheDocument(),
      );
    });

    it('ante un 409 de versión avisa y permite recargar los datos', async () => {
      const { api, user } = await abrirPagina({
        'PATCH /api/usuarios/2': () =>
          errorApi(
            409,
            'CONFLICTO_VERSION',
            'El registro fue modificado por otra persona. Recarga y reintenta.',
            [{ versionActual: 4 }],
          ),
      });
      await user.click(
        within(await abrirMenu(user, 'Camila Rojas')).getByRole('menuitem', { name: 'Editar' }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Editar usuario' });
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

      expect(
        await within(dialogo).findByText(/Otra persona modificó este usuario/),
      ).toBeInTheDocument();
      const antes = api.veces(LISTAR);
      await user.click(within(dialogo).getByRole('button', { name: 'Recargar datos' }));
      await waitFor(() => expect(api.veces(LISTAR)).toBeGreaterThan(antes));
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Editar usuario' })).not.toBeInTheDocument(),
      );
    });

    it('un admin no puede quitarse a sí mismo el rol', async () => {
      const { user } = await abrirPagina();
      await user.click(
        within(await abrirMenu(user, 'Ana Administradora')).getByRole('menuitem', {
          name: 'Editar',
        }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Editar usuario' });
      expect(within(dialogo).getByRole('combobox', { name: 'Rol' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(
        within(dialogo).getByText('No puedes quitarte a ti mismo el rol de administrador.'),
      ).toBeInTheDocument();
    });
  });

  describe('desactivar, reactivar y restablecer contraseña', () => {
    it('desactiva con motivo (nunca elimina) y envía la versión', async () => {
      const { api, user } = await abrirPagina({
        'POST /api/usuarios/2/desactivar': () => ({ ...camila, activo: false, version: 4 }),
      });
      await user.click(
        within(await abrirMenu(user, 'Camila Rojas')).getByRole('menuitem', { name: 'Desactivar' }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Desactivar usuario' });
      expect(within(dialogo).getByText(/La cuenta no se elimina/)).toBeInTheDocument();

      await user.type(within(dialogo).getByLabelText('Motivo (opcional)'), 'Dejó la empresa');
      await user.click(within(dialogo).getByRole('button', { name: 'Desactivar' }));

      await waitFor(() =>
        expect(api.cuerpo('POST /api/usuarios/2/desactivar')).toEqual({
          version: 3,
          motivo: 'Dejó la empresa',
        }),
      );
      expect(screen.queryByText(/Eliminar/i)).not.toBeInTheDocument();
    });

    it('el administrador no puede desactivarse a sí mismo', async () => {
      const { user } = await abrirPagina();
      const menu = await abrirMenu(user, 'Ana Administradora');
      expect(within(menu).getByRole('menuitem', { name: /Desactivar/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('muestra el error de regla de negocio (último administrador)', async () => {
      const { user } = await abrirPagina({
        'POST /api/usuarios/2/desactivar': () =>
          errorApi(422, 'ULTIMO_ADMIN', 'Debe existir al menos un administrador activo.'),
      });
      await user.click(
        within(await abrirMenu(user, 'Camila Rojas')).getByRole('menuitem', { name: 'Desactivar' }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Desactivar usuario' });
      await user.click(within(dialogo).getByRole('button', { name: 'Desactivar' }));
      expect(
        await within(dialogo).findByText('Debe existir al menos un administrador activo.'),
      ).toBeInTheDocument();
    });

    it('reactiva una cuenta desactivada', async () => {
      const { api, user } = await abrirPagina({
        'POST /api/usuarios/3/activar': () => ({ ...tomas, activo: true, version: 3 }),
      });
      const menu = await abrirMenu(user, 'Tomás Silva');
      expect(within(menu).queryByRole('menuitem', { name: 'Desactivar' })).not.toBeInTheDocument();
      await user.click(within(menu).getByRole('menuitem', { name: 'Reactivar' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Reactivar usuario' });
      await user.click(within(dialogo).getByRole('button', { name: 'Reactivar' }));
      await waitFor(() =>
        expect(api.cuerpo('POST /api/usuarios/3/activar')).toEqual({ version: 2 }),
      );
    });

    it('restablece la contraseña y muestra la temporal una sola vez', async () => {
      const { api, user } = await abrirPagina({
        'POST /api/usuarios/2/restablecer-clave': () => ({
          usuario: { ...camila, debeCambiarClave: true, version: 4 },
          claveTemporal: 'Zx9Qw3Er5Ty7Ui1O',
        }),
      });
      await user.click(
        within(await abrirMenu(user, 'Camila Rojas')).getByRole('menuitem', {
          name: 'Restablecer contraseña',
        }),
      );
      const confirmacion = await screen.findByRole('dialog', { name: 'Restablecer contraseña' });
      await user.click(within(confirmacion).getByRole('button', { name: 'Restablecer' }));

      const clave = await screen.findByRole('dialog', { name: 'Contraseña temporal' });
      expect(within(clave).getByDisplayValue('Zx9Qw3Er5Ty7Ui1O')).toBeInTheDocument();
      expect(api.cuerpo('POST /api/usuarios/2/restablecer-clave')).toEqual({ version: 3 });
    });
  });
});
