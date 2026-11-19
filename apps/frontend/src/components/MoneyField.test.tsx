import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MoneyField } from './MoneyField';

function Controlado({
  inicial = null,
  moneda = 'CLP',
  onCambio,
}: {
  inicial?: number | null;
  moneda?: 'CLP' | 'UF';
  onCambio?: (v: number | null) => void;
}) {
  const [valor, setValor] = useState<number | null>(inicial);
  return (
    <MoneyField
      label="Monto"
      moneda={moneda}
      value={valor}
      onChange={(v) => {
        setValor(v);
        onCambio?.(v);
      }}
    />
  );
}

describe('MoneyField', () => {
  it('CLP: separa los miles al escribir y entrega un número entero', async () => {
    const onCambio = vi.fn();
    const user = userEvent.setup();
    render(<Controlado onCambio={onCambio} />);
    const campo = screen.getByLabelText('Monto');

    await user.type(campo, '185000000');
    expect(campo).toHaveValue('185.000.000');
    expect(onCambio).toHaveBeenLastCalledWith(185_000_000);
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('CLP: no admite decimales ni letras', async () => {
    const user = userEvent.setup();
    render(<Controlado />);
    const campo = screen.getByLabelText('Monto');
    await user.type(campo, '12a,5x');
    expect(campo).toHaveValue('125');
  });

  it('UF: acepta coma decimal hasta 4 decimales y muestra el símbolo UF', async () => {
    const onCambio = vi.fn();
    const user = userEvent.setup();
    render(<Controlado moneda="UF" onCambio={onCambio} />);
    const campo = screen.getByLabelText('Monto');

    await user.type(campo, '4710,5025');
    expect(onCambio).toHaveBeenLastCalledWith(4710.5025);
    expect(campo).toHaveValue('4710,5025');
    expect(screen.getByText('UF')).toBeInTheDocument();
    await user.tab();
    expect(campo).toHaveValue('4.710,5025');
  });

  it('vaciar el campo entrega null', async () => {
    const onCambio = vi.fn();
    const user = userEvent.setup();
    render(<Controlado inicial={1500} onCambio={onCambio} />);
    const campo = screen.getByLabelText('Monto');
    expect(campo).toHaveValue('1.500');

    await user.clear(campo);
    expect(onCambio).toHaveBeenLastCalledWith(null);
    expect(campo).toHaveValue('');
  });

  it('muestra el valor inicial formateado y usa un símbolo personalizado', () => {
    render(
      <MoneyField
        label="UF del día"
        moneda="UF"
        simbolo="$"
        value={39284.8712}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('UF del día')).toHaveValue('39.284,8712');
    expect(screen.getByText('$')).toBeInTheDocument();
  });
});
