import type { Usuario } from './usuario.entity.js';
import type { UsuarioDto } from './usuarios.dto.js';

const iso = (fecha: Date | null): string | null =>
  fecha ? fecha.toISOString() : null;

/** Proyección pública: nunca incluye `claveHash` ni contadores internos. */
export function aUsuarioDto(usuario: Usuario): UsuarioDto {
  return {
    id: usuario.id,
    correo: usuario.correo,
    nombre: usuario.nombre,
    rol: usuario.rol,
    activo: usuario.activo,
    debeCambiarClave: usuario.debeCambiarClave,
    bloqueadoHasta: iso(usuario.bloqueadoHasta),
    ultimoAccesoEn: iso(usuario.ultimoAccesoEn),
    tema: usuario.tema,
    creadoEn: usuario.createdAt.toISOString(),
    actualizadoEn: usuario.updatedAt.toISOString(),
    version: usuario.version,
  };
}
