import { createContext, useContext } from 'react';
import type { ModoTema } from '@/app/theme';

export interface ValorContextoTema {
  modo: ModoTema;
  /** Cambia el tema y lo recuerda en este navegador. */
  establecerModo: (modo: ModoTema) => void;
}

export const ContextoTema = createContext<ValorContextoTema | null>(null);

export function useModoTema(): ValorContextoTema {
  const contexto = useContext(ContextoTema);
  if (!contexto) throw new Error('useModoTema debe usarse dentro de <ProveedorTema>');
  return contexto;
}

const CLAVE_ALMACEN = 'nomade.tema';

export const esModoTema = (valor: unknown): valor is ModoTema =>
  valor === 'claro' || valor === 'oscuro';

/** Preferencia guardada en este navegador (cubre la pantalla de ingreso, sin sesión). */
export function leerModoGuardado(): ModoTema | null {
  try {
    const valor = window.localStorage.getItem(CLAVE_ALMACEN);
    return esModoTema(valor) ? valor : null;
  } catch {
    return null;
  }
}

export function guardarModo(modo: ModoTema): void {
  try {
    window.localStorage.setItem(CLAVE_ALMACEN, modo);
  } catch {
    // Almacenamiento no disponible (modo privado, bloqueado): la preferencia no se recuerda.
  }
}
