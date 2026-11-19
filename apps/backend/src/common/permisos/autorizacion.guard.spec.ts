import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AuditoriaController } from '../../modules/auditoria/auditoria.controller.js';
import { UsuariosController } from '../../modules/usuarios/usuarios.controller.js';
import {
  crearContexto,
  metodosDeControlador,
} from '../../../test/utils/contexto.js';
import type { ActorAutenticado } from '../auth/actor.js';
import { AutorizacionGuard } from './autorizacion.guard.js';
import { Publico, RequierePermiso, Roles } from './decoradores.js';
import { Rol } from './rol.js';

class ControladorDePrueba {
  @Roles(Rol.Admin)
  soloAdmin(): void {}

  @RequierePermiso('usuarios.crear')
  porPermisoAdmin(): void {}

  @RequierePermiso('oc.aprobar')
  porPermisoOperativo(): void {}

  libre(): void {}

  @Publico()
  publico(): void {}
}

const actor = (rol: Rol): ActorAutenticado => ({
  id: 1,
  correo: 'a@nomade.cl',
  nombre: 'A',
  rol,
  debeCambiarClave: false,
  sesionId: 1,
  sesionExpiraEn: new Date(),
});

describe('AutorizacionGuard', () => {
  const guard = new AutorizacionGuard(new Reflector());
  const probar = (metodo: string, rol?: Rol) =>
    guard.canActivate(
      crearContexto(
        ControladorDePrueba,
        metodo,
        rol ? { usuario: actor(rol) } : {},
      ),
    );

  it('@Roles(admin): admin pasa, usuario recibe 403', () => {
    expect(probar('soloAdmin', Rol.Admin)).toBe(true);
    expect(() => probar('soloAdmin', Rol.Usuario)).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it('@RequierePermiso resuelve con el mapa central', () => {
    expect(probar('porPermisoAdmin', Rol.Admin)).toBe(true);
    expect(() => probar('porPermisoAdmin', Rol.Usuario)).toThrow(
      expect.objectContaining({ status: 403 }),
    );
    expect(probar('porPermisoOperativo', Rol.Usuario)).toBe(true);
  });

  it('sin metadatos, cualquier usuario autenticado pasa', () => {
    expect(probar('libre', Rol.Usuario)).toBe(true);
  });

  it('endpoint público no exige usuario', () => {
    expect(probar('publico')).toBe(true);
  });

  it('con metadatos pero sin usuario en el request responde 403', () => {
    expect(() => probar('soloAdmin')).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it('un usuario recibe 403 en TODOS los endpoints de administración', () => {
    for (const controlador of [UsuariosController, AuditoriaController]) {
      const metodos = metodosDeControlador(controlador);
      expect(metodos.length).toBeGreaterThan(0);
      for (const metodo of metodos) {
        const contexto = (rol: Rol) =>
          crearContexto(controlador, metodo, { usuario: actor(rol) });
        expect(
          () => guard.canActivate(contexto(Rol.Usuario)),
          `${controlador.name}.${metodo}`,
        ).toThrow(expect.objectContaining({ status: 403 }));
        expect(
          guard.canActivate(contexto(Rol.Admin)),
          `${controlador.name}.${metodo}`,
        ).toBe(true);
      }
    }
  });
});
