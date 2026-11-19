import type { ExecutionContext, Type } from '@nestjs/common';
import type { RequestConActor } from '../../src/common/auth/actor.js';

/** `ExecutionContext` mínimo para probar guards e interceptores sin levantar HTTP. */
export function crearContexto(
  clase: Type<unknown>,
  nombreMetodo: string,
  req: Partial<RequestConActor> = {},
  res: Record<string, unknown> = {},
): ExecutionContext {
  const prototipo = clase.prototype as Record<
    string,
    (...a: never[]) => unknown
  >;
  return {
    getClass: () => clase,
    getHandler: () => prototipo[nombreMetodo],
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
}

/** Nombres de los métodos que son handlers HTTP de un controlador. */
export function metodosDeControlador(clase: Type<unknown>): string[] {
  return Object.getOwnPropertyNames(clase.prototype).filter(
    (nombre) =>
      nombre !== 'constructor' &&
      typeof (clase.prototype as Record<string, unknown>)[nombre] ===
        'function',
  );
}
