import type { SesionApi } from '@/api/auth';
import type { UsuarioDto } from '@/api/generated';

const PERMISOS_OPERATIVOS = ['oc.aprobar', 'lote.aprobar', 'eepp.aprobar'];
const PERMISOS_ADMIN = ['usuarios.consultar', 'usuarios.crear', 'auditoria.consultar'];

export const sesionAdmin: SesionApi = {
  usuario: {
    id: 1,
    correo: 'admin@nomade.cl',
    nombre: 'Ana Administradora',
    rol: 'admin',
    debeCambiarClave: false,
    tema: 'claro',
  },
  permisos: [...PERMISOS_ADMIN, ...PERMISOS_OPERATIVOS],
  expiraEn: '2026-11-19T20:00:00.000Z',
};

export const sesionUsuario: SesionApi = {
  usuario: {
    id: 2,
    correo: 'camila@nomade.cl',
    nombre: 'Camila Rojas',
    rol: 'usuario',
    debeCambiarClave: false,
    tema: 'claro',
  },
  permisos: PERMISOS_OPERATIVOS,
  expiraEn: '2026-11-19T20:00:00.000Z',
};

export const sesionClaveTemporal: SesionApi = {
  ...sesionUsuario,
  usuario: { ...sesionUsuario.usuario, debeCambiarClave: true },
};

export function usuarioEjemplo(parcial: Partial<UsuarioDto> = {}): UsuarioDto {
  return {
    id: 2,
    correo: 'camila@nomade.cl',
    nombre: 'Camila Rojas',
    rol: 'usuario',
    activo: true,
    debeCambiarClave: false,
    bloqueadoHasta: null,
    ultimoAccesoEn: '2026-11-18T15:30:00.000Z',
    tema: 'claro',
    creadoEn: '2026-11-01T12:00:00.000Z',
    actualizadoEn: '2026-11-10T12:00:00.000Z',
    version: 3,
    ...parcial,
  };
}
