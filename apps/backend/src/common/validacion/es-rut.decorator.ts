import { Transform } from 'class-transformer';
import { IsString, registerDecorator } from 'class-validator';
import { esRutValido, normalizarRut } from './rut.js';

const MENSAJE = 'Ingresa un RUT válido (por ejemplo 12.345.678-5).';

/**
 * Valida un RUT chileno (módulo 11) y lo normaliza a `12345678-5` antes de
 * llegar al servicio. Los demás campos de texto se recortan por separado.
 */
export function EsRut(): PropertyDecorator {
  return (objetivo, propiedad) => {
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string'
        ? (normalizarRut(value) ?? value.trim())
        : value,
    )(objetivo, propiedad);
    IsString({ message: MENSAJE })(objetivo, propiedad);
    registerDecorator({
      name: 'esRut',
      target: objetivo.constructor,
      propertyName: propiedad as string,
      options: { message: MENSAJE },
      validator: {
        validate: (valor: unknown) =>
          typeof valor === 'string' && esRutValido(valor),
      },
    });
  };
}
