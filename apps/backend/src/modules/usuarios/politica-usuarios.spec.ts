import { describe, expect, it } from 'vitest';
import { Rol } from '../../common/permisos/rol.js';
import {
  validarCambioUsuario,
  type CambioUsuario,
} from './politica-usuarios.js';

const base = (parcial: Partial<CambioUsuario>): CambioUsuario => ({
  actorId: 1,
  objetivo: { id: 2, rol: Rol.Usuario, activo: true },
  adminsActivos: 2,
  ...parcial,
});

const codigo = (cambio: CambioUsuario): string | undefined => {
  try {
    validarCambioUsuario(cambio);
    return undefined;
  } catch (error) {
    return (error as { response: { codigo: string } }).response.codigo;
  }
};

describe('reglas de usuarios y último admin (D-11)', () => {
  it('permite desactivar o cambiar el rol de un usuario común', () => {
    expect(codigo(base({ nuevoActivo: false }))).toBeUndefined();
    expect(codigo(base({ nuevoRol: Rol.Admin }))).toBeUndefined();
  });

  it('un admin no puede quitarse el rol', () => {
    expect(
      codigo(
        base({
          objetivo: { id: 1, rol: Rol.Admin, activo: true },
          nuevoRol: Rol.Usuario,
        }),
      ),
    ).toBe('ADMIN_NO_PUEDE_QUITARSE_ROL');
  });

  it('un admin no puede desactivarse', () => {
    expect(
      codigo(
        base({
          objetivo: { id: 1, rol: Rol.Admin, activo: true },
          nuevoActivo: false,
        }),
      ),
    ).toBe('ADMIN_NO_PUEDE_DESACTIVARSE');
  });

  it('un admin puede editarse a sí mismo sin perder el rol ni la actividad', () => {
    expect(
      codigo(
        base({
          objetivo: { id: 1, rol: Rol.Admin, activo: true },
          nuevoRol: Rol.Admin,
        }),
      ),
    ).toBeUndefined();
  });

  it('siempre debe quedar al menos un admin activo (desactivar al último)', () => {
    expect(
      codigo(
        base({
          objetivo: { id: 3, rol: Rol.Admin, activo: true },
          nuevoActivo: false,
          adminsActivos: 1,
        }),
      ),
    ).toBe('ULTIMO_ADMIN');
  });

  it('siempre debe quedar al menos un admin activo (degradar al último)', () => {
    expect(
      codigo(
        base({
          objetivo: { id: 3, rol: Rol.Admin, activo: true },
          nuevoRol: Rol.Usuario,
          adminsActivos: 1,
        }),
      ),
    ).toBe('ULTIMO_ADMIN');
  });

  it('con otro admin activo se puede desactivar o degradar a un tercero', () => {
    const objetivo = { id: 3, rol: Rol.Admin, activo: true };
    expect(
      codigo(base({ objetivo, nuevoActivo: false, adminsActivos: 2 })),
    ).toBeUndefined();
    expect(
      codigo(base({ objetivo, nuevoRol: Rol.Usuario, adminsActivos: 2 })),
    ).toBeUndefined();
  });

  it('un admin ya inactivo no cuenta como pérdida', () => {
    expect(
      codigo(
        base({
          objetivo: { id: 3, rol: Rol.Admin, activo: false },
          nuevoRol: Rol.Usuario,
          adminsActivos: 1,
        }),
      ),
    ).toBeUndefined();
  });

  it('las violaciones son 422 con mensaje en español', () => {
    try {
      validarCambioUsuario(
        base({
          objetivo: { id: 3, rol: Rol.Admin, activo: true },
          nuevoActivo: false,
          adminsActivos: 1,
        }),
      );
      expect.unreachable();
    } catch (error) {
      expect((error as { status: number }).status).toBe(422);
      expect(
        (error as { response: { mensaje: string } }).response.mensaje,
      ).toBe('Debe existir al menos un administrador activo.');
    }
  });
});
