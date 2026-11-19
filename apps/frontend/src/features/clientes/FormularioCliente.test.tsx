import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { clienteEjemplo } from '@/test/fixtures';
import { FormularioCliente } from './FormularioCliente';

function renderizar(props: Partial<Parameters<typeof FormularioCliente>[0]> = {}) {
  const acciones = { onCerrar: vi.fn(), onGuardado: vi.fn(), onConflicto: vi.fn() };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <FormularioCliente abierto {...acciones} {...props} />
    </QueryClientProvider>,
  );
  return acciones;
}

describe('FormularioCliente', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exige RUT válido (módulo 11) y razón social', async () => {
    const api = simularApi({});
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));
    expect(await screen.findByText('Ingresa el RUT.')).toBeInTheDocument();
    expect(
      screen.getByText('La razón social debe tener al menos 2 caracteres.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/RUT/), '76086428-9');
    await user.type(screen.getByLabelText(/Razón social/), 'Grupo Andino SpA');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));
    expect(await screen.findAllByText('Ingresa un RUT válido.')).not.toHaveLength(0);
    expect(api.veces('POST /api/clientes')).toBe(0);
  });

  it('valida correo y teléfono opcionales', async () => {
    simularApi({});
    const user = userEvent.setup();
    renderizar();
    await user.type(screen.getByLabelText(/RUT/), '760864285');
    await user.type(screen.getByLabelText(/Razón social/), 'Grupo Andino SpA');
    await user.type(screen.getByLabelText('Correo'), 'no-es-correo');
    await user.type(screen.getByLabelText('Teléfono'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));
    expect(await screen.findByText('Ingresa un correo válido.')).toBeInTheDocument();
    expect(screen.getByText(/Ingresa un teléfono válido/)).toBeInTheDocument();
  });

  it('crea el cliente enviando el RUT normalizado y los opcionales vacíos como null', async () => {
    const creado = clienteEjemplo({ id: 9 });
    const api = simularApi({ 'POST /api/clientes': () => creado });
    const user = userEvent.setup();
    const { onGuardado } = renderizar();

    await user.type(screen.getByLabelText(/RUT/), '760864285');
    expect(screen.getByLabelText(/RUT/)).toHaveValue('76.086.428-5');
    await user.type(screen.getByLabelText(/Razón social/), '  Grupo Andino SpA ');
    await user.type(screen.getByLabelText('Correo'), 'Marta@Andino.CL');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledWith(creado, true));
    expect(api.cuerpo('POST /api/clientes')).toEqual({
      rut: '76086428-5',
      razonSocial: 'Grupo Andino SpA',
      nombreFantasia: null,
      giro: null,
      contactoNombre: null,
      correo: 'marta@andino.cl',
      telefono: null,
      direccion: null,
    });
  });

  it('en edición precarga los datos y envía la versión; vaciar un opcional lo borra', async () => {
    const cliente = clienteEjemplo({ giro: 'Inmobiliario', version: 4 });
    const api = simularApi({
      'PATCH /api/clientes/5': () => ({ ...cliente, giro: null, version: 5 }),
    });
    const user = userEvent.setup();
    const { onGuardado } = renderizar({ cliente });

    expect(screen.getByRole('dialog', { name: 'Editar cliente' })).toBeInTheDocument();
    expect(screen.getByLabelText(/RUT/)).toHaveValue('76.086.428-5');
    expect(screen.getByLabelText('Giro')).toHaveValue('Inmobiliario');

    await user.clear(screen.getByLabelText('Giro'));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalled());
    expect(onGuardado.mock.calls[0][1]).toBe(false);
    expect(api.cuerpo('PATCH /api/clientes/5')).toMatchObject({
      version: 4,
      giro: null,
      rut: '76086428-5',
    });
  });

  it('muestra el error de RUT duplicado en el campo RUT', async () => {
    simularApi({
      'POST /api/clientes': () =>
        errorApi(409, 'RUT_DUPLICADO', 'Ya existe un cliente con ese RUT.'),
    });
    const user = userEvent.setup();
    renderizar();
    await user.type(screen.getByLabelText(/RUT/), '760864285');
    await user.type(screen.getByLabelText(/Razón social/), 'Otro cliente');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));

    expect(await screen.findByText('Ya existe un cliente con ese RUT.')).toBeInTheDocument();
    expect(screen.getByLabelText(/RUT/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('asigna errores de validación del servidor al campo correspondiente', async () => {
    simularApi({
      'POST /api/clientes': () =>
        errorApi(400, 'VALIDACION', 'Los datos enviados no son válidos.', [
          { campo: 'giro', errores: ['El giro debe tener como máximo 150 caracteres.'] },
        ]),
    });
    const user = userEvent.setup();
    renderizar();
    await user.type(screen.getByLabelText(/RUT/), '760864285');
    await user.type(screen.getByLabelText(/Razón social/), 'Otro cliente');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));
    expect(
      await screen.findByText('El giro debe tener como máximo 150 caracteres.'),
    ).toBeInTheDocument();
  });

  it('un conflicto de versión (409) abre el aviso y permite recargar los datos vigentes', async () => {
    simularApi({
      'PATCH /api/clientes/5': () =>
        errorApi(
          409,
          'CONFLICTO_VERSION',
          'El registro fue modificado por otra persona. Recarga y reintenta.',
          [{ versionActual: 3 }],
        ),
    });
    const user = userEvent.setup();
    const { onConflicto } = renderizar({ cliente: clienteEjemplo() });

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    const aviso = await screen.findByRole('dialog', { name: 'Otra persona modificó el cliente' });
    await user.click(within(aviso).getByRole('button', { name: 'Usar los datos vigentes' }));
    expect(onConflicto).toHaveBeenCalledTimes(1);
  });
});
