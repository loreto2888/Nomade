import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { proveedorEjemplo } from '@/test/fixtures';
import { FormularioProveedor } from './FormularioProveedor';

function renderizar(props: Partial<Parameters<typeof FormularioProveedor>[0]> = {}) {
  const acciones = { onCerrar: vi.fn(), onGuardado: vi.fn(), onConflicto: vi.fn() };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <FormularioProveedor abierto {...acciones} {...props} />
    </QueryClientProvider>,
  );
  return acciones;
}

describe('FormularioProveedor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no muestra campos de datos bancarios (se administran aparte, solo admin)', () => {
    simularApi({});
    renderizar();
    expect(screen.getByRole('dialog', { name: 'Nuevo proveedor' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/cuenta/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/banco/i)).not.toBeInTheDocument();
  });

  it('valida el RUT con módulo 11 antes de enviar', async () => {
    const api = simularApi({});
    const user = userEvent.setup();
    renderizar();
    await user.type(screen.getByLabelText(/RUT/), '111111112');
    await user.type(screen.getByLabelText(/Razón social/), 'Materiales Cordillera SpA');
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }));
    expect(await screen.findAllByText('Ingresa un RUT válido.')).not.toHaveLength(0);
    expect(api.veces('POST /api/proveedores')).toBe(0);
  });

  it('crea un proveedor y avisa el resultado', async () => {
    const creado = proveedorEjemplo();
    const api = simularApi({ 'POST /api/proveedores': () => creado });
    const user = userEvent.setup();
    const { onGuardado } = renderizar();

    await user.type(screen.getByLabelText(/RUT/), '111111111');
    await user.type(screen.getByLabelText(/Razón social/), 'Materiales Cordillera SpA');
    await user.type(screen.getByLabelText('Contacto'), 'Juan Pérez');
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledWith(creado, true));
    expect(api.cuerpo('POST /api/proveedores')).toMatchObject({
      rut: '11111111-1',
      razonSocial: 'Materiales Cordillera SpA',
      contactoNombre: 'Juan Pérez',
    });
  });

  it('en edición envía la versión y muestra el RUT duplicado en su campo', async () => {
    const api = simularApi({
      'PATCH /api/proveedores/12': () =>
        errorApi(409, 'RUT_DUPLICADO', 'Ya existe un proveedor con ese RUT.'),
    });
    const user = userEvent.setup();
    renderizar({ proveedor: proveedorEjemplo({ version: 6 }) });

    expect(screen.getByRole('dialog', { name: 'Editar proveedor' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Ya existe un proveedor con ese RUT.')).toBeInTheDocument();
    expect(api.cuerpo('PATCH /api/proveedores/12')).toMatchObject({ version: 6 });
  });
});
