import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorApi, simularApi } from '@/test/api';
import { ESTADOS_OBRA, clienteEjemplo, obraEjemplo } from '@/test/fixtures';
import { FormularioObra } from './FormularioObra';

const clientes = {
  items: [
    clienteEjemplo(),
    clienteEjemplo({ id: 6, rut: '11111111-1', razonSocial: 'Inmobiliaria Central' }),
  ],
  total: 2,
  pagina: 1,
  tamanio: 20,
};
const UF_HOY = { fecha: '2026-11-19', valor: 39284.8712 };

function manejadores(extra: Record<string, () => unknown> = {}) {
  return {
    'GET /api/catalogos/estado_obra': () => ESTADOS_OBRA,
    'GET /api/clientes': () => clientes,
    'GET /api/uf/valor': () => UF_HOY,
    ...extra,
  };
}

function renderizar(props: Partial<Parameters<typeof FormularioObra>[0]> = {}) {
  const acciones = { onGuardada: vi.fn(), onCancelar: vi.fn() };
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <FormularioObra {...acciones} {...props} />
    </QueryClientProvider>,
  );
  return acciones;
}

async function elegirCliente(user: ReturnType<typeof userEvent.setup>, nombre: string) {
  await user.click(screen.getByLabelText(/^Cliente/));
  await user.click(await screen.findByRole('option', { name: nombre }));
}

describe('FormularioObra (P04)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exige centro de costo, nombre y cliente', async () => {
    const api = simularApi(manejadores());
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Guardar obra' }));
    expect(
      await screen.findByText(/El centro de costo debe tener 2 a 20 caracteres/),
    ).toBeInTheDocument();
    expect(screen.getByText('El nombre debe tener al menos 2 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Selecciona un cliente.')).toBeInTheDocument();
    expect(api.veces('POST /api/obras')).toBe(0);
  });

  it('en una obra nueva el estado parte en «En preparación» y «Cerrada» no se ofrece', async () => {
    simularApi(manejadores());
    const user = userEvent.setup();
    renderizar();

    await waitFor(() =>
      expect(screen.getByLabelText('Estado')).toHaveTextContent('En preparación'),
    );
    await user.click(screen.getByLabelText('Estado'));
    const lista = await screen.findByRole('listbox');
    expect(
      within(lista)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['En preparación', 'Activa', 'Suspendida', 'Terminada']);
  });

  it('crea una obra en CLP con cliente buscado en el servidor', async () => {
    const creada = obraEjemplo({ id: 8 });
    const api = simularApi(manejadores({ 'POST /api/obras': () => creada }));
    const user = userEvent.setup();
    const { onGuardada } = renderizar();

    await user.type(screen.getByLabelText(/Centro de costo/), 'cc-001');
    await user.type(screen.getByLabelText(/Nombre de la obra/), 'Local Parque Norte');
    await elegirCliente(user, 'Grupo Andino SpA');
    await user.type(screen.getByLabelText('Responsable'), 'Camila Rojas');
    await user.type(screen.getByLabelText(/Monto del contrato/), '185000000');
    expect(screen.getByLabelText(/Monto del contrato/)).toHaveValue('185.000.000');
    await user.click(screen.getByRole('button', { name: 'Guardar obra' }));

    await waitFor(() => expect(onGuardada).toHaveBeenCalledWith(creada, true));
    expect(api.cuerpo('POST /api/obras')).toEqual({
      codigoCentroCosto: 'CC-001',
      nombre: 'Local Parque Norte',
      clienteId: 5,
      estadoId: 1,
      responsable: 'Camila Rojas',
      direccion: null,
      fechaInicio: null,
      fechaTermino: null,
      monedaContrato: 'CLP',
      montoContrato: 185_000_000,
      observaciones: null,
    });
  });

  it('un contrato en UF muestra el equivalente en pesos al valor de hoy y envía moneda UF', async () => {
    const api = simularApi(
      manejadores({ 'POST /api/obras': () => obraEjemplo({ monedaContrato: 'UF' }) }),
    );
    const user = userEvent.setup();
    renderizar();

    await user.type(screen.getByLabelText(/Centro de costo/), 'CC-010');
    await user.type(screen.getByLabelText(/Nombre de la obra/), 'Oficinas Nueva Vista');
    await elegirCliente(user, 'Inmobiliaria Central');
    await user.click(screen.getByRole('button', { name: 'UF' }));
    await user.type(screen.getByLabelText(/Monto del contrato \(UF\)/), '4710,5');

    expect(
      await screen.findByText(/UF 4\.710,50 equivalen hoy a \$ 185\.051\.386/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar obra' }));
    await waitFor(() => expect(api.veces('POST /api/obras')).toBe(1));
    expect(api.cuerpo('POST /api/obras')).toMatchObject({
      monedaContrato: 'UF',
      montoContrato: 4710.5,
      clienteId: 6,
    });
  });

  it('si no hay UF cargada, avisa y bloquea guardar un contrato en UF con monto', async () => {
    simularApi(
      manejadores({
        'GET /api/uf/valor': () =>
          errorApi(422, 'UF_NO_DISPONIBLE', 'No hay valor de la UF cargado para hoy.'),
      }),
    );
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'UF' }));
    await user.type(screen.getByLabelText(/Monto del contrato \(UF\)/), '100');
    expect(
      await screen.findByText(/No hay un valor de la UF cargado para hoy/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar obra' })).toBeDisabled();
  });

  it('muestra el centro de costo duplicado en su campo', async () => {
    simularApi(
      manejadores({
        'POST /api/obras': () =>
          errorApi(409, 'CENTRO_COSTO_DUPLICADO', 'Ya existe una obra con ese centro de costo.', [
            {
              campo: 'codigoCentroCosto',
              errores: ['Ya existe una obra con ese centro de costo.'],
            },
          ]),
      }),
    );
    const user = userEvent.setup();
    renderizar();
    await user.type(screen.getByLabelText(/Centro de costo/), 'CC-001');
    await user.type(screen.getByLabelText(/Nombre de la obra/), 'Duplicada');
    await elegirCliente(user, 'Grupo Andino SpA');
    await user.click(screen.getByRole('button', { name: 'Guardar obra' }));

    expect(
      await screen.findByText('Ya existe una obra con ese centro de costo.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Centro de costo/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('en edición precarga la obra y envía solo los campos modificados con la versión', async () => {
    const obra = obraEjemplo();
    const api = simularApi(
      manejadores({
        'PATCH /api/obras/1': () => ({ ...obra, nombre: 'Local Parque Norte II', version: 4 }),
      }),
    );
    const user = userEvent.setup();
    const { onGuardada } = renderizar({ obra });

    expect(screen.getByLabelText(/Centro de costo/)).toHaveValue('CC-001');
    expect(screen.getByLabelText(/Monto del contrato/)).toHaveValue('185.000.000');
    expect(screen.getByLabelText(/^Cliente/)).toHaveValue('Grupo Andino SpA');

    await user.clear(screen.getByLabelText(/Nombre de la obra/));
    await user.type(screen.getByLabelText(/Nombre de la obra/), 'Local Parque Norte II');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardada).toHaveBeenCalled());
    expect(onGuardada.mock.calls[0][1]).toBe(false);
    expect(api.cuerpo('PATCH /api/obras/1')).toEqual({
      version: 3,
      nombre: 'Local Parque Norte II',
    });
  });

  it('sin cambios no llama al servidor y vuelve atrás', async () => {
    const api = simularApi(manejadores());
    const user = userEvent.setup();
    const { onCancelar } = renderizar({ obra: obraEjemplo() });
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(onCancelar).toHaveBeenCalled());
    expect(api.veces('PATCH /api/obras/1')).toBe(0);
  });

  it('una obra cerrada se muestra de solo lectura', () => {
    simularApi(manejadores());
    renderizar({ obra: obraEjemplo({ estado: { id: 5, codigo: 'cerrada', nombre: 'Cerrada' } }) });
    expect(screen.getByText(/La obra está cerrada/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de la obra/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  describe('conflicto de versión (409)', () => {
    const conflicto = () =>
      errorApi(
        409,
        'CONFLICTO_VERSION',
        'El registro fue modificado por otra persona. Recarga y reintenta.',
        [{ versionActual: 4 }],
      );
    const servidor = obraEjemplo({
      nombre: 'Nombre cambiado por otra persona',
      responsable: 'Tomás Silva',
      version: 4,
    });

    async function editarYGuardar(user: ReturnType<typeof userEvent.setup>) {
      await user.clear(screen.getByLabelText(/Nombre de la obra/));
      await user.type(screen.getByLabelText(/Nombre de la obra/), 'Mi nombre');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      return screen.findByRole('dialog', { name: 'Otra persona modificó la obra' });
    }

    it('recarga la obra, muestra las diferencias y permite usar los datos vigentes', async () => {
      const api = simularApi(
        manejadores({ 'PATCH /api/obras/1': conflicto, 'GET /api/obras/1': () => servidor }),
      );
      const user = userEvent.setup();
      renderizar({ obra: obraEjemplo() });

      const aviso = await editarYGuardar(user);
      const tabla = within(aviso).getByRole('table');
      expect(tabla).toHaveTextContent('Mi nombre');
      expect(tabla).toHaveTextContent('Nombre cambiado por otra persona');
      expect(api.veces('GET /api/obras/1')).toBe(1);

      await user.click(within(aviso).getByRole('button', { name: 'Usar los datos vigentes' }));
      await waitFor(() =>
        expect(screen.getByLabelText(/Nombre de la obra/)).toHaveValue(
          'Nombre cambiado por otra persona',
        ),
      );
      expect(screen.getByLabelText('Responsable')).toHaveValue('Tomás Silva');
    });

    it('«Conservar mis cambios» reintenta con la versión vigente sin pisar los demás campos', async () => {
      let intento = 0;
      const api = simularApi(
        manejadores({
          'PATCH /api/obras/1': () => {
            intento += 1;
            return intento === 1 ? conflicto() : { ...servidor, nombre: 'Mi nombre', version: 5 };
          },
          'GET /api/obras/1': () => servidor,
        }),
      );
      const user = userEvent.setup();
      const { onGuardada } = renderizar({ obra: obraEjemplo() });

      const aviso = await editarYGuardar(user);
      await user.click(within(aviso).getByRole('button', { name: 'Conservar mis cambios' }));
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Otra persona modificó la obra' }),
        ).not.toBeInTheDocument(),
      );
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(onGuardada).toHaveBeenCalled());
      // Segundo intento: versión vigente (4) y solo el nombre, no los campos que cambió la otra persona.
      const patch = api.llamadas.filter((l) => l.clave === 'PATCH /api/obras/1');
      expect(JSON.parse(patch[1].config.data as string)).toEqual({
        version: 4,
        nombre: 'Mi nombre',
      });
    });
  });
});
