import { randomInt } from 'node:crypto';

// Sin caracteres ambiguos (0/O, 1/l/I) para entregarla por teléfono o chat.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const LARGO = 16;

/** Contraseña temporal aleatoria (criptográficamente segura) que cumple la política (≥ 12). */
export function generarClaveTemporal(): string {
  let clave = '';
  for (let i = 0; i < LARGO; i++) clave += ALFABETO[randomInt(ALFABETO.length)];
  return clave;
}
