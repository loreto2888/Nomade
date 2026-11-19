import { beforeEach, describe, expect, it } from 'vitest';
import {
  CatalogosRepositorioFake,
  actorAdmin,
  crearItemCatalogo,
} from '../../../test/utils/fakes-maestros.js';
import type { ContextoAuditoria } from '../../common/auth/actor.js';
import type { CatalogosRepositorio } from './catalogos.repositorio.js';
import { CatalogosService } from './catalogos.service.js';
import { TipoCatalogo } from './catalogos.tipos.js';

function preparar() {
  const repo = new CatalogosRepositorioFake().semilla(
    crearItemCatalogo({
      id: 1,
      codigo: 'en_preparacion',
      nombre: 'En preparación',
      orden: 10,
      protegido: true,
    }),
    crearItemCatalogo({
      id: 2,
      codigo: 'activa',
      nombre: 'Activa',
      orden: 20,
      protegido: true,
    }),
    crearItemCatalogo({
      id: 3,
      codigo: 'suspendida',
      nombre: 'Suspendida',
      orden: 30,
      protegido: false,
    }),
    crearItemCatalogo({
      id: 4,
      codigo: 'obsoleta',
      nombre: 'Obsoleta',
      orden: 5,
      protegido: false,
      activo: false,
    }),
    crearItemCatalogo({
      id: 5,
      tipo: TipoCatalogo.CategoriaGasto,
      codigo: 'materiales',
      nombre: 'Materiales',
      protegido: false,
    }),
  );
  return {
    repo,
    servicio: new CatalogosService(repo as unknown as CatalogosRepositorio),
  };
}

describe('CatalogosService', () => {
  let t: ReturnType<typeof preparar>;
  let auditoria: ContextoAuditoria;
  beforeEach(() => {
    t = preparar();
    auditoria = {};
  });

  describe('listar', () => {
    it('devuelve solo los activos del catálogo pedido, ordenados', async () => {
      const r = await t.servicio.listar(TipoCatalogo.EstadoObra);
      expect(r.map((i) => i.codigo)).toEqual([
        'en_preparacion',
        'activa',
        'suspendida',
      ]);
    });

    it('con incluirInactivos devuelve también los inactivos', async () => {
      const r = await t.servicio.listar(TipoCatalogo.EstadoObra, true);
      expect(r.map((i) => i.codigo)).toEqual([
        'obsoleta',
        'en_preparacion',
        'activa',
        'suspendida',
      ]);
    });

    it('no mezcla catálogos distintos', async () => {
      const r = await t.servicio.listar(TipoCatalogo.CategoriaGasto);
      expect(r.map((i) => i.codigo)).toEqual(['materiales']);
    });
  });

  describe('crear', () => {
    it('agrega un ítem activo y no protegido, con orden 0 por defecto', async () => {
      const r = await t.servicio.crear(
        TipoCatalogo.EstadoObra,
        { codigo: 'en_garantia', nombre: 'En garantía' },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        tipo: 'estado_obra',
        codigo: 'en_garantia',
        activo: true,
        protegido: false,
        orden: 0,
        version: 1,
      });
      expect(auditoria.entidadId).toBe(r.id);
      expect(auditoria.despues).toMatchObject({ codigo: 'en_garantia' });
    });

    it('rechaza un código repetido dentro del mismo catálogo (409) pero no en otro', async () => {
      await expect(
        t.servicio.crear(
          TipoCatalogo.EstadoObra,
          { codigo: 'activa', nombre: 'Otra' },
          actorAdmin,
          auditoria,
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: { codigo: 'CATALOGO_CODIGO_DUPLICADO' },
      });
      await expect(
        t.servicio.crear(
          TipoCatalogo.TipoDocumento,
          { codigo: 'activa', nombre: 'Otra' },
          actorAdmin,
          {},
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('actualizar', () => {
    it('cambia nombre, descripción, orden y activo; el código no cambia', async () => {
      const r = await t.servicio.actualizar(
        TipoCatalogo.EstadoObra,
        3,
        {
          version: 1,
          nombre: 'Detenida',
          descripcion: 'Por clima',
          orden: 35,
          activo: false,
        },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        codigo: 'suspendida',
        nombre: 'Detenida',
        descripcion: 'Por clima',
        orden: 35,
        activo: false,
        version: 2,
      });
      expect(auditoria.antes).toMatchObject({
        nombre: 'Suspendida',
        activo: true,
      });
      expect(auditoria.despues).toMatchObject({
        nombre: 'Detenida',
        activo: false,
      });
    });

    it('un ítem protegido se puede renombrar pero no desactivar (422)', async () => {
      await expect(
        t.servicio.actualizar(
          TipoCatalogo.EstadoObra,
          1,
          { version: 1, activo: false },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'CATALOGO_ITEM_PROTEGIDO' },
      });
      const r = await t.servicio.actualizar(
        TipoCatalogo.EstadoObra,
        1,
        { version: 1, nombre: 'Preparación' },
        actorAdmin,
        {},
      );
      expect(r.nombre).toBe('Preparación');
    });

    it('409 con la versión vigente si está desactualizado', async () => {
      await t.servicio.actualizar(
        TipoCatalogo.EstadoObra,
        3,
        { version: 1, orden: 1 },
        actorAdmin,
        {},
      );
      await expect(
        t.servicio.actualizar(
          TipoCatalogo.EstadoObra,
          3,
          { version: 1, orden: 2 },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: {
          codigo: 'CONFLICTO_VERSION',
          detalles: [{ versionActual: 2 }],
        },
      });
    });

    it('404 si el ítem no existe o es de otro catálogo', async () => {
      await expect(
        t.servicio.actualizar(
          TipoCatalogo.EstadoObra,
          99,
          { version: 1 },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 404,
        response: { codigo: 'CATALOGO_ITEM_NO_ENCONTRADO' },
      });
      await expect(
        t.servicio.actualizar(
          TipoCatalogo.TipoDocumento,
          5,
          { version: 1 },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
