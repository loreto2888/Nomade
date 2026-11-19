import { describe, expect, it } from 'vitest';
import {
  ProveedoresRepositorioFake,
  actorAdmin,
  crearProveedor,
} from '../../../test/utils/fakes-maestros.js';
import type { ProveedoresRepositorio } from './proveedores.repositorio.js';
import { ProveedoresService } from './proveedores.service.js';

function preparar(...proveedores: ReturnType<typeof crearProveedor>[]) {
  const repo = new ProveedoresRepositorioFake().semilla(...proveedores);
  return {
    repo,
    servicio: new ProveedoresService(repo as unknown as ProveedoresRepositorio),
  };
}

describe('ProveedoresService', () => {
  it('crea con RUT único entre los vigentes (409 RUT_DUPLICADO)', async () => {
    const { servicio } = preparar(crearProveedor());
    await expect(
      servicio.crear(
        { rut: '11111111-1', razonSocial: 'Otro' },
        actorAdmin,
        {},
      ),
    ).rejects.toMatchObject({
      status: 409,
      response: {
        codigo: 'RUT_DUPLICADO',
        mensaje: 'Ya existe un proveedor con ese RUT.',
      },
    });
  });

  it('informa si tiene datos bancarios, sin exponer las cuentas', async () => {
    const { servicio, repo } = preparar(
      crearProveedor(),
      crearProveedor({ id: 2, rut: '76086428-5', razonSocial: 'Con cuentas' }),
    );
    repo.conCuentas.add(2);
    const pagina = await servicio.listar({ pagina: 1, tamanio: 25 });
    expect(pagina.items.map((p) => [p.id, p.tieneDatosBancarios])).toEqual([
      [1, false],
      [2, true],
    ]);
    const ficha = await servicio.obtener(2);
    expect(ficha.tieneDatosBancarios).toBe(true);
    expect(Object.keys(ficha)).not.toEqual(
      expect.arrayContaining(['cuentas', 'numeroCuenta', 'cuentasBancarias']),
    );
  });

  it('actualiza con control de versión y borra lógicamente', async () => {
    const { servicio, repo } = preparar(crearProveedor());
    const r = await servicio.actualizar(
      1,
      { version: 1, contactoNombre: 'Juan Pérez' },
      actorAdmin,
      {},
    );
    expect(r).toMatchObject({ contactoNombre: 'Juan Pérez', version: 2 });
    await expect(
      servicio.actualizar(
        1,
        { version: 1, contactoNombre: 'X' },
        actorAdmin,
        {},
      ),
    ).rejects.toMatchObject({
      status: 409,
      response: { codigo: 'CONFLICTO_VERSION' },
    });

    await servicio.eliminar(1, { version: 2 }, actorAdmin, {});
    expect(repo.filas.get(1)?.eliminadoEn).toBeInstanceOf(Date);
    await expect(servicio.obtener(1)).rejects.toMatchObject({
      status: 404,
      response: { codigo: 'PROVEEDOR_NO_ENCONTRADO' },
    });
  });
});
