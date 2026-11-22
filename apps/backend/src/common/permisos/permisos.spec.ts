import { describe, expect, it } from 'vitest';
import {
  PERMISOS_ADMINISTRACION,
  PERMISOS_ANULACION,
  PERMISOS_OPERATIVOS,
  permisosDe,
  tienePermiso,
} from './permisos.js';
import { Rol } from './rol.js';

describe('mapa de permisos', () => {
  it('el admin tiene todos los permisos (D-02)', () => {
    for (const permiso of [
      ...PERMISOS_ADMINISTRACION,
      ...PERMISOS_OPERATIVOS,
      ...PERMISOS_ANULACION,
    ]) {
      expect(tienePermiso(Rol.Admin, permiso)).toBe(true);
    }
    expect(permisosDe(Rol.Admin)).toHaveLength(
      PERMISOS_ADMINISTRACION.length +
        PERMISOS_OPERATIVOS.length +
        PERMISOS_ANULACION.length,
    );
  });

  it('el usuario puede todo salvo administración (D-03)', () => {
    for (const permiso of PERMISOS_ADMINISTRACION) {
      expect(tienePermiso(Rol.Usuario, permiso)).toBe(false);
    }
    for (const permiso of [...PERMISOS_OPERATIVOS, ...PERMISOS_ANULACION]) {
      expect(tienePermiso(Rol.Usuario, permiso)).toBe(true);
    }
  });

  it('fase 4: aprobaciones de cotización y OT, y anulaciones de OC y OT para ambos roles', () => {
    for (const rol of [Rol.Admin, Rol.Usuario]) {
      expect(permisosDe(rol)).toEqual(
        expect.arrayContaining([
          'cotizacion.aprobar',
          'ot.aprobar',
          'oc.anular',
          'ot.anular',
        ]),
      );
    }
  });

  it('el usuario puede aprobar (el control es la no autoaprobación)', () => {
    expect(permisosDe(Rol.Usuario)).toEqual(
      expect.arrayContaining([
        'oc.aprobar',
        'lote.aprobar',
        'eepp.aprobar',
        'presupuesto.aprobar',
      ]),
    );
    expect(permisosDe(Rol.Usuario)).not.toContain('usuarios.crear');
    expect(permisosDe(Rol.Usuario)).not.toContain('auditoria.consultar');
  });

  it('administración incluye usuarios, auditoría, parámetros, migración, importación y datos bancarios', () => {
    expect(PERMISOS_ADMINISTRACION).toEqual(
      expect.arrayContaining([
        'usuarios.consultar',
        'auditoria.consultar',
        'parametros.administrar',
        'catalogos.administrar',
        'migracion.administrar',
        'importaciones.administrar',
        'proveedores.datos_bancarios.consultar',
        'proveedores.datos_bancarios.modificar',
      ]),
    );
  });
});
