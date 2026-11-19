/** Escapa `%`, `_` y `\` para usarlos literalmente en un `LIKE`. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}
