import type { ValueTransformer } from 'typeorm';

/**
 * `bigint` llega desde `pg` como `string`. Los identificadores (D-13) caben
 * sin pérdida en un `number` (< 2^53), que es lo que expone la API.
 */
export const bigintANumero: ValueTransformer = {
  to: (valor: number | null | undefined) => valor,
  from: (valor: string | number | null) =>
    valor === null || valor === undefined ? null : Number(valor),
};
