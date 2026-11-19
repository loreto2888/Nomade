import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConflictDialog } from './ConflictDialog';

function renderizar(props: Partial<Parameters<typeof ConflictDialog>[0]> = {}) {
  const acciones = { onUsarActual: vi.fn(), onConservarMios: vi.fn(), onCerrar: vi.fn() };
  render(<ConflictDialog abierto entidad="la obra" {...acciones} {...props} />);
  return acciones;
}

describe('ConflictDialog (409)', () => {
  it('avisa que otra persona modificó el registro', () => {
    renderizar();
    expect(
      screen.getByRole('dialog', { name: 'Otra persona modificó la obra' }),
    ).toBeInTheDocument();
  });

  it('muestra las diferencias entre los datos propios y los vigentes', () => {
    renderizar({
      diferencias: [
        { campo: 'Nombre', tuValor: 'Local Norte II', valorActual: 'Local Parque Norte' },
        { campo: 'Responsable', tuValor: 'Camila', valorActual: 'Tomás' },
      ],
    });
    const tabla = screen.getByRole('table', { name: 'Diferencias entre tus datos y los vigentes' });
    expect(tabla).toHaveTextContent('Local Norte II');
    expect(tabla).toHaveTextContent('Local Parque Norte');
    expect(tabla).toHaveTextContent('Tomás');
  });

  it('si no hay diferencias en lo editado, lo explica', () => {
    renderizar({ diferencias: [] });
    expect(screen.getByText(/no cambiaron en el servidor/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('permite usar los datos vigentes, conservar los propios o seguir editando', async () => {
    const user = userEvent.setup();
    const a = renderizar();
    await user.click(screen.getByRole('button', { name: 'Usar los datos vigentes' }));
    await user.click(screen.getByRole('button', { name: 'Conservar mis cambios' }));
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(a.onUsarActual).toHaveBeenCalledTimes(1);
    expect(a.onConservarMios).toHaveBeenCalledTimes(1);
    expect(a.onCerrar).toHaveBeenCalledTimes(1);
  });

  it('sin onConservarMios no ofrece sobrescribir', () => {
    renderizar({ onConservarMios: undefined });
    expect(screen.queryByRole('button', { name: 'Conservar mis cambios' })).not.toBeInTheDocument();
  });

  it('cerrado no muestra nada', () => {
    renderizar({ abierto: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
