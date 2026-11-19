import { QueryFailedError } from 'typeorm';

/** `unique_violation` de PostgreSQL (23505), opcionalmente de una restricción concreta. */
export function esViolacionUnica(
  error: unknown,
  restriccion?: string,
): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driver = error.driverError as
    { code?: string; constraint?: string } | undefined;
  if (driver?.code !== '23505') return false;
  return restriccion === undefined || driver.constraint === restriccion;
}
