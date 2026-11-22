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
import { MovimientosController } from '../movimientos/movimientos.controller.js';
import { CotizacionesController } from './cotizaciones.controller.js';
import { OrdenesCompraController } from './ordenes-compra.controller.js';
import { OrdenesTrabajoController } from './ordenes-trabajo.controller.js';

const actor = (rol: Rol): ActorAutenticado => ({
  id: 1,
  correo: 'a@nomade.cl',
  nombre: 'A',
  rol,
  debeCambiarClave: false,
  sesionId: 1,
  sesionExpiraEn: new Date(),
});

type Controlador =
  | typeof CotizacionesController
  | typeof OrdenesTrabajoController
  | typeof OrdenesCompraController
  | typeof MovimientosController;

const guard = new AutorizacionGuard(new Reflector());
const reflector = new Reflector();
const permisoDe = (clase: Controlador, metodo: string) =>
  reflector.get<string | undefined>(
    CLAVE_PERMISO,
    (clase.prototype as unknown as Record<string, () => void>)[metodo],
  );

describe('permisos de compras (fase 4)', () => {
  it('aprobar, rechazar y anular declaran su código de permiso', () => {
    expect(permisoDe(CotizacionesController, 'aprobarCotizacion')).toBe(
      'cotizacion.aprobar',
    );
    expect(permisoDe(CotizacionesController, 'rechazarCotizacion')).toBe(
      'cotizacion.aprobar',
    );
    expect(permisoDe(OrdenesTrabajoController, 'aprobarOrdenTrabajo')).toBe(
      'ot.aprobar',
    );
    expect(permisoDe(OrdenesTrabajoController, 'rechazarOrdenTrabajo')).toBe(
      'ot.aprobar',
    );
    expect(permisoDe(OrdenesTrabajoController, 'anularOrdenTrabajo')).toBe(
      'ot.anular',
    );
    expect(permisoDe(OrdenesCompraController, 'aprobarOrdenCompra')).toBe(
      'oc.aprobar',
    );
    expect(permisoDe(OrdenesCompraController, 'rechazarOrdenCompra')).toBe(
      'oc.aprobar',
    );
    expect(permisoDe(OrdenesCompraController, 'anularOrdenCompra')).toBe(
      'oc.anular',
    );
  });

  it('todas las acciones de compras las pueden hacer ambos roles (D-03)', () => {
    for (const clase of [
      CotizacionesController,
      OrdenesTrabajoController,
      OrdenesCompraController,
      MovimientosController,
    ] as Controlador[]) {
      const metodos = metodosDeControlador(clase);
      expect(metodos.length).toBeGreaterThan(0);
      for (const metodo of metodos) {
        for (const rol of [Rol.Usuario, Rol.Admin]) {
          expect(
            guard.canActivate(
              crearContexto(clase, metodo, { usuario: actor(rol) }),
            ),
            `${clase.name}.${metodo} (${rol})`,
          ).toBe(true);
        }
      }
    }
  });
});
