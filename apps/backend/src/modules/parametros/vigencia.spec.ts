import { describe, expect, it } from 'vitest';
import { TipoValorParametro } from './parametros.tipos.js';
import {
  interpretarValor,
  validarNuevaVersion,
  valorComoTexto,
  versionProxima,
  versionVigente,
  vigenteHasta,
} from './vigencia.js';

const versiones = [
  { id: 1, vigenteDesde: '2003-01-01' },
  { id: 2, vigenteDesde: '2026-12-01' },
  { id: 3, vigenteDesde: '2027-06-01' },
];

describe('vigencia de parámetros', () => {
  it('versionVigente elige la de mayor inicio que no supere la fecha', () => {
    expect(versionVigente(versiones, '2026-11-19')?.id).toBe(1);
    expect(versionVigente(versiones, '2026-12-01')?.id).toBe(2);
    expect(versionVigente(versiones, '2027-05-31')?.id).toBe(2);
    expect(versionVigente(versiones, '2030-01-01')?.id).toBe(3);
    expect(versionVigente([...versiones].reverse(), '2026-12-15')?.id).toBe(2);
  });

  it('no hay versión vigente antes de la primera', () => {
    expect(versionVigente(versiones, '2002-12-31')).toBeNull();
    expect(versionVigente([], '2026-11-19')).toBeNull();
  });

  it('versionProxima es la primera que empieza después de la fecha', () => {
    expect(versionProxima(versiones, '2026-11-19')?.id).toBe(2);
    expect(versionProxima(versiones, '2026-12-01')?.id).toBe(3);
    expect(versionProxima(versiones, '2027-06-01')).toBeNull();
  });

  it('vigenteHasta es el día anterior al inicio de la siguiente versión', () => {
    expect(vigenteHasta(versiones, versiones[0])).toBe('2026-11-30');
    expect(vigenteHasta(versiones, versiones[1])).toBe('2027-05-31');
    expect(vigenteHasta(versiones, versiones[2])).toBeNull();
  });

  describe('validarNuevaVersion', () => {
    const hoy = '2026-11-19';
    const falla = (parametros: Parameters<typeof validarNuevaVersion>[0]) => {
      try {
        validarNuevaVersion(parametros);
      } catch (error) {
        return (error as { response: { codigo: string } }).response.codigo;
      }
      return null;
    };

    it('acepta hoy o una fecha futura posterior a la última versión', () => {
      expect(
        falla({
          vigenteDesde: '2026-11-19',
          hoy,
          ultimaVigenteDesde: '2003-01-01',
        }),
      ).toBeNull();
      expect(
        falla({
          vigenteDesde: '2027-01-01',
          hoy,
          ultimaVigenteDesde: '2026-12-01',
        }),
      ).toBeNull();
      expect(
        falla({ vigenteDesde: '2026-11-19', hoy, ultimaVigenteDesde: null }),
      ).toBeNull();
    });

    it('rechaza vigencias anteriores a hoy (el historial no se reescribe)', () => {
      expect(
        falla({ vigenteDesde: '2026-11-18', hoy, ultimaVigenteDesde: null }),
      ).toBe('VIGENCIA_EN_EL_PASADO');
    });

    it('rechaza vigencias no posteriores a la última versión (sin traslapes)', () => {
      expect(
        falla({
          vigenteDesde: '2026-12-01',
          hoy,
          ultimaVigenteDesde: '2026-12-01',
        }),
      ).toBe('VIGENCIA_NO_POSTERIOR');
      expect(
        falla({
          vigenteDesde: '2026-11-25',
          hoy,
          ultimaVigenteDesde: '2026-12-01',
        }),
      ).toBe('VIGENCIA_NO_POSTERIOR');
    });
  });

  describe('interpretarValor', () => {
    const falla = (tipo: TipoValorParametro, valor: string) => {
      try {
        interpretarValor(tipo, valor);
      } catch (error) {
        return (error as { status: number }).status;
      }
      return null;
    };

    it('porcentaje: 0–100 con hasta 4 decimales, acepta coma decimal', () => {
      expect(interpretarValor(TipoValorParametro.Porcentaje, '19')).toEqual({
        numerico: 19,
        texto: null,
      });
      expect(interpretarValor(TipoValorParametro.Porcentaje, '12,5')).toEqual({
        numerico: 12.5,
        texto: null,
      });
      expect(falla(TipoValorParametro.Porcentaje, '100.01')).toBe(400);
      expect(falla(TipoValorParametro.Porcentaje, '-1')).toBe(400);
      expect(falla(TipoValorParametro.Porcentaje, '1.23456')).toBe(400);
      expect(falla(TipoValorParametro.Porcentaje, 'abc')).toBe(400);
    });

    it('entero: dígitos sin decimales', () => {
      expect(interpretarValor(TipoValorParametro.Entero, ' 30 ')).toEqual({
        numerico: 30,
        texto: null,
      });
      expect(falla(TipoValorParametro.Entero, '3.5')).toBe(400);
      expect(falla(TipoValorParametro.Entero, '')).toBe(400);
      expect(falla(TipoValorParametro.Entero, '1234567890')).toBe(400);
    });

    it('decimal: no negativo con hasta 4 decimales', () => {
      expect(
        interpretarValor(TipoValorParametro.Decimal, '1250.5').numerico,
      ).toBe(1250.5);
      expect(falla(TipoValorParametro.Decimal, '-5')).toBe(400);
    });

    it('texto: entre 1 y 200 caracteres', () => {
      expect(interpretarValor(TipoValorParametro.Texto, '  hola ')).toEqual({
        numerico: null,
        texto: 'hola',
      });
      expect(falla(TipoValorParametro.Texto, '   ')).toBe(400);
      expect(falla(TipoValorParametro.Texto, 'x'.repeat(201))).toBe(400);
    });

    it('valorComoTexto muestra números sin ceros sobrantes', () => {
      expect(valorComoTexto({ numerico: 19, texto: null })).toBe('19');
      expect(valorComoTexto({ numerico: 12.5, texto: null })).toBe('12.5');
      expect(valorComoTexto({ numerico: null, texto: 'abc' })).toBe('abc');
    });
  });
});
