import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import {
  HashFalso,
  UsuariosRepositorioFake,
  comoRepositorio,
  crearUsuario,
} from '../../../test/utils/fakes.js';
import type { ConexionBaseDatos } from '../../database/conexion-base-datos.js';
import type { AuditoriaService } from '../auditoria/auditoria.service.js';
import { AdminInicialService } from './admin-inicial.service.js';

function preparar(
  entorno: Record<string, string | undefined>,
  usuarios = [] as ReturnType<typeof crearUsuario>[],
) {
  const repo = new UsuariosRepositorioFake().semilla(...usuarios);
  const auditoria = { registrarSinFallar: vi.fn(() => Promise.resolve()) };
  const servicio = new AdminInicialService(
    { get: (clave: string) => entorno[clave] } as unknown as ConfigService<
      never,
      true
    >,
    comoRepositorio(repo),
    new HashFalso(),
    auditoria as unknown as AuditoriaService,
    { conectar: () => Promise.resolve(true) } as unknown as ConexionBaseDatos,
  );
  return { servicio, repo, auditoria };
}

const entorno = {
  ADMIN_EMAIL: 'Admin@Nomade.cl',
  ADMIN_PASSWORD: 'clave-inicial-1234',
  ADMIN_NAME: 'Administrador',
};

describe('AdminInicialService', () => {
  it('crea el primer admin si no hay usuarios, obligado a cambiar la clave', async () => {
    const t = preparar(entorno);
    await expect(t.servicio.asegurarAdministrador()).resolves.toBe('creado');
    const admin = [...t.repo.usuarios.values()][0];
    expect(admin).toMatchObject({
      correo: 'admin@nomade.cl',
      rol: 'admin',
      activo: true,
      debeCambiarClave: true,
      claveHash: 'hash:clave-inicial-1234',
    });
    expect(t.auditoria.registrarSinFallar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'usuario.crear_admin_inicial' }),
    );
  });

  it('no hace nada si ya existen usuarios', async () => {
    const t = preparar(entorno, [crearUsuario({ correo: 'otro@nomade.cl' })]);
    await expect(t.servicio.asegurarAdministrador()).resolves.toBe(
      'ya_hay_usuarios',
    );
    expect(t.repo.usuarios.size).toBe(1);
  });

  it('sin ADMIN_EMAIL/ADMIN_PASSWORD no crea nada', async () => {
    const t = preparar({});
    await expect(t.servicio.asegurarAdministrador()).resolves.toBe(
      'sin_configuracion',
    );
    expect(t.repo.usuarios.size).toBe(0);
  });

  it('es idempotente: una segunda ejecución no duplica', async () => {
    const t = preparar(entorno);
    await t.servicio.asegurarAdministrador();
    await expect(t.servicio.asegurarAdministrador()).resolves.toBe(
      'ya_hay_usuarios',
    );
    expect(t.repo.usuarios.size).toBe(1);
  });
});
