import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { RoleGate } from './RoleGate';

/** Oculta rutas de administración a quien no es admin (el backend igual valida). */
export function SoloAdmin({ children }: { children: ReactNode }) {
  return (
    <RoleGate roles={['admin']} fallback={<Navigate to="/" replace />}>
      {children}
    </RoleGate>
  );
}
