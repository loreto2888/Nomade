import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  actorAdmin,
  crearAdjunto,
} from '../../../test/utils/fakes-maestros.js';
import type { Adjunto } from './adjunto.entity.js';
import type { AlmacenArchivos } from './almacen-archivos.js';
import { AdjuntosService, type ArchivoSubido } from './adjuntos.service.js';
import type { AdjuntosRepositorio } from './adjuntos.repositorio.js';
import { EntidadAdjuntable } from './adjuntos.tipos.js';

const pdf = Buffer.from('%PDF-1.7\ncontenido');
const archivo = (parcial: Partial<ArchivoSubido> = {}): ArchivoSubido => ({
  originalname: 'Contrato.pdf',
  buffer: pdf,
  size: pdf.length,
  ...parcial,
});

class RepositorioFake {
  filas = new Map<number, Adjunto>();
  entidades = new Set<string>(['obra:1', 'proveedor:7']);
  fallarAlCrear = false;
  private siguiente = 1;

  existeEntidad(tipo: EntidadAdjuntable, id: number) {
    return Promise.resolve(this.entidades.has(`${tipo}:${id}`));
  }
  listarDeEntidad(tipo: EntidadAdjuntable, id: number) {
    return Promise.resolve(
      [...this.filas.values()].filter(
        (a) => a.entidadTipo === tipo && a.entidadId === id && !a.eliminadoEn,
      ),
    );
  }
  buscarPorId(id: number) {
    const a = this.filas.get(id);
    return Promise.resolve(a && !a.eliminadoEn ? { ...a } : null);
  }
  crear(datos: Partial<Adjunto>) {
    if (this.fallarAlCrear) return Promise.reject(new Error('BD caída'));
    const a = crearAdjunto({ ...datos, id: this.siguiente++ });
    this.filas.set(a.id, a);
    return Promise.resolve({ ...a });
  }
  guardar(a: Adjunto) {
    this.filas.set(a.id, { ...a });
    return Promise.resolve(a);
  }
}

function preparar() {
  const repo = new RepositorioFake();
  const almacen = {
    guardar: vi.fn(() =>
      Promise.resolve('2026/11/00000000-0000-0000-0000-000000000009.pdf'),
    ),
    abrir: vi.fn(() => ({ fake: 'flujo' })),
    eliminar: vi.fn(() => Promise.resolve()),
  };
  const servicio = new AdjuntosService(
    repo as unknown as AdjuntosRepositorio,
    almacen as unknown as AlmacenArchivos,
  );
  return { repo, almacen, servicio };
}

describe('AdjuntosService', () => {
  let t: ReturnType<typeof preparar>;
  beforeEach(() => {
    t = preparar();
  });

  describe('subir', () => {
    it('valida, guarda el archivo y registra los metadatos con hash, tipo canónico y autor', async () => {
      const auditoria = {};
      const r = await t.servicio.subir(
        archivo(),
        {
          entidadTipo: EntidadAdjuntable.Obra,
          entidadId: 1,
          descripcion: 'Contrato firmado',
        },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        entidadTipo: 'obra',
        entidadId: 1,
        nombreOriginal: 'Contrato.pdf',
        tipoMime: 'application/pdf',
        extension: 'pdf',
        tamanioBytes: pdf.length,
        descripcion: 'Contrato firmado',
        creadoPor: actorAdmin.id,
      });
      expect(t.almacen.guardar).toHaveBeenCalledWith(pdf, 'pdf');
      const fila = t.repo.filas.get(r.id)!;
      expect(fila.claveAlmacenamiento).toBe(
        '2026/11/00000000-0000-0000-0000-000000000009.pdf',
      );
      expect(fila.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(auditoria).toMatchObject({ entidadId: r.id });
    });

    it('400 si no viene archivo', async () => {
      await expect(
        t.servicio.subir(
          undefined,
          { entidadTipo: EntidadAdjuntable.Obra, entidadId: 1 },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: { codigo: 'ARCHIVO_REQUERIDO' },
      });
    });

    it('rechaza tipo no permitido, contenido falso y exceso de tamaño sin escribir nada en disco', async () => {
      const dto = { entidadTipo: EntidadAdjuntable.Obra, entidadId: 1 };
      await expect(
        t.servicio.subir(
          archivo({ originalname: 'virus.exe' }),
          dto,
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 415,
        response: { codigo: 'TIPO_ARCHIVO_NO_PERMITIDO' },
      });
      await expect(
        t.servicio.subir(
          archivo({ buffer: Buffer.from('no es pdf') }),
          dto,
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 415,
        response: { codigo: 'CONTENIDO_NO_COINCIDE' },
      });
      const grande = Buffer.concat([pdf, Buffer.alloc(20 * 1024 * 1024)]);
      await expect(
        t.servicio.subir(archivo({ buffer: grande }), dto, actorAdmin, {}),
      ).rejects.toMatchObject({ status: 413 });
      expect(t.almacen.guardar).not.toHaveBeenCalled();
      expect(t.repo.filas.size).toBe(0);
    });

    it('404 si la obra, proveedor o cliente no existe, sin escribir nada en disco', async () => {
      await expect(
        t.servicio.subir(
          archivo(),
          { entidadTipo: EntidadAdjuntable.Obra, entidadId: 99 },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 404,
        response: { codigo: 'ENTIDAD_NO_ENCONTRADA' },
      });
      expect(t.almacen.guardar).not.toHaveBeenCalled();
    });

    it('si falla el registro en BD, elimina el archivo recién escrito', async () => {
      t.repo.fallarAlCrear = true;
      await expect(
        t.servicio.subir(
          archivo(),
          { entidadTipo: EntidadAdjuntable.Obra, entidadId: 1 },
          actorAdmin,
          {},
        ),
      ).rejects.toThrow('BD caída');
      expect(t.almacen.eliminar).toHaveBeenCalledWith(
        '2026/11/00000000-0000-0000-0000-000000000009.pdf',
      );
    });

    it('recupera nombres con tildes que multer entrega mal decodificados', async () => {
      const crudo = Buffer.from('Cotización.pdf', 'utf8').toString('latin1');
      const r = await t.servicio.subir(
        archivo({ originalname: crudo }),
        { entidadTipo: EntidadAdjuntable.Proveedor, entidadId: 7 },
        actorAdmin,
        {},
      );
      expect(r.nombreOriginal).toBe('Cotización.pdf');
    });
  });

  it('listar devuelve los adjuntos de la entidad y 404 si no existe', async () => {
    t.repo.filas.set(1, crearAdjunto());
    t.repo.filas.set(2, crearAdjunto({ id: 2, entidadId: 5 }));
    const r = await t.servicio.listar({
      entidadTipo: EntidadAdjuntable.Obra,
      entidadId: 1,
    });
    expect(r.map((a) => a.id)).toEqual([1]);
    await expect(
      t.servicio.listar({ entidadTipo: EntidadAdjuntable.Obra, entidadId: 99 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('descargar abre el archivo por su clave y 404 si no existe o fue eliminado', async () => {
    t.repo.filas.set(
      1,
      crearAdjunto({
        claveAlmacenamiento: '2026/11/00000000-0000-0000-0000-000000000001.pdf',
      }),
    );
    t.repo.filas.set(2, crearAdjunto({ id: 2, eliminadoEn: new Date() }));
    const d = await t.servicio.descargar(1);
    expect(d).toMatchObject({
      nombre: 'contrato.pdf',
      tipoMime: 'application/pdf',
      tamanioBytes: 100,
    });
    expect(t.almacen.abrir).toHaveBeenCalledWith(
      '2026/11/00000000-0000-0000-0000-000000000001.pdf',
    );
    await expect(t.servicio.descargar(2)).rejects.toMatchObject({
      status: 404,
      response: { codigo: 'ADJUNTO_NO_ENCONTRADO' },
    });
    await expect(t.servicio.descargar(3)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('eliminar es lógico: marca el registro y no borra el archivo', async () => {
    t.repo.filas.set(1, crearAdjunto());
    const auditoria = {};
    await t.servicio.eliminar(
      1,
      { motivo: 'Archivo equivocado' },
      actorAdmin,
      auditoria,
    );
    expect(t.repo.filas.get(1)?.eliminadoEn).toBeInstanceOf(Date);
    expect(t.repo.filas.get(1)?.eliminadoPor).toBe(actorAdmin.id);
    expect(t.almacen.eliminar).not.toHaveBeenCalled();
    expect(auditoria).toMatchObject({
      entidadId: 1,
      motivo: 'Archivo equivocado',
    });
    await expect(
      t.servicio.eliminar(1, {}, actorAdmin, {}),
    ).rejects.toMatchObject({ status: 404 });
  });
});
