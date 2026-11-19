import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  crearContexto,
  metodosDeControlador,
} from '../../../test/utils/contexto.js';
import type { ActorAutenticado } from '../../common/auth/actor.js';
import { AutorizacionGuard } from '../../common/permisos/autorizacion.guard.js';
import { CLAVE_PERMISO } from '../../common/permisos/decoradores.js';
import { Rol } from '../../common/permisos/rol.js';
import { ImportacionesController } from '../importaciones/importaciones.controller.js';
import { PresupuestosController } from './presupuestos.controller.js';

const actor = (rol: Rol): ActorAutenticado => ({
  id: 1,
  correo: 'a@nomade.cl',
  nombre: 'A',
  rol,
  debeCambiarClave: false,
  sesionId: 1,
  sesionExpiraEn: new Date(),
});

const guard = new AutorizacionGuard(new Reflector());
const pasa = (
  clase: typeof ImportacionesController | typeof PresupuestosController,
  metodo: string,
  rol: Rol,
) => guard.canActivate(crearContexto(clase, metodo, { usuario: actor(rol) }));

describe('permisos de presupuestos e importaciones', () => {
  it('P24 es solo admin: un usuario recibe 403 en todos los endpoints de importación (D-11)', () => {
    const metodos = metodosDeControlador(ImportacionesController);
    expect(metodos.length).toBeGreaterThanOrEqual(7);
    for (const metodo of metodos) {
      expect(
        () => pasa(ImportacionesController, metodo, Rol.Usuario),
        metodo,
      ).toThrow(expect.objectContaining({ status: 403 }));
      expect(pasa(ImportacionesController, metodo, Rol.Admin), metodo).toBe(
        true,
      );
    }
  });

  it('aprobar y rechazar declaran el permiso presupuesto.aprobar', () => {
    const reflector = new Reflector();
    for (const metodo of ['aprobarPresupuesto', 'rechazarPresupuesto']) {
      const permiso = reflector.get<string>(
        CLAVE_PERMISO,
        PresupuestosController.prototype[
          metodo as keyof PresupuestosController
        ],
      );
      expect(permiso, metodo).toBe('presupuesto.aprobar');
    }
  });

  it('el resto de las acciones de presupuesto las pueden hacer ambos roles', () => {
    for (const metodo of metodosDeControlador(PresupuestosController)) {
      expect(pasa(PresupuestosController, metodo, Rol.Usuario), metodo).toBe(
        true,
      );
      expect(pasa(PresupuestosController, metodo, Rol.Admin), metodo).toBe(
        true,
      );
    }
  });
});
