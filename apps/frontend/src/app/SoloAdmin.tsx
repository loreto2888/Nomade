import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { esAdmin, useSesion } from './sesion';

/** Oculta rutas de administración a quien no es admin (el backend igual valida). */
export function SoloAdmin({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  return esAdmin(sesion) ? children : <Navigate to="/" replace />;
}
