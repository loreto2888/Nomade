import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { useState } from 'react';
import { parsearMonto, textoEditableDeMonto, type Moneda } from '@/lib/monto';

type PropsBase = Omit<TextFieldProps, 'value' | 'onChange' | 'type' | 'multiline' | 'select'>;

interface MoneyFieldProps extends PropsBase {
  /** Monto numérico (`null` = vacío). */
  value: number | null;
  onChange: (valor: number | null) => void;
  /** CLP: pesos enteros. UF: hasta 4 decimales con coma decimal. */
  moneda?: Moneda;
  /** Símbolo a la izquierda; por defecto `$` (CLP) o `UF`. Útil para «pesos por UF» (`$` con decimales). */
  simbolo?: string;
}

/**
 * Campo de monto en pesos (CLP) o unidades de fomento (UF). Muestra el número con separador de
 * miles mientras se escribe y entrega un `number` (o `null` si está vacío).
 */
export function MoneyField({
  value,
  onChange,
  onBlur,
  onFocus,
  moneda = 'CLP',
  simbolo,
  ...resto
}: MoneyFieldProps) {
  const [texto, setTexto] = useState<string | null>(null);
  const mostrado = texto ?? textoEditableDeMonto(value, moneda);

  return (
    <TextField
      {...resto}
      value={mostrado}
      onChange={(e) => {
        const crudo = e.target.value;
        const numero = parsearMonto(crudo, moneda);
        // En UF se conserva lo escrito mientras se edita (p. ej. «4.710,» o «4.710,50»);
        // en CLP se reformatea de inmediato con los puntos de miles.
        setTexto(
          moneda === 'UF' ? crudo.replace(/[^\d.,]/g, '') : textoEditableDeMonto(numero, moneda),
        );
        onChange(numero);
      }}
      onFocus={(e) => {
        setTexto(textoEditableDeMonto(value, moneda));
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setTexto(null);
        onBlur?.(e);
      }}
      slotProps={{
        ...resto.slotProps,
        input: {
          startAdornment: (
            <InputAdornment position="start">
              {simbolo ?? (moneda === 'UF' ? 'UF' : '$')}
            </InputAdornment>
          ),
        },
        htmlInput: { inputMode: moneda === 'UF' ? 'decimal' : 'numeric' },
      }}
    />
  );
}
