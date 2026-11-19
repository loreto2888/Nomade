import { multiplicar, sumar } from '../../common/dinero/decimal.js';
import {
  TOPE_TOTAL,
  decimalesDeMoneda,
  errorDeCantidad,
  errorDePrecio,
} from '../presupuestos/calculo.js';
import {
  normalizarEncabezado,
  type ClaveColumna,
} from '../presupuestos/columnas-planilla.js';
import type { PartidaNueva } from '../presupuestos/presupuestos.service.js';
import type { MonedaContrato } from '../obras/obras.tipos.js';
import type { ErrorFilaImportacion } from './importacion-fila.entity.js';
import type { CeldaCruda, FilaCruda } from './planilla.js';

export interface FamiliaDisponible {
  id: number;
  codigo: string;
  nombre: string;
}

export interface ContextoValidacion {
  /** Moneda de la obra de destino (condiciona los decimales del precio). */
  moneda: MonedaContrato;
  /** Familias activas del catálogo. */
  familias: readonly FamiliaDisponible[];
}

export interface ResultadoFila {
  numeroFila: number;
  errores: ErrorFilaImportacion[];
  /** Partida normalizada; solo cuando la fila no tiene errores. */
  partida: PartidaNueva | null;
  /** `cantidad × precio` en la moneda de la obra (cuando ambos valen), para el monto de la vista previa. */
  total: number | null;
}

const PATRON_CODIGO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/;

/**
 * Número escrito a la chilena: el punto separa miles y la coma los decimales (`1.234,56`).
 * Sin coma, `1.500` es mil quinientos (grupos de tres) y `12.5` es doce con cinco. Acepta `$`,
 * `UF` y `CLP` delante. `null` si está vacío; `undefined` si no es un número.
 */
export function interpretarNumero(
  valor: CeldaCruda | undefined,
): number | null | undefined {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number')
    return Number.isFinite(valor) ? valor : undefined;

  const texto = valor.replace(/\s+/g, '').replace(/^(\$|UF|CLP)/i, '');
  if (texto === '') return null;
  if (!/^-?[\d.,]+$/.test(texto) || !/\d/.test(texto)) return undefined;

  const ultimoPunto = texto.lastIndexOf('.');
  const ultimaComa = texto.lastIndexOf(',');
  let normalizado: string;
  if (ultimoPunto !== -1 && ultimaComa !== -1) {
    // Decimal es el separador que aparece al final.
    normalizado =
      ultimaComa > ultimoPunto
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto.replace(/,/g, '');
  } else if (ultimaComa !== -1) {
    normalizado =
      texto.split(',').length === 2
        ? texto.replace(',', '.')
        : texto.replace(/,/g, '');
  } else if (ultimoPunto !== -1) {
    normalizado = /^-?\d{1,3}(\.\d{3})+$/.test(texto)
      ? texto.replace(/\./g, '')
      : texto.split('.').length === 2
        ? texto
        : '';
  } else {
    normalizado = texto;
  }
  const numero = Number(normalizado);
  return normalizado !== '' && Number.isFinite(numero) ? numero : undefined;
}

const comoTexto = (valor: CeldaCruda): string =>
  valor === null ? '' : String(valor).trim();

/**
 * Valida las filas de una planilla de presupuesto: campos obligatorios, formato del código, código
 * no repetido en la planilla, familia del catálogo, cantidad y precio (según la moneda de la obra)
 * y monto total acotado. Cada fila informa todos sus errores.
 */
export function validarFilasPresupuesto(
  filas: readonly Pick<FilaCruda, 'numeroFila' | 'celdas'>[],
  contexto: ContextoValidacion,
): ResultadoFila[] {
  const familiaPorClave = new Map<string, FamiliaDisponible>();
  for (const f of contexto.familias) {
    familiaPorClave.set(normalizarEncabezado(f.codigo), f);
    familiaPorClave.set(normalizarEncabezado(f.nombre), f);
  }
  const primeraFilaDelCodigo = new Map<string, number>();

  return filas.map(({ numeroFila, celdas }) => {
    const errores: ErrorFilaImportacion[] = [];
    const error = (campo: ClaveColumna, mensaje: string) =>
      errores.push({ campo, mensaje });

    // Código
    const codigo = comoTexto(celdas.codigo);
    if (codigo === '') {
      error('codigo', 'El código es obligatorio.');
    } else if (!PATRON_CODIGO.test(codigo)) {
      error(
        'codigo',
        'El código debe tener 1 a 30 caracteres: letras, dígitos, punto, guion o guion bajo.',
      );
    } else {
      const clave = codigo.toLowerCase();
      const previa = primeraFilaDelCodigo.get(clave);
      if (previa !== undefined) {
        error(
          'codigo',
          `El código «${codigo}» ya aparece en la fila ${previa}.`,
        );
      } else {
        primeraFilaDelCodigo.set(clave, numeroFila);
      }
    }

    // Familia
    const textoFamilia = comoTexto(celdas.familia);
    let familia: FamiliaDisponible | undefined;
    if (textoFamilia === '') {
      error('familia', 'La familia es obligatoria.');
    } else {
      familia = familiaPorClave.get(normalizarEncabezado(textoFamilia));
      if (!familia) {
        error(
          'familia',
          `La familia «${textoFamilia}» no existe en el catálogo o está inactiva.`,
        );
      }
    }

    // Descripción y unidad
    const descripcion = comoTexto(celdas.descripcion);
    if (descripcion === '')
      error('descripcion', 'La descripción es obligatoria.');
    else if (descripcion.length < 2) {
      error('descripcion', 'La descripción debe tener al menos 2 caracteres.');
    } else if (descripcion.length > 300) {
      error(
        'descripcion',
        'La descripción debe tener como máximo 300 caracteres.',
      );
    }
    const unidad = comoTexto(celdas.unidad);
    if (unidad === '') error('unidad', 'La unidad es obligatoria.');
    else if (unidad.length > 20) {
      error('unidad', 'La unidad debe tener como máximo 20 caracteres.');
    }

    // Cantidad y precio
    const cantidad = interpretarNumero(celdas.cantidad);
    let cantidadValida: number | null = null;
    if (cantidad === null) error('cantidad', 'La cantidad es obligatoria.');
    else if (cantidad === undefined)
      error('cantidad', 'La cantidad no es un número.');
    else {
      const mensaje = errorDeCantidad(cantidad);
      if (mensaje) error('cantidad', mensaje);
      else cantidadValida = cantidad;
    }
    const precio = interpretarNumero(celdas.precioUnitario);
    let precioValido: number | null = null;
    if (precio === null)
      error('precioUnitario', 'El precio unitario es obligatorio.');
    else if (precio === undefined) {
      error('precioUnitario', 'El precio unitario no es un número.');
    } else {
      const mensaje = errorDePrecio(precio, contexto.moneda);
      if (mensaje) error('precioUnitario', mensaje);
      else precioValido = precio;
    }

    let total: number | null = null;
    if (cantidadValida !== null && precioValido !== null) {
      total = multiplicar(
        cantidadValida,
        precioValido,
        decimalesDeMoneda(contexto.moneda),
      );
      if (total > TOPE_TOTAL) {
        error(
          'precioUnitario',
          'El total de la fila supera el máximo permitido.',
        );
        total = null;
      }
    }

    const partida: PartidaNueva | null =
      errores.length === 0
        ? {
            codigo,
            familiaId: familia!.id,
            descripcion,
            unidad,
            cantidad: cantidadValida!,
            precioUnitario: precioValido!,
          }
        : null;
    return { numeroFila, errores, partida, total };
  });
}

/** Monto (en la moneda de la obra) de las filas válidas. */
export function montoDeFilasValidas(
  resultados: readonly ResultadoFila[],
  moneda: MonedaContrato,
): number {
  return sumar(
    resultados
      .filter((r) => r.errores.length === 0 && r.total !== null)
      .map((r) => r.total!),
    decimalesDeMoneda(moneda),
  );
}
