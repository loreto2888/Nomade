import { describe, expect, it } from 'vitest';
import { ErrorAplicacion } from '../errores/error-aplicacion.js';
import { exigirPuedeAprobar, puedeAprobar } from './autoaprobacion.js';
import { Rol } from './rol.js';

const usuario = { id: 7, rol: Rol.Usuario };
const admin = { id: 1, rol: Rol.Admin };

describe('política de autoaprobación (D-10)', () => {
  it('el usuario no puede aprobar lo que él mismo creó', () => {
    expect(puedeAprobar(usuario, { creadoPor: 7 }, 'oc.aprobar')).toBe(false);
    expect(puedeAprobar(usuario, { creadoPor: 7 }, 'lote.aprobar')).toBe(false);
    expect(puedeAprobar(usuario, { creadoPor: 7 }, 'eepp.aprobar')).toBe(false);
  });

  it('el usuario sí aprueba lo creado por otra persona', () => {
    expect(puedeAprobar(usuario, { creadoPor: 8 }, 'oc.aprobar')).toBe(true);
  });

  it('el admin sí puede aprobar lo que creó', () => {
    expect(puedeAprobar(admin, { creadoPor: 1 }, 'oc.aprobar')).toBe(true);
    expect(puedeAprobar(admin, { creadoPor: 7 }, 'oc.aprobar')).toBe(true);
  });

  it('si el creador es desconocido no hay conflicto', () => {
    expect(puedeAprobar(usuario, { creadoPor: null }, 'oc.aprobar')).toBe(true);
  });

  it('el permiso presupuesto.aprobar sigue la misma política', () => {
    expect(puedeAprobar(usuario, { creadoPor: 7 }, 'presupuesto.aprobar')).toBe(
      false,
    );
    expect(puedeAprobar(usuario, { creadoPor: 8 }, 'presupuesto.aprobar')).toBe(
      true,
    );
    expect(puedeAprobar(admin, { creadoPor: 1 }, 'presupuesto.aprobar')).toBe(
      true,
    );
  });

  it('no aprueba quien no tiene el permiso', () => {
    expect(puedeAprobar(usuario, { creadoPor: 8 }, 'usuarios.crear')).toBe(
      false,
    );
  });

  describe('exigirPuedeAprobar', () => {
    it('no lanza cuando está permitido', () => {
      expect(() =>
        exigirPuedeAprobar(admin, { creadoPor: 1 }, 'oc.aprobar'),
      ).not.toThrow();
      expect(() =>
        exigirPuedeAprobar(usuario, { creadoPor: 8 }, 'oc.aprobar'),
      ).not.toThrow();
    });

    it('lanza 403 AUTOAPROBACION_NO_PERMITIDA con mensaje en español', () => {
      try {
        exigirPuedeAprobar(usuario, { creadoPor: 7 }, 'oc.aprobar');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorAplicacion);
        const e = error as ErrorAplicacion;
        expect(e.getStatus()).toBe(403);
        expect(e.getResponse()).toEqual({
          codigo: 'AUTOAPROBACION_NO_PERMITIDA',
          mensaje: 'No puedes aprobar un documento que tú mismo creaste.',
        });
      }
    });

    it('lanza 403 PROHIBIDO si falta el permiso', () => {
      expect(() =>
        exigirPuedeAprobar(usuario, { creadoPor: 8 }, 'usuarios.crear'),
      ).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ codigo: 'PROHIBIDO' }),
        }),
      );
    });
  });
});
