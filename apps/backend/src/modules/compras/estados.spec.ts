import { describe, expect, it } from 'vitest';
import {
  EstadoDocumentoCompra as E,
  TipoDocumentoCompra as T,
} from './compras.tipos.js';
import {
  exigirBorrador,
  exigirTransicion,
  puedeTransicionar,
} from './estados.js';

describe('máquinas de estado de compras', () => {
  it('flujo común: borrador → en revisión → aprobada | rechazada', () => {
    for (const tipo of Object.values(T)) {
      expect(puedeTransicionar(tipo, E.Borrador, E.EnRevision)).toBe(true);
      expect(puedeTransicionar(tipo, E.EnRevision, E.Aprobada)).toBe(true);
      expect(puedeTransicionar(tipo, E.EnRevision, E.Rechazada)).toBe(true);
      expect(puedeTransicionar(tipo, E.Borrador, E.Aprobada)).toBe(false);
      expect(puedeTransicionar(tipo, E.Rechazada, E.Borrador)).toBe(false);
      expect(puedeTransicionar(tipo, E.Aprobada, E.Borrador)).toBe(false);
    }
  });

  it('solo la OC se recibe; OC y OT aprobadas se anulan; la cotización no', () => {
    expect(puedeTransicionar(T.OrdenCompra, E.Aprobada, E.Recibida)).toBe(true);
    expect(puedeTransicionar(T.OrdenCompra, E.Aprobada, E.Anulada)).toBe(true);
    expect(puedeTransicionar(T.OrdenCompra, E.Recibida, E.Anulada)).toBe(false);
    expect(puedeTransicionar(T.OrdenTrabajo, E.Aprobada, E.Anulada)).toBe(true);
    expect(puedeTransicionar(T.OrdenTrabajo, E.Aprobada, E.Recibida)).toBe(
      false,
    );
    expect(puedeTransicionar(T.Cotizacion, E.Aprobada, E.Anulada)).toBe(false);
    expect(puedeTransicionar(T.OrdenCompra, E.EnRevision, E.Anulada)).toBe(
      false,
    );
  });

  it('errores 422 en español', () => {
    expect(() =>
      exigirTransicion(T.OrdenCompra, E.Recibida, E.Anulada),
    ).toThrow(
      expect.objectContaining({
        response: {
          codigo: 'TRANSICION_NO_VALIDA',
          mensaje: 'La OC está recibida: no puede quedar anulada.',
        },
      }),
    );
    expect(() => exigirBorrador(T.OrdenCompra, E.Aprobada)).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ codigo: 'DOCUMENTO_NO_EDITABLE' }),
      }),
    );
    expect(() => exigirBorrador(T.Cotizacion, E.Borrador)).not.toThrow();
  });
});
