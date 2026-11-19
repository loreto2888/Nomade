import { describe, expect, it } from 'vitest';
import { disposicionAdjunto } from './adjuntos.controller.js';

describe('disposicionAdjunto', () => {
  it('fuerza la descarga y codifica el nombre original (RFC 5987)', () => {
    expect(disposicionAdjunto('Cotización final.pdf')).toBe(
      `attachment; filename="Cotizaci_n final.pdf"; filename*=UTF-8''Cotizaci%C3%B3n%20final.pdf`,
    );
  });

  it('neutraliza comillas y barras en el nombre ASCII', () => {
    const cabecera = disposicionAdjunto('a"b\\c.pdf');
    expect(cabecera).toContain('filename="a_b_c.pdf"');
    expect(cabecera.startsWith('attachment;')).toBe(true);
  });
});
