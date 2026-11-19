import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { useState } from 'react';
import { esRutValido, formatearRutAlEscribir } from '@/lib/rut';

type PropsBase = Omit<TextFieldProps, 'value' | 'onChange' | 'type' | 'multiline' | 'select'>;

interface RutFieldProps extends PropsBase {
  /** Texto del campo (con o sin formato). */
  value: string;
  /** Recibe el texto ya formateado: `12.345.678-5`. */
  onChange: (valor: string) => void;
  /** Mensaje externo (p. ej. del esquema o del servidor); tiene prioridad sobre la validación propia. */
  errorMensaje?: string;
}

/**
 * Campo de RUT chileno: da formato mientras se escribe y, al salir del campo, valida el dígito
 * verificador (módulo 11). El backend vuelve a validar.
 */
export function RutField({
  value,
  onChange,
  onBlur,
  errorMensaje,
  label = 'RUT',
  helperText,
  ...resto
}: RutFieldProps) {
  const [tocado, setTocado] = useState(false);
  const propio =
    tocado && value.trim() !== '' && !esRutValido(value) ? 'Ingresa un RUT válido.' : undefined;
  const mensaje = errorMensaje ?? propio;

  return (
    <TextField
      {...resto}
      label={label}
      value={value}
      placeholder="12.345.678-5"
      autoComplete="off"
      error={Boolean(mensaje)}
      helperText={mensaje ?? helperText}
      onChange={(e) => onChange(formatearRutAlEscribir(e.target.value))}
      onBlur={(e) => {
        setTocado(true);
        onBlur?.(e);
      }}
      slotProps={{
        ...resto.slotProps,
        htmlInput: { inputMode: 'text', maxLength: 12 },
      }}
    />
  );
}
