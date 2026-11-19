import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  crearContexto,
  metodosDeControlador,
} from '../../../test/utils/contexto.js';
import {
  actorAdmin,
  actorUsuario,
} from '../../../test/utils/fakes-maestros.js';
import { AutorizacionGuard } from '../../common/permisos/autorizacion.guard.js';
import {
  CLAVE_AUDITAR,
  type OpcionesAuditar,
} from '../auditoria/auditar.decorator.js';
import { CuentasBancariasController } from './cuentas-bancarias.controller.js';
import { ProveedoresController } from './proveedores.controller.js';

const guard = new AutorizacionGuard(new Reflector());
const reflector = new Reflector();

describe('datos bancarios de proveedores: solo admin y siempre auditados (D-17, §13)', () => {
  const metodos = metodosDeControlador(CuentasBancariasController);

  it('el controlador de cuentas tiene handlers (la prueba no es vacía)', () => {
    expect(metodos).toEqual([
      'listarCuentasBancarias',
      'crearCuentaBancaria',
      'actualizarCuentaBancaria',
      'eliminarCuentaBancaria',
    ]);
  });

  it.each(metodos)('%s: el admin pasa y el usuario recibe 403', (metodo) => {
    const contexto = (rol: typeof actorAdmin) =>
      crearContexto(CuentasBancariasController, metodo, { usuario: rol });
    expect(guard.canActivate(contexto(actorAdmin))).toBe(true);
    expect(() => guard.canActivate(contexto(actorUsuario))).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it.each(metodos)('%s: queda registrado en la bitácora', (metodo) => {
    const contexto = crearContexto(CuentasBancariasController, metodo);
    const opciones = reflector.get<OpcionesAuditar | undefined>(
      CLAVE_AUDITAR,
      contexto.getHandler(),
    );
    expect(opciones?.accion).toMatch(/^proveedor\.cuenta_bancaria\./);
  });

  it('la consulta se audita sin copiar la respuesta (no filtra números de cuenta a la bitácora)', () => {
    const contexto = crearContexto(
      CuentasBancariasController,
      'listarCuentasBancarias',
    );
    const opciones = reflector.get<OpcionesAuditar>(
      CLAVE_AUDITAR,
      contexto.getHandler(),
    );
    expect(opciones).toMatchObject({
      accion: 'proveedor.cuenta_bancaria.consultar',
      incluirRespuesta: false,
    });
  });

  it('el resto del controlador de proveedores es accesible para el rol usuario', () => {
    for (const metodo of metodosDeControlador(ProveedoresController)) {
      expect(
        guard.canActivate(
          crearContexto(ProveedoresController, metodo, {
            usuario: actorUsuario,
          }),
        ),
      ).toBe(true);
    }
  });
});
