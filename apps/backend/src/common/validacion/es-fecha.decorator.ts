import { registerDecorator } from 'class-validator';
import { esFechaValida } from '../tiempo/reloj.js';

const MENSAJE = 'Ingresa una fecha válida con el formato AAAA-MM-DD.';

/** Valida una fecha de calendario `YYYY-MM-DD` (sin hora). */
export function EsFechaIso(mensaje = MENSAJE): PropertyDecorator {
  return (objetivo, propiedad) => {
    registerDecorator({
      name: 'esFechaIso',
      target: objetivo.constructor,
      propertyName: propiedad as string,
      options: { message: mensaje },
      validator: {
        validate: (valor: unknown) =>
          typeof valor === 'string' && esFechaValida(valor),
      },
    });
  };
}
