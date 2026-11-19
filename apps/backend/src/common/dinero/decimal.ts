/**
 * Aritmética decimal exacta (BigInt) para convertir entre UF y CLP sin los
 * errores de redondeo del punto flotante.
 */

/** Cantidad de decimales de los montos en UF y del valor de la UF. */
export const DECIMALES_UF = 4;

interface Decimal {
  /** Valor multiplicado por 10^escala. */
  valor: bigint;
  escala: number;
}

function parsear(entrada: number | string): Decimal {
  const texto = typeof entrada === 'number' ? entrada.toFixed(8) : entrada;
  const coincide = /^(-?)(\d+)(?:\.(\d+))?$/.exec(texto.trim());
  if (!coincide) throw new Error(`Valor decimal inválido: ${String(entrada)}`);
  const [, signo, entera, fraccion = ''] = coincide;
  const sinCeros = fraccion.replace(/0+$/, '');
  const magnitud = BigInt(entera + sinCeros);
  return {
    valor: signo === '-' ? -magnitud : magnitud,
    escala: sinCeros.length,
  };
}

/** Divide redondeando half-up (hacia el infinito en empates, simétrico). */
function dividirRedondeando(numerador: bigint, denominador: bigint): bigint {
  const negativo = numerador < 0n !== denominador < 0n;
  const n = numerador < 0n ? -numerador : numerador;
  const d = denominador < 0n ? -denominador : denominador;
  const cociente = (2n * n + d) / (2n * d);
  return negativo ? -cociente : cociente;
}

function aTexto(valor: bigint, escala: number): string {
  const negativo = valor < 0n;
  const digitos = (negativo ? -valor : valor)
    .toString()
    .padStart(escala + 1, '0');
  const entera = digitos.slice(0, digitos.length - escala);
  const fraccion = digitos.slice(digitos.length - escala);
  return `${negativo ? '-' : ''}${entera}${escala > 0 ? `.${fraccion}` : ''}`;
}

/** `a × b` redondeado (half-up) a `decimales` decimales; devuelve un `number`. */
export function multiplicar(
  a: number | string,
  b: number | string,
  decimales: number,
): number {
  const x = parsear(a);
  const y = parsear(b);
  const escalaProducto = x.escala + y.escala;
  const producto = x.valor * y.valor;
  const objetivo = 10n ** BigInt(Math.max(escalaProducto - decimales, 0));
  const ajustado =
    escalaProducto >= decimales
      ? dividirRedondeando(producto, objetivo)
      : producto * 10n ** BigInt(decimales - escalaProducto);
  return Number(aTexto(ajustado, decimales));
}

/** `a ÷ b` redondeado (half-up) a `decimales` decimales; devuelve un `number`. */
export function dividir(
  a: number | string,
  b: number | string,
  decimales: number,
): number {
  const x = parsear(a);
  const y = parsear(b);
  if (y.valor === 0n) throw new Error('División por cero');
  // (x.valor / 10^ex) / (y.valor / 10^ey) × 10^dec = x.valor × 10^(ey + dec) / (y.valor × 10^ex)
  const numerador = x.valor * 10n ** BigInt(y.escala + decimales);
  const denominador = y.valor * 10n ** BigInt(x.escala);
  return Number(aTexto(dividirRedondeando(numerador, denominador), decimales));
}

/**
 * Suma exacta de valores decimales con `decimales` decimales; un valor con más decimales se
 * redondea (half-up) antes de sumarlo.
 */
export function sumar(
  valores: readonly (number | string)[],
  decimales: number,
): number {
  let acumulado = 0n;
  for (const valor of valores) {
    const x = parsear(valor);
    acumulado +=
      x.escala <= decimales
        ? x.valor * 10n ** BigInt(decimales - x.escala)
        : dividirRedondeando(x.valor, 10n ** BigInt(x.escala - decimales));
  }
  return Number(aTexto(acumulado, decimales));
}
