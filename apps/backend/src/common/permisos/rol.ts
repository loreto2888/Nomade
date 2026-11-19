/** Roles de la plataforma (D-02). El `admin` tiene todos los permisos. */
export enum Rol {
  Admin = 'admin',
  Usuario = 'usuario',
}

export const ROLES: readonly Rol[] = [Rol.Admin, Rol.Usuario];

/** Preferencia de tema de la interfaz (D-12). */
export enum TemaInterfaz {
  Claro = 'claro',
  Oscuro = 'oscuro',
}
