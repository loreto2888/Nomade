import { useEffect, useState } from 'react';

/** Devuelve `valor` tras `retardoMs` sin cambios (para no consultar en cada tecla). */
export function useValorDiferido<T>(valor: T, retardoMs = 300): T {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const temporizador = setTimeout(() => setDiferido(valor), retardoMs);
    return () => clearTimeout(temporizador);
  }, [valor, retardoMs]);
  return diferido;
}
