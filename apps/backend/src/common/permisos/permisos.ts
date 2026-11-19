import { Rol } from './rol.js';

/**
 * Permisos de administración (D-03): solo el rol `admin`.
 * Usuarios (P25), auditoría (P26), parámetros y catálogos (P27), migración/integraciones
 * (P23), importación masiva (P24) y datos bancarios de proveedores (D-17).
 */
export const PERMISOS_ADMINISTRACION = [
  'usuarios.consultar',
  'usuarios.crear',
  'usuarios.actualizar',
  'usuarios.activar',
  'usuarios.restablecer_clave',
  'auditoria.consultar',
  'parametros.administrar',
  'catalogos.administrar',
  'migracion.administrar',
  'importaciones.administrar',
  'proveedores.datos_bancarios.consultar',
  'proveedores.datos_bancarios.modificar',
] as const;

/**
 * Permisos operativos: los tienen ambos roles. Se declaran desde ahora los
 * códigos de aprobación del plan (§9.2) para que los controladores de las
 * fases siguientes los usen sin cambiar la resolución.
 */
export const PERMISOS_OPERATIVOS = [
  'oc.aprobar',
  'lote.aprobar',
  'eepp.aprobar',
  'presupuesto.aprobar',
] as const;

export type PermisoAdministracion = (typeof PERMISOS_ADMINISTRACION)[number];
export type PermisoOperativo = (typeof PERMISOS_OPERATIVOS)[number];
export type Permiso = PermisoAdministracion | PermisoOperativo;

const ADMINISTRACION: ReadonlySet<string> = new Set(PERMISOS_ADMINISTRACION);

/** Códigos de permiso que exigen aprobación con control de autoaprobación (D-10). */
export const PERMISOS_DE_APROBACION: readonly Permiso[] = PERMISOS_OPERATIVOS;

/**
 * Resolución central: admin → todo; usuario → todo salvo administración (D-03).
 * Cuando existan perfiles finos o acceso por obra, solo cambia esta función.
 */
export function tienePermiso(rol: Rol, permiso: Permiso): boolean {
  if (rol === Rol.Admin) return true;
  return !ADMINISTRACION.has(permiso);
}

/** Permisos efectivos de un rol (se informan al frontend en la sesión). */
export function permisosDe(rol: Rol): Permiso[] {
  const todos: readonly Permiso[] = [
    ...PERMISOS_ADMINISTRACION,
    ...PERMISOS_OPERATIVOS,
  ];
  return todos.filter((permiso) => tienePermiso(rol, permiso));
}
