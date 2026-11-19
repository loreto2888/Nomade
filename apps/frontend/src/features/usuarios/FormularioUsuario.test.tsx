import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { usuarioEjemplo } from '@/test/fixtures';
import { FormularioUsuario } from './FormularioUsuario';

function renderizar(props: Partial<Parameters<typeof FormularioUsuario>[0]> = {}) {
  const manejadores = {
    onCerrar: vi.fn(),
    onCreado: vi.fn(),
    onActualizado: vi.fn(),
    onConflicto: vi.fn(),
  };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <FormularioUsuario abierto usuarioActualId={1} {...manejadores} {...props} />
    </QueryClientProvider>,
  );
  return manejadores;
}

describe('FormularioUsuario', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exige correo válido y nombre de al menos 2 caracteres', async () => {
    const api = simularApi({});
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
    expect(await screen.findByText('Ingresa el correo.')).toBeInTheDocument();
    expect(screen.getByText('El nombre debe tener al menos 2 caracteres.')).toBeInTheDocument();
    expect(api.veces('POST /api/usuarios')).toBe(0);
  });

  it('crea con rol «usuario» por defecto y avisa el resultado', async () => {
    const creado = { usuario: usuarioEjemplo({ id: 7 }), claveTemporal: 'abcdEFGH12345678' };
    const api = simularApi({ 'POST /api/usuarios': () => creado });
    const user = userEvent.setup();
    const { onCreado } = renderizar();

    await user.type(screen.getByLabelText('Correo'), 'camila@nomade.cl');
    await user.type(screen.getByLabelText('Nombre'), 'Camila Rojas');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => expect(onCreado).toHaveBeenCalledWith(creado));
    expect(api.cuerpo('POST /api/usuarios')).toEqual({
      correo: 'camila@nomade.cl',
      nombre: 'Camila Rojas',
      rol: 'usuario',
    });
  });

  it('asigna errores de validación del servidor al campo correspondiente', async () => {
    simularApi({
      'POST /api/usuarios': () =>
        errorApi(400, 'VALIDACION', 'Los datos enviados no son válidos.', [
          { campo: 'correo', errores: ['Ingresa un correo válido.'] },
        ]),
    });
    const user = userEvent.setup();
    renderizar();

    await user.type(screen.getByLabelText('Correo'), 'a@b.cl');
    await user.type(screen.getByLabelText('Nombre'), 'Ana Ruiz');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
    expect(await screen.findByText('Ingresa un correo válido.')).toBeInTheDocument();
  });

  it('en edición precarga los datos y deshabilita el rol del propio administrador', () => {
    renderizar({
      usuario: usuarioEjemplo({
        id: 1,
        rol: 'admin',
        nombre: 'Ana Administradora',
        correo: 'admin@nomade.cl',
      }),
    });
    expect(screen.getByRole('dialog', { name: 'Editar usuario' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Administradora');
    expect(screen.getByRole('combobox', { name: 'Rol' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('en edición de otro usuario el rol se puede cambiar', async () => {
    const api = simularApi({
      'PATCH /api/usuarios/2': () => usuarioEjemplo({ rol: 'admin', version: 4 }),
    });
    const user = userEvent.setup();
    const { onActualizado } = renderizar({ usuario: usuarioEjemplo() });

    await user.click(screen.getByRole('combobox', { name: 'Rol' }));
    await user.click(await screen.findByRole('option', { name: 'Administrador' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onActualizado).toHaveBeenCalled());
    expect(api.cuerpo('PATCH /api/usuarios/2')).toMatchObject({ version: 3, rol: 'admin' });
  });

  it('el botón Cancelar cierra sin llamar a la API', async () => {
    const api = simularApi({});
    const user = userEvent.setup();
    const { onCerrar } = renderizar();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCerrar).toHaveBeenCalled();
    expect(api.llamadas).toHaveLength(0);
  });
});
