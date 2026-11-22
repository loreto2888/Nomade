import { describe, expect, it } from 'vitest';
import {
  accionesDeDocumento,
  formatearPorcentaje,
  montoDePorcentaje,
  parsearPorcentaje,
  sumarPorcentajes,
} from './compras';

const usuaria = {
  id: 2,
  rol: 'usuario' as const,
  permisos: ['oc.aprobar', 'ot.aprobar', 'cotizacion.aprobar', 'oc.anular', 'ot.anular'],
};
const admin = { ...usuaria, id: 1, rol: 'admin' as const };

describe('acciones de documentos de compra', () => {
  it('borrador: editar, eliminar y enviar', () => {
    const a = accionesDeDocumento(
      'orden_compra',
      { estado: 'borrador', creadoPor: { id: 2 } },
      usuaria,
    );
    expect(a).toMatchObject({
      editar: true,
      eliminar: true,
      enviar: true,
      aprobar: false,
      anular: false,
    });
  });

  it('D-10: la creadora no aprueba (pero sí rechaza); el admin aprueba lo suyo', () => {
    const doc = { estado: 'en_revision' as const, creadoPor: { id: 2 } };
    const a = accionesDeDocumento('orden_compra', doc, usuaria);
    expect(a.aprobar).toBe(false);
    expect(a.rechazar).toBe(true);
    expect(a.bloqueoAprobacion).toMatch(/otra persona/);
    expect(
      accionesDeDocumento('orden_compra', { ...doc, creadoPor: { id: 1 } }, admin).aprobar,
    ).toBe(true);
    expect(
      accionesDeDocumento('orden_compra', { ...doc, creadoPor: { id: 3 } }, usuaria).aprobar,
    ).toBe(true);
  });

  it('aprobada: OC se recibe o anula; OT se anula; la cotización no', () => {
    const doc = { estado: 'aprobada' as const, creadoPor: null };
    expect(accionesDeDocumento('orden_compra', doc, usuaria)).toMatchObject({
      recibir: true,
      anular: true,
      editar: false,
    });
    expect(accionesDeDocumento('orden_trabajo', doc, usuaria)).toMatchObject({
      recibir: false,
      anular: true,
    });
    expect(accionesDeDocumento('cotizacion', doc, usuaria)).toMatchObject({
      recibir: false,
      anular: false,
    });
  });

  it('obra cerrada: solo lectura', () => {
    const a = accionesDeDocumento(
      'orden_compra',
      { estado: 'borrador', creadoPor: null },
      usuaria,
      true,
    );
    expect(Object.values(a).filter((v) => v === true)).toEqual([]);
  });
});

describe('porcentajes', () => {
  it('formatea, interpreta y suma sin errores de punto flotante', () => {
    expect(formatearPorcentaje(33.33)).toBe('33,33 %');
    expect(parsearPorcentaje('33,33')).toBe(33.33);
    expect(parsearPorcentaje('20 %')).toBe(20);
    expect(parsearPorcentaje('abc')).toBeNull();
    expect(sumarPorcentajes([0.1, 0.2, 99.7])).toBe(100);
    expect(montoDePorcentaje(10_000_000, 33.33)).toBe(3_333_000);
  });
});
