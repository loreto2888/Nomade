import { describe, expect, it } from 'vitest';
import { versionPresupuestoEjemplo } from '@/test/fixtures';
import {
  PERMISO_APROBAR_PRESUPUESTO,
  accionesDeVersion,
  formatearCantidad,
  formatearTotalVersion,
  parsearCantidad,
  totalEstimado,
} from './presupuesto';

const usuario = { id: 2, rol: 'usuario' as const, permisos: [PERMISO_APROBAR_PRESUPUESTO] };
const admin = { id: 1, rol: 'admin' as const, permisos: [PERMISO_APROBAR_PRESUPUESTO] };
const otraPersona = { id: 3, nombre: 'Tomás' };
const yo = (s: { id: number }) => ({ id: s.id, nombre: 'Yo' });

describe('accionesDeVersion', () => {
  it('un borrador se edita, se envía y se elimina; no se aprueba ni se rechaza', () => {
    const a = accionesDeVersion(
      versionPresupuestoEjemplo({ estado: 'borrador', creadoPor: yo(usuario) }),
      usuario,
      false,
    );
    expect(a).toMatchObject({
      editar: true,
      eliminar: true,
      enviarARevision: true,
      bloqueoEnvio: null,
      aprobar: false,
      rechazar: false,
      bloqueoAprobacion: null,
      copiar: true,
    });
  });

  it('un borrador sin partidas no se puede enviar (explica por qué)', () => {
    const a = accionesDeVersion(
      versionPresupuestoEjemplo({ estado: 'borrador', cantidadPartidas: 0 }),
      usuario,
      false,
    );
    expect(a.enviarARevision).toBe(true);
    expect(a.bloqueoEnvio).toMatch(/al menos una partida/);
  });

  it('en revisión: otra persona aprueba y rechaza; nadie edita', () => {
    const a = accionesDeVersion(
      versionPresupuestoEjemplo({ estado: 'en_revision', creadoPor: otraPersona }),
      usuario,
      false,
    );
    expect(a).toMatchObject({
      editar: false,
      eliminar: false,
      enviarARevision: false,
      aprobar: true,
      rechazar: true,
      bloqueoAprobacion: null,
    });
  });

  it('D-10: un usuario no aprueba lo que creó (sí puede rechazarlo); el admin sí lo aprueba', () => {
    const propia = (s: { id: number }) =>
      versionPresupuestoEjemplo({ estado: 'en_revision', creadoPor: yo(s) });
    const comoUsuario = accionesDeVersion(propia(usuario), usuario, false);
    expect(comoUsuario.aprobar).toBe(false);
    expect(comoUsuario.rechazar).toBe(true);
    expect(comoUsuario.bloqueoAprobacion).toMatch(/otra persona/);

    const comoAdmin = accionesDeVersion(propia(admin), admin, false);
    expect(comoAdmin.aprobar).toBe(true);
    expect(comoAdmin.bloqueoAprobacion).toBeNull();
  });

  it('sin el permiso presupuesto.aprobar no se aprueba ni se rechaza', () => {
    const a = accionesDeVersion(
      versionPresupuestoEjemplo({ estado: 'en_revision', creadoPor: otraPersona }),
      { ...usuario, permisos: [] },
      false,
    );
    expect(a).toMatchObject({ aprobar: false, rechazar: false, bloqueoAprobacion: null });
  });

  it.each(['aprobado', 'rechazado'] as const)(
    'una versión %s es inmutable: solo se copia y se exporta',
    (estado) => {
      const a = accionesDeVersion(versionPresupuestoEjemplo({ estado }), admin, false);
      expect(a).toMatchObject({
        editar: false,
        eliminar: false,
        enviarARevision: false,
        aprobar: false,
        rechazar: false,
        copiar: true,
      });
    },
  );

  it('una obra cerrada es de solo lectura en todos los estados', () => {
    for (const estado of ['borrador', 'en_revision', 'aprobado', 'rechazado'] as const) {
      const a = accionesDeVersion(
        versionPresupuestoEjemplo({ estado, creadoPor: otraPersona }),
        admin,
        true,
      );
      expect(a, estado).toMatchObject({
        editar: false,
        eliminar: false,
        enviarARevision: false,
        aprobar: false,
        rechazar: false,
        copiar: false,
      });
    }
  });
});

describe('ayudas de partida', () => {
  it('totalEstimado redondea según la moneda y es nulo si falta un dato', () => {
    expect(totalEstimado(120.5, 18_500, 'CLP')).toBe(2_229_250);
    expect(totalEstimado(33.3333, 12_345, 'CLP')).toBe(411_500);
    expect(totalEstimado(2.5, 120.1234, 'UF')).toBe(300.3085);
    expect(totalEstimado(null, 10, 'CLP')).toBeNull();
    expect(totalEstimado(1, null, 'UF')).toBeNull();
  });

  it('parsearCantidad entiende el formato chileno', () => {
    expect(parsearCantidad('120,5')).toBe(120.5);
    expect(parsearCantidad('1.234,5678')).toBe(1234.5678);
    expect(parsearCantidad('1.500')).toBe(1500);
    expect(parsearCantidad('12.5')).toBe(12.5);
    expect(parsearCantidad('40')).toBe(40);
    expect(parsearCantidad('')).toBeNull();
    expect(parsearCantidad('abc')).toBeNull();
    expect(parsearCantidad('-3')).toBeNull();
  });

  it('formatearCantidad y formatearTotalVersion', () => {
    expect(formatearCantidad(120.5)).toBe('120,5');
    expect(formatearCantidad(1234.5678)).toBe('1.234,5678');
    expect(formatearTotalVersion({ moneda: 'CLP', total: 3_000_000 })).toBe('$ 3.000.000');
    expect(formatearTotalVersion({ moneda: 'UF', total: 12.5 })).toBe('UF 12,50');
  });
});
