import type { DataSource } from 'typeorm';

/** Nombres de los usuarios indicados (para mostrar quién creó, envió o resolvió un documento). */
export async function nombresDeUsuarios(
  dataSource: DataSource,
  ids: readonly number[],
): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map();
  const filas = await dataSource.query<{ id: string; nombre: string }[]>(
    'SELECT id, nombre FROM nomade.usuario WHERE id = ANY($1::bigint[])',
    [[...ids]],
  );
  return new Map(filas.map((f) => [Number(f.id), f.nombre]));
}
