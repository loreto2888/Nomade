import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SesionApi } from '@/api/auth';
import { sesionAdmin, sesionUsuario } from '@/test/fixtures';
import { RoleGate } from './RoleGate';
import { aSesion, ContextoSesion } from './sesion';

function renderizar(sesion: SesionApi, ui: React.ReactElement) {
  return render(<ContextoSesion.Provider value={aSesion(sesion)}>{ui}</ContextoSesion.Provider>);
}

describe('RoleGate', () => {
  it('muestra el contenido al rol permitido', () => {
    renderizar(sesionAdmin, <RoleGate roles={['admin']}>Acción de administración</RoleGate>);
    expect(screen.getByText('Acción de administración')).toBeInTheDocument();
  });

  it('oculta el contenido a otro rol y muestra el fallback si existe', () => {
    renderizar(
      sesionUsuario,
      <RoleGate roles={['admin']} fallback={<span>Sin acceso</span>}>
        Acción de administración
      </RoleGate>,
    );
    expect(screen.queryByText('Acción de administración')).not.toBeInTheDocument();
    expect(screen.getByText('Sin acceso')).toBeInTheDocument();
  });

  it('sin fallback no renderiza nada', () => {
    const { container } = renderizar(sesionUsuario, <RoleGate roles={['admin']}>Oculto</RoleGate>);
    expect(container).toBeEmptyDOMElement();
  });

  it('filtra por código de permiso', () => {
    renderizar(
      sesionUsuario,
      <>
        <RoleGate permiso="oc.aprobar">Puede aprobar OC</RoleGate>
        <RoleGate permiso="usuarios.crear">Puede crear usuarios</RoleGate>
      </>,
    );
    expect(screen.getByText('Puede aprobar OC')).toBeInTheDocument();
    expect(screen.queryByText('Puede crear usuarios')).not.toBeInTheDocument();
  });

  it('con rol y permiso exige ambos', () => {
    renderizar(
      sesionUsuario,
      <RoleGate roles={['admin', 'usuario']} permiso="usuarios.crear">
        Ambos
      </RoleGate>,
    );
    expect(screen.queryByText('Ambos')).not.toBeInTheDocument();
  });
});
