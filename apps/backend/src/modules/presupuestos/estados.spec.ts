import { describe, expect, it } from 'vitest';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import {
  TRANSICIONES,
  esEditable,
  exigirEditable,
  exigirTransicion,
  puedeTransicionar,
} from './estados.js';
import { EstadoPresupuesto } from './presupuestos.tipos.js';

const { Borrador, EnRevision, Aprobado, Rechazado } = EstadoPresupuesto;

describe('máquina de estados de la versión de presupuesto', () => {
  it('solo admite borrador → en revisión → aprobado | rechazado', () => {
    expect(puedeTransicionar(Borrador, EnRevision)).toBe(true);
    expect(puedeTransicionar(EnRevision, Aprobado)).toBe(true);
    expect(puedeTransicionar(EnRevision, Rechazado)).toBe(true);
  });

  it('no permite saltos, retrocesos ni salir de un estado final', () => {
    expect(puedeTransicionar(Borrador, Aprobado)).toBe(false);
    expect(puedeTransicionar(Borrador, Rechazado)).toBe(false);
    expect(puedeTransicionar(EnRevision, Borrador)).toBe(false);
    expect(TRANSICIONES[Aprobado]).toEqual([]);
    expect(TRANSICIONES[Rechazado]).toEqual([]);
    for (const hasta of Object.values(EstadoPresupuesto)) {
      expect(puedeTransicionar(Aprobado, hasta)).toBe(false);
      expect(puedeTransicionar(Rechazado, hasta)).toBe(false);
    }
  });

  it('exigirTransicion lanza 422 TRANSICION_NO_VALIDA con mensaje en español', () => {
    try {
      exigirTransicion(Borrador, Aprobado);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorAplicacion);
      const e = error as ErrorAplicacion;
      expect(e.getStatus()).toBe(422);
      expect(e.getResponse()).toEqual({
        codigo: 'TRANSICION_NO_VALIDA',
        mensaje: 'La versión está borrador: no se puede pasar a aprobada.',
      });
    }
    expect(() => exigirTransicion(Aprobado, Aprobado)).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          mensaje: 'La versión ya está aprobada.',
        }),
      }),
    );
    expect(() => exigirTransicion(Borrador, EnRevision)).not.toThrow();
  });

  it('solo el borrador es editable; una aprobada es inmutable', () => {
    expect(esEditable(Borrador)).toBe(true);
    for (const estado of [EnRevision, Aprobado, Rechazado]) {
      expect(esEditable(estado)).toBe(false);
      expect(() => exigirEditable(estado)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ codigo: 'VERSION_NO_EDITABLE' }),
        }),
      );
    }
    expect(() => exigirEditable(Aprobado)).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          mensaje: expect.stringMatching(/inmutable.*nueva versión/) as string,
        }),
      }),
    );
    expect(() => exigirEditable(Borrador)).not.toThrow();
  });
});
