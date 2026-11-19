import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { cuentaEjemplo, proveedorEjemplo, sesionAdmin, sesionUsuario } from '@/test/fixtures';
import { renderApp } from '@/test/utils';

const conCuentas = proveedorEjemplo({ tieneDatosBancarios: true });
const sinCuentas = proveedorEjemplo({
  id: 13,
  rut: '76086428-5',
  razonSocial: 'Instalaciones Sur Ltda.',
});
const pagina = { items: [conCuentas, sinCuentas], total: 2, pagina: 1, tamanio: 25 };

async function abrirMenu(user: ReturnType<typeof userEvent.setup>, proveedor: string) {
  await user.click(await screen.findByRole('button', { name: `Acciones de ${proveedor}` }));
  return screen.findByRole('menu');
}

describe('ProveedoresPage (P22)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista proveedores con su RUT formateado e indica si tienen datos bancarios', async () => {
    simularApi({ 'GET /api/proveedores': () => pagina });
    renderApp('/proveedores', { sesion: sesionAdmin });

    const tabla = await screen.findByRole('grid');
    expect(await within(tabla).findByText('Materiales Cordillera SpA')).toBeInTheDocument();
    expect(within(tabla).getByText('11.111.111-1')).toBeInTheDocument();
    expect(within(tabla).getByText('Registrados')).toBeInTheDocument();
    expect(within(tabla).getByText('Sin registrar')).toBeInTheDocument();
  });

  it('el administrador ve «Datos bancarios» y abre las cuentas (consulta auditada en el servidor)', async () => {
    const api = simularApi({
      'GET /api/proveedores': () => pagina,
      'GET /api/proveedores/12/cuentas-bancarias': () => [
        cuentaEjemplo(),
        cuentaEjemplo({ id: 5, numeroCuenta: '98765432', banco: 'Banco Estado', principal: false }),
      ],
    });
    const user = userEvent.setup();
    renderApp('/proveedores', { sesion: sesionAdmin });

    const menu = await abrirMenu(user, 'Materiales Cordillera SpA');
    await user.click(within(menu).getByRole('menuitem', { name: 'Datos bancarios' }));

    const dialogo = await screen.findByRole('dialog', {
      name: /Datos bancarios · Materiales Cordillera SpA/,
    });
    expect(
      within(dialogo).getByText(/Cada consulta y\s+cada cambio queda registrado/),
    ).toBeInTheDocument();
    expect(await within(dialogo).findByText(/0012345678/)).toBeInTheDocument();
    expect(within(dialogo).getByText('Principal')).toBeInTheDocument();
    expect(within(dialogo).getByText(/98765432/)).toBeInTheDocument();
    expect(api.veces('GET /api/proveedores/12/cuentas-bancarias')).toBe(1);
  });

  it('el rol usuario NO ve la opción de datos bancarios ni consulta las cuentas', async () => {
    const api = simularApi({ 'GET /api/proveedores': () => pagina });
    const user = userEvent.setup();
    renderApp('/proveedores', { sesion: sesionUsuario });

    const menu = await abrirMenu(user, 'Materiales Cordillera SpA');
    expect(
      within(menu).queryByRole('menuitem', { name: 'Datos bancarios' }),
    ).not.toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(api.llamadas.some((l) => l.clave.includes('cuentas-bancarias'))).toBe(false);
  });

  it('el administrador agrega una cuenta bancaria', async () => {
    let cuentas = [cuentaEjemplo()];
    const api = simularApi({
      'GET /api/proveedores': () => pagina,
      'GET /api/proveedores/12/cuentas-bancarias': () => cuentas,
      'POST /api/proveedores/12/cuentas-bancarias': () => {
        const nueva = cuentaEjemplo({
          id: 6,
          banco: 'Banco Estado',
          tipoCuenta: 'vista',
          numeroCuenta: '98765432',
          principal: false,
        });
        cuentas = [...cuentas, nueva];
        return nueva;
      },
    });
    const user = userEvent.setup();
    renderApp('/proveedores', { sesion: sesionAdmin });

    await user.click(
      within(await abrirMenu(user, 'Materiales Cordillera SpA')).getByRole('menuitem', {
        name: 'Datos bancarios',
      }),
    );
    const dialogo = await screen.findByRole('dialog', { name: /Datos bancarios/ });
    await within(dialogo).findByText(/0012345678/);
    await user.click(within(dialogo).getByRole('button', { name: 'Agregar cuenta' }));

    const formulario = await screen.findByRole('dialog', { name: 'Nueva cuenta bancaria' });
    await user.type(within(formulario).getByLabelText(/^Banco/), 'Banco Estado');
    await user.type(within(formulario).getByLabelText(/Número de cuenta/), '9876-5432');
    await user.type(within(formulario).getByLabelText(/^Titular/), 'Materiales Cordillera SpA');
    await user.type(within(formulario).getByLabelText(/RUT del titular/), '111111111');
    await user.click(within(formulario).getByRole('button', { name: 'Agregar cuenta' }));

    await waitFor(() => expect(api.veces('POST /api/proveedores/12/cuentas-bancarias')).toBe(1));
    expect(api.cuerpo('POST /api/proveedores/12/cuentas-bancarias')).toMatchObject({
      banco: 'Banco Estado',
      tipoCuenta: 'corriente',
      numeroCuenta: '98765432',
      titularRut: '11111111-1',
      principal: false,
    });
    expect(await within(dialogo).findByText(/98765432/)).toBeInTheDocument();
  });

  it('si el servidor responde 403 al consultar las cuentas, lo muestra', async () => {
    simularApi({
      'GET /api/proveedores': () => pagina,
      'GET /api/proveedores/12/cuentas-bancarias': () =>
        errorApi(403, 'PROHIBIDO', 'No tienes permiso para realizar esta acción.'),
    });
    const user = userEvent.setup();
    renderApp('/proveedores', { sesion: sesionAdmin });
    await user.click(
      within(await abrirMenu(user, 'Materiales Cordillera SpA')).getByRole('menuitem', {
        name: 'Datos bancarios',
      }),
    );
    expect(
      await screen.findByText('No tienes permiso para realizar esta acción.'),
    ).toBeInTheDocument();
  });

  it('elimina un proveedor tras confirmar', async () => {
    const api = simularApi({
      'GET /api/proveedores': () => pagina,
      'POST /api/proveedores/13/eliminar': () => undefined,
    });
    const user = userEvent.setup();
    renderApp('/proveedores', { sesion: sesionUsuario });

    await user.click(
      within(await abrirMenu(user, 'Instalaciones Sur Ltda.')).getByRole('menuitem', {
        name: 'Eliminar',
      }),
    );
    const dialogo = await screen.findByRole('dialog', { name: 'Eliminar proveedor' });
    await user.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(api.veces('POST /api/proveedores/13/eliminar')).toBe(1));
    expect(api.cuerpo('POST /api/proveedores/13/eliminar')).toMatchObject({ version: 2 });
  });

  it('muestra el error del listado con opción de reintentar', async () => {
    simularApi({
      'GET /api/proveedores': () =>
        errorApi(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Intenta nuevamente.'),
    });
    renderApp('/proveedores', { sesion: sesionUsuario });
    expect(
      await screen.findByText('Ocurrió un error inesperado. Intenta nuevamente.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
