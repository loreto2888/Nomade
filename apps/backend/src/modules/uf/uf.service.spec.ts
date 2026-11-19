import { beforeEach, describe, expect, it } from 'vitest';
import {
  RelojFijo,
  UfRepositorioFake,
  actorAdmin,
  crearValorUf,
} from '../../../test/utils/fakes-maestros.js';
import type { ContextoAuditoria } from '../../common/auth/actor.js';
import type { UfRepositorio } from './uf.repositorio.js';
import { UfService } from './uf.service.js';

function preparar(...valores: ReturnType<typeof crearValorUf>[]) {
  const repo = new UfRepositorioFake().semilla(...valores);
  return {
    repo,
    servicio: new UfService(repo as unknown as UfRepositorio, new RelojFijo()),
  };
}

describe('UfService (valor diario de la UF)', () => {
  let auditoria: ContextoAuditoria;
  beforeEach(() => {
    auditoria = {};
  });

  it('valorParaFecha usa el valor del día; por defecto, hoy en Chile', async () => {
    const { servicio } = preparar(
      crearValorUf({ fecha: '2026-11-19', valor: 39284.8712 }),
      crearValorUf({ fecha: '2026-11-18', valor: 39280 }),
    );
    expect(await servicio.valorParaFecha()).toEqual({
      fecha: '2026-11-19',
      valor: 39284.8712,
    });
    expect(await servicio.valorParaFecha('2026-11-18')).toEqual({
      fecha: '2026-11-18',
      valor: 39280,
    });
  });

  it('si falta el día toma el último anterior de hasta 7 días', async () => {
    const { servicio } = preparar(
      crearValorUf({ fecha: '2026-11-14', valor: 39200 }),
    );
    expect(await servicio.valorParaFecha('2026-11-19')).toEqual({
      fecha: '2026-11-14',
      valor: 39200,
    });
  });

  it('no usa valores de hace más de 7 días (devuelve null)', async () => {
    const { servicio } = preparar(
      crearValorUf({ fecha: '2026-11-01', valor: 39000 }),
    );
    expect(await servicio.valorParaFecha('2026-11-19')).toBeNull();
  });

  it('exigirValorParaFecha lanza 422 UF_NO_DISPONIBLE con un mensaje accionable', async () => {
    const { servicio } = preparar();
    await expect(
      servicio.exigirValorParaFecha('2026-11-19'),
    ).rejects.toMatchObject({
      status: 422,
      response: {
        codigo: 'UF_NO_DISPONIBLE',
        mensaje: expect.stringContaining('administrador'),
      },
    });
    await expect(servicio.exigirValorParaFecha()).rejects.toMatchObject({
      response: { mensaje: expect.stringContaining('hoy') },
    });
  });

  describe('guardar', () => {
    it('crea el valor de un día nuevo y lo deja en la bitácora', async () => {
      const { servicio, repo } = preparar();
      const r = await servicio.guardar(
        '2026-11-20',
        39290.5,
        actorAdmin,
        auditoria,
      );
      expect(r).toEqual({ fecha: '2026-11-20', valor: 39290.5 });
      expect(repo.valores.get('2026-11-20')?.createdBy).toBe(actorAdmin.id);
      expect(auditoria).toMatchObject({ entidadId: '2026-11-20', despues: r });
      expect(auditoria.antes).toBeUndefined();
    });

    it('corrige un día existente y registra el valor anterior', async () => {
      const { servicio, repo } = preparar(
        crearValorUf({ fecha: '2026-11-19', valor: 39000 }),
      );
      const r = await servicio.guardar(
        '2026-11-19',
        39284.8712,
        actorAdmin,
        auditoria,
      );
      expect(r.valor).toBe(39284.8712);
      expect(repo.valores.size).toBe(1);
      expect(auditoria.antes).toEqual({ fecha: '2026-11-19', valor: 39000 });
      expect(auditoria.despues).toEqual({
        fecha: '2026-11-19',
        valor: 39284.8712,
      });
    });
  });

  it('listar pagina los valores de más reciente a más antiguo con filtro de fechas', async () => {
    const { servicio } = preparar(
      crearValorUf({ fecha: '2026-11-17', valor: 1 }),
      crearValorUf({ fecha: '2026-11-19', valor: 3 }),
      crearValorUf({ fecha: '2026-11-18', valor: 2 }),
    );
    const todos = await servicio.listar({ pagina: 1, tamanio: 2 });
    expect(todos.items.map((v) => v.fecha)).toEqual([
      '2026-11-19',
      '2026-11-18',
    ]);
    expect(todos.total).toBe(3);
    const rango = await servicio.listar({
      pagina: 1,
      tamanio: 10,
      desde: '2026-11-18',
    });
    expect(rango.total).toBe(2);
  });
});
