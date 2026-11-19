import { describe, expect, it } from 'vitest';
import { MonedaContrato } from '../obras/obras.tipos.js';
import type { CeldaCruda } from './planilla.js';
import {
  interpretarNumero,
  montoDeFilasValidas,
  validarFilasPresupuesto,
  type ContextoValidacion,
} from './validacion-presupuesto.js';

const familias = [
  { id: 10, codigo: 'obra_gruesa', nombre: 'Obra gruesa' },
  { id: 11, codigo: 'instalaciones', nombre: 'Instalaciones eléctricas' },
];
const ctx = (moneda = MonedaContrato.Clp): ContextoValidacion => ({
  moneda,
  familias,
});

const fila = (
  numeroFila: number,
  celdas: Partial<Record<string, CeldaCruda>> = {},
) => ({
  numeroFila,
  celdas: {
    codigo: '1.1',
    familia: 'Obra gruesa',
    descripcion: 'Radier de hormigón',
    unidad: 'm2',
    cantidad: 10,
    precioUnitario: 1000,
    ...celdas,
  } as never,
});

const errores = (resultado: {
  errores: { campo: string; mensaje: string }[];
}) => resultado.errores.map((e) => `${e.campo}: ${e.mensaje}`);

describe('interpretarNumero (formato chileno)', () => {
  it.each([
    ['120,5', 120.5],
    ['1.234,56', 1234.56],
    ['1.234.567', 1234567],
    ['1.500', 1500],
    ['9.500', 9500],
    ['12.5', 12.5],
    ['1,234.56', 1234.56],
    ['1,234,567', 1234567],
    ['18500', 18500],
    ['$ 18.500', 18500],
    ['UF 4.710,5', 4710.5],
    ['CLP 1.000', 1000],
    ['-5', -5],
    ['0,0001', 0.0001],
  ])('«%s» → %s', (texto, esperado) => {
    expect(interpretarNumero(texto)).toBe(esperado);
  });

  it('números de Excel pasan tal cual; vacío es null', () => {
    expect(interpretarNumero(12.5)).toBe(12.5);
    expect(interpretarNumero(0)).toBe(0);
    expect(interpretarNumero(null)).toBeNull();
    expect(interpretarNumero('')).toBeNull();
    expect(interpretarNumero('   ')).toBeNull();
  });

  it.each(['abc', '1.2.3', '12a', '--5', ',', '#DIV/0!', '1 2 3 x'])(
    '«%s» no es un número',
    (texto) => {
      expect(interpretarNumero(texto)).toBeUndefined();
    },
  );
});

describe('validarFilasPresupuesto', () => {
  it('una fila correcta se normaliza y calcula su total', () => {
    const [r] = validarFilasPresupuesto(
      [fila(2, { cantidad: '120,5', precioUnitario: '18.500' })],
      ctx(),
    );
    expect(r.errores).toEqual([]);
    expect(r.partida).toEqual({
      codigo: '1.1',
      familiaId: 10,
      descripcion: 'Radier de hormigón',
      unidad: 'm2',
      cantidad: 120.5,
      precioUnitario: 18500,
    });
    expect(r.total).toBe(2_229_250);
  });

  it('reconoce la familia por código o nombre, sin importar mayúsculas, tildes ni guiones', () => {
    const resultados = validarFilasPresupuesto(
      [
        fila(2, { codigo: 'A', familia: 'obra_gruesa' }),
        fila(3, { codigo: 'B', familia: 'OBRA GRUESA' }),
        fila(4, { codigo: 'C', familia: 'instalaciones electricas' }),
        fila(5, { codigo: 'D', familia: 'Instalaciones eléctricas' }),
      ],
      ctx(),
    );
    expect(resultados.map((r) => r.partida?.familiaId)).toEqual([
      10, 10, 11, 11,
    ]);
  });

  it('informa todos los errores de la fila, cada uno en su columna', () => {
    const [r] = validarFilasPresupuesto(
      [
        fila(7, {
          codigo: null,
          familia: 'Inexistente',
          descripcion: null,
          unidad: null,
          cantidad: 'x',
          precioUnitario: null,
        }),
      ],
      ctx(),
    );
    expect(r.partida).toBeNull();
    expect(errores(r)).toEqual([
      'codigo: El código es obligatorio.',
      'familia: La familia «Inexistente» no existe en el catálogo o está inactiva.',
      'descripcion: La descripción es obligatoria.',
      'unidad: La unidad es obligatoria.',
      'cantidad: La cantidad no es un número.',
      'precioUnitario: El precio unitario es obligatorio.',
    ]);
  });

  it('familia vacía', () => {
    const [r] = validarFilasPresupuesto([fila(2, { familia: null })], ctx());
    expect(errores(r)).toEqual(['familia: La familia es obligatoria.']);
  });

  it('valida el formato del código', () => {
    for (const codigo of ['1 1', '-1', 'ñ', 'x'.repeat(31), '1/2']) {
      const [r] = validarFilasPresupuesto([fila(2, { codigo })], ctx());
      expect(errores(r)[0], codigo).toMatch(
        /^codigo: El código debe tener 1 a 30/,
      );
    }
    // Un código numérico de Excel se acepta como texto.
    const [ok] = validarFilasPresupuesto([fila(2, { codigo: 12 })], ctx());
    expect(ok.partida?.codigo).toBe('12');
  });

  it('detecta códigos repetidos en la planilla (sin distinguir mayúsculas) y apunta a la primera fila', () => {
    const r = validarFilasPresupuesto(
      [
        fila(2, { codigo: 'A1' }),
        fila(3, { codigo: 'B' }),
        fila(4, { codigo: 'a1' }),
      ],
      ctx(),
    );
    expect(r[0].errores).toEqual([]);
    expect(r[1].errores).toEqual([]);
    expect(errores(r[2])).toEqual([
      'codigo: El código «a1» ya aparece en la fila 2.',
    ]);
  });

  it('descripción: mínimo 2 y máximo 300; unidad: máximo 20', () => {
    const [corta, larga, unidad] = validarFilasPresupuesto(
      [
        fila(2, { codigo: 'A', descripcion: 'x' }),
        fila(3, { codigo: 'B', descripcion: 'x'.repeat(301) }),
        fila(4, { codigo: 'C', unidad: 'u'.repeat(21) }),
      ],
      ctx(),
    );
    expect(errores(corta)).toEqual([
      'descripcion: La descripción debe tener al menos 2 caracteres.',
    ]);
    expect(errores(larga)).toEqual([
      'descripcion: La descripción debe tener como máximo 300 caracteres.',
    ]);
    expect(errores(unidad)).toEqual([
      'unidad: La unidad debe tener como máximo 20 caracteres.',
    ]);
  });

  it('cantidad: mayor que cero y hasta 4 decimales', () => {
    const r = validarFilasPresupuesto(
      [
        fila(2, { codigo: 'A', cantidad: 0 }),
        fila(3, { codigo: 'B', cantidad: -2 }),
        fila(4, { codigo: 'C', cantidad: '1,23456' }),
        fila(5, { codigo: 'D', cantidad: null }),
      ],
      ctx(),
    );
    expect(errores(r[0])).toEqual([
      'cantidad: La cantidad debe ser mayor que cero.',
    ]);
    expect(errores(r[1])).toEqual([
      'cantidad: La cantidad debe ser mayor que cero.',
    ]);
    expect(errores(r[2])).toEqual([
      'cantidad: La cantidad admite hasta 4 decimales.',
    ]);
    expect(errores(r[3])).toEqual(['cantidad: La cantidad es obligatoria.']);
  });

  it('precio en una obra en CLP: entero y no negativo', () => {
    const r = validarFilasPresupuesto(
      [
        fila(2, { codigo: 'A', precioUnitario: '1000,5' }),
        fila(3, { codigo: 'B', precioUnitario: -1 }),
        fila(4, { codigo: 'C', precioUnitario: 0 }),
      ],
      ctx(MonedaContrato.Clp),
    );
    expect(errores(r[0])).toEqual([
      'precioUnitario: En una obra en CLP el precio unitario debe ser un número entero.',
    ]);
    expect(errores(r[1])).toEqual([
      'precioUnitario: El precio unitario no puede ser negativo.',
    ]);
    expect(r[2].errores).toEqual([]);
  });

  it('precio en una obra en UF: hasta 4 decimales', () => {
    const r = validarFilasPresupuesto(
      [
        fila(2, { codigo: 'A', precioUnitario: '120,1234' }),
        fila(3, { codigo: 'B', precioUnitario: '120,12345' }),
      ],
      ctx(MonedaContrato.Uf),
    );
    expect(r[0].errores).toEqual([]);
    expect(r[0].total).toBe(1201.234);
    expect(errores(r[1])).toEqual([
      'precioUnitario: El precio unitario en UF admite hasta 4 decimales.',
    ]);
  });

  it('un total que no cabe en la base de datos es un error de la fila', () => {
    const [r] = validarFilasPresupuesto(
      [
        fila(2, {
          cantidad: 1_000_000_000_000,
          precioUnitario: 1_000_000_000_000,
        }),
      ],
      ctx(),
    );
    expect(errores(r)).toEqual([
      'precioUnitario: El total de la fila supera el máximo permitido.',
    ]);
    expect(r.total).toBeNull();
  });

  it('el monto del lote suma solo las filas válidas, de forma exacta', () => {
    const resultados = validarFilasPresupuesto(
      [
        fila(2, { codigo: 'A', cantidad: 0.1, precioUnitario: '0,2' }),
        fila(3, { codigo: 'B', cantidad: 0.2, precioUnitario: '0,2' }),
        fila(4, { codigo: 'C', cantidad: null }),
      ],
      ctx(MonedaContrato.Uf),
    );
    expect(montoDeFilasValidas(resultados, MonedaContrato.Uf)).toBe(0.06);
  });
});
