import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RutField } from './RutField';

function Controlado({
  inicial = '',
  onCambio,
}: {
  inicial?: string;
  onCambio?: (v: string) => void;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <RutField
      value={valor}
      onChange={(v) => {
        setValor(v);
        onCambio?.(v);
      }}
    />
  );
}

describe('RutField', () => {
  it('da formato con puntos y guion mientras se escribe', async () => {
    const onCambio = vi.fn();
    const user = userEvent.setup();
    render(<Controlado onCambio={onCambio} />);
    const campo = screen.getByLabelText('RUT');

    await user.type(campo, '123456785');
    expect(campo).toHaveValue('12.345.678-5');
    expect(onCambio).toHaveBeenLastCalledWith('12.345.678-5');
  });

  it('ignora caracteres que no son dígitos ni K y pasa la K a mayúscula', async () => {
    const user = userEvent.setup();
    render(<Controlado />);
    const campo = screen.getByLabelText('RUT');
    await user.type(campo, '10.000.013-k!x');
    expect(campo).toHaveValue('10.000.013-K');
  });

  it('al salir del campo avisa si el dígito verificador es incorrecto', async () => {
    const user = userEvent.setup();
    render(<Controlado />);
    const campo = screen.getByLabelText('RUT');

    await user.type(campo, '123456789');
    expect(screen.queryByText('Ingresa un RUT válido.')).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText('Ingresa un RUT válido.')).toBeInTheDocument();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
  });

  it('un RUT válido no muestra error y uno vacío tampoco', async () => {
    const user = userEvent.setup();
    render(<Controlado />);
    await user.click(screen.getByLabelText('RUT'));
    await user.tab();
    expect(screen.queryByText('Ingresa un RUT válido.')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('RUT'), '123456785');
    await user.tab();
    expect(screen.queryByText('Ingresa un RUT válido.')).not.toBeInTheDocument();
  });

  it('un mensaje externo tiene prioridad sobre la validación propia', () => {
    render(
      <RutField
        value="12.345.678-5"
        onChange={() => {}}
        errorMensaje="Ya existe un cliente con ese RUT."
      />,
    );
    expect(screen.getByText('Ya existe un cliente con ese RUT.')).toBeInTheDocument();
  });
});
