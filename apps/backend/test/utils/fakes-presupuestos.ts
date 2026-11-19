import { QueryFailedError, type EntityManager } from 'typeorm';
import type { Partida } from '../../src/modules/presupuestos/partida.entity.js';
import type { PresupuestoVersion } from '../../src/modules/presupuestos/presupuesto-version.entity.js';
import { EstadoPresupuesto } from '../../src/modules/presupuestos/presupuestos.tipos.js';
import type { ImportacionFila } from '../../src/modules/importaciones/importacion-fila.entity.js';
import type { ImportacionLote } from '../../src/modules/importaciones/importacion-lote.entity.js';
import {
  EstadoImportacion,
  TipoImportacion,
} from '../../src/modules/importaciones/importaciones.tipos.js';
import { FECHA } from './fakes-maestros.js';

const violacionUnica = (restriccion: string): QueryFailedError =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate key value'), {
      code: '23505',
      constraint: restriccion,
    }),
  );

export function crearVersionPresupuesto(
  parcial: Partial<PresupuestoVersion> = {},
): PresupuestoVersion {
  return {
    id: 1,
    obraId: 1,
    numero: 1,
    estado: EstadoPresupuesto.Borrador,
    vigente: false,
    descripcion: null,
    moneda: 'CLP' as PresupuestoVersion['moneda'],
    valorUf: null,
    fechaValorUf: null,
    total: 0,
    totalClp: 0,
    cantidadPartidas: 0,
    copiadaDeId: null,
    importacionLoteId: null,
    enviadoEn: null,
    enviadoPor: null,
    resueltoEn: null,
    resueltoPor: null,
    motivoResolucion: null,
    version: 1,
    createdAt: FECHA,
    createdBy: 2,
    updatedAt: FECHA,
    updatedBy: 2,
    eliminadoEn: null,
    eliminadoPor: null,
    ...parcial,
  };
}

export function crearPartida(parcial: Partial<Partida> = {}): Partida {
  return {
    id: 1,
    versionId: 1,
    orden: 1,
    codigo: '1.1',
    familiaId: 10,
    descripcion: 'Radier',
    unidad: 'm2',
    cantidad: 10,
    precioUnitario: 1000,
    total: 10_000,
    totalClp: 10_000,
    version: 1,
    createdAt: FECHA,
    createdBy: 2,
    updatedAt: FECHA,
    updatedBy: 2,
    ...parcial,
  };
}

/**
 * Repositorio en memoria de presupuestos. Reproduce las restricciones de la BD que la lógica
 * necesita: código único por versión y una sola versión vigente por obra.
 */
export class PresupuestosRepositorioFake {
  versiones = new Map<number, PresupuestoVersion>();
  partidas = new Map<number, Partida>();
  usuarios = new Map<number, string>([
    [1, 'Administrador'],
    [2, 'Camila Rojas'],
    [3, 'Tomás Silva'],
  ]);
  /** Bitácora de bloqueos (`bloquear-version:<id>`); se puede compartir con la de las obras. */
  llamadas: string[] = [];
  private siguienteVersionId = 1;
  private siguientePartidaId = 1;

  semillaVersion(...versiones: PresupuestoVersion[]): this {
    for (const v of versiones) {
      this.versiones.set(v.id, { ...v });
      this.siguienteVersionId = Math.max(this.siguienteVersionId, v.id + 1);
    }
    return this;
  }

  semillaPartida(...partidas: Partida[]): this {
    for (const p of partidas) {
      this.partidas.set(p.id, { ...p });
      this.siguientePartidaId = Math.max(this.siguientePartidaId, p.id + 1);
    }
    return this;
  }

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return trabajo({} as EntityManager);
  }

  private vigentes(): PresupuestoVersion[] {
    return [...this.versiones.values()].filter((v) => !v.eliminadoEn);
  }

  listarVersionesDeObra(obraId: number): Promise<PresupuestoVersion[]> {
    return Promise.resolve(
      this.vigentes()
        .filter((v) => v.obraId === obraId)
        .sort((a, b) => b.numero - a.numero)
        .map((v) => ({ ...v })),
    );
  }

  buscarVersion(id: number): Promise<PresupuestoVersion | null> {
    const v = this.versiones.get(id);
    return Promise.resolve(v && !v.eliminadoEn ? { ...v } : null);
  }

  buscarVersionBloqueando(id: number): Promise<PresupuestoVersion | null> {
    this.llamadas.push(`bloquear-version:${id}`);
    return this.buscarVersion(id);
  }

  buscarVigenteDeObra(obraId: number): Promise<PresupuestoVersion | null> {
    const v = this.vigentes().find((x) => x.obraId === obraId && x.vigente);
    return Promise.resolve(v ? { ...v } : null);
  }

  siguienteNumero(obraId: number): Promise<number> {
    const numeros = [...this.versiones.values()]
      .filter((v) => v.obraId === obraId)
      .map((v) => v.numero);
    return Promise.resolve(Math.max(0, ...numeros) + 1);
  }

  crearVersion(
    datos: Partial<PresupuestoVersion>,
  ): Promise<PresupuestoVersion> {
    const version = crearVersionPresupuesto({
      ...datos,
      id: this.siguienteVersionId++,
    });
    this.verificarVigencia(version);
    this.versiones.set(version.id, version);
    return Promise.resolve({ ...version });
  }

  guardarVersion(version: PresupuestoVersion): Promise<PresupuestoVersion> {
    this.verificarVigencia(version);
    this.versiones.set(version.id, { ...version });
    return Promise.resolve({ ...version });
  }

  /** Índice único parcial `ux_presupuesto_version_vigente_obra`. */
  private verificarVigencia(version: PresupuestoVersion): void {
    if (!version.vigente) return;
    const otra = [...this.versiones.values()].find(
      (v) => v.vigente && v.obraId === version.obraId && v.id !== version.id,
    );
    if (otra) throw violacionUnica('ux_presupuesto_version_vigente_obra');
  }

  listarPartidas(versionId: number): Promise<Partida[]> {
    return Promise.resolve(
      [...this.partidas.values()]
        .filter((p) => p.versionId === versionId)
        .sort((a, b) => a.orden - b.orden || a.id - b.id)
        .map((p) => ({ ...p })),
    );
  }

  buscarPartida(versionId: number, id: number): Promise<Partida | null> {
    const p = this.partidas.get(id);
    return Promise.resolve(p && p.versionId === versionId ? { ...p } : null);
  }

  maxOrden(versionId: number): Promise<number> {
    const ordenes = [...this.partidas.values()]
      .filter((p) => p.versionId === versionId)
      .map((p) => p.orden);
    return Promise.resolve(Math.max(0, ...ordenes));
  }

  private verificarCodigo(partida: Partida): void {
    const repetida = [...this.partidas.values()].find(
      (p) =>
        p.versionId === partida.versionId &&
        p.codigo === partida.codigo &&
        p.id !== partida.id,
    );
    if (repetida) throw violacionUnica('ux_partida_version_codigo');
  }

  crearPartida(datos: Partial<Partida>): Promise<Partida> {
    const partida = crearPartida({ ...datos, id: this.siguientePartidaId++ });
    this.verificarCodigo(partida);
    this.partidas.set(partida.id, partida);
    return Promise.resolve({ ...partida });
  }

  insertarPartidas(datos: Partial<Partida>[]): Promise<void> {
    for (const d of datos) {
      const partida = crearPartida({ ...d, id: this.siguientePartidaId++ });
      this.verificarCodigo(partida);
      this.partidas.set(partida.id, partida);
    }
    return Promise.resolve();
  }

  guardarPartida(partida: Partida): Promise<Partida> {
    this.verificarCodigo(partida);
    this.partidas.set(partida.id, { ...partida });
    return Promise.resolve({ ...partida });
  }

  eliminarPartida(partida: Partida): Promise<void> {
    this.partidas.delete(partida.id);
    return Promise.resolve();
  }

  nombresDeUsuarios(ids: number[]): Promise<Map<number, string>> {
    return Promise.resolve(
      new Map(
        ids.flatMap((id) => {
          const nombre = this.usuarios.get(id);
          return nombre ? [[id, nombre] as [number, string]] : [];
        }),
      ),
    );
  }
}

export function crearLote(
  parcial: Partial<ImportacionLote> = {},
): ImportacionLote {
  return {
    id: 1,
    tipo: TipoImportacion.Presupuesto,
    estado: EstadoImportacion.Previsualizado,
    obraId: 1,
    nombreArchivo: 'presupuesto.xlsx',
    tamanioBytes: 1000,
    sha256: 'x',
    totalFilas: 0,
    filasValidas: 0,
    filasConError: 0,
    montoTotal: 0,
    moneda: 'CLP' as ImportacionLote['moneda'],
    presupuestoVersionId: null,
    confirmadoEn: null,
    confirmadoPor: null,
    descartadoEn: null,
    descartadoPor: null,
    version: 1,
    createdAt: FECHA,
    createdBy: 1,
    updatedAt: FECHA,
    updatedBy: 1,
    ...parcial,
  };
}

/** Repositorio en memoria de lotes de importación y sus filas. */
export class ImportacionesRepositorioFake {
  lotes = new Map<number, ImportacionLote>();
  filas: ImportacionFila[] = [];
  nombres = new Map<number, string>([[1, 'Administrador']]);
  obras = new Map<number, ImportacionLote['obra']>();
  llamadas: string[] = [];
  private siguienteLoteId = 1;
  private siguienteFilaId = 1;

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return trabajo({} as EntityManager);
  }

  private conObra(lote: ImportacionLote): ImportacionLote {
    return { ...lote, obra: lote.obraId ? this.obras.get(lote.obraId) : null };
  }

  crearLote(
    datos: Partial<ImportacionLote>,
    filas: Partial<ImportacionFila>[],
  ): Promise<ImportacionLote> {
    const lote = crearLote({ ...datos, id: this.siguienteLoteId++ });
    this.lotes.set(lote.id, lote);
    for (const f of filas) {
      this.filas.push({
        id: this.siguienteFilaId++,
        loteId: lote.id,
        createdAt: FECHA,
        ...f,
      } as ImportacionFila);
    }
    return Promise.resolve({ ...lote });
  }

  buscarLote(id: number): Promise<ImportacionLote | null> {
    const lote = this.lotes.get(id);
    return Promise.resolve(lote ? this.conObra(lote) : null);
  }

  buscarLoteBloqueando(id: number): Promise<ImportacionLote | null> {
    this.llamadas.push(`bloquear-lote:${id}`);
    const lote = this.lotes.get(id);
    return Promise.resolve(lote ? { ...lote } : null);
  }

  guardarLote(lote: ImportacionLote): Promise<ImportacionLote> {
    this.lotes.set(lote.id, { ...lote });
    return Promise.resolve({ ...lote });
  }

  listarLotes(filtro: {
    obraId?: number;
    estado?: EstadoImportacion;
    pagina: number;
    tamanio: number;
  }): Promise<[ImportacionLote[], number]> {
    const todos = [...this.lotes.values()]
      .filter(
        (l) =>
          (filtro.obraId === undefined || l.obraId === filtro.obraId) &&
          (filtro.estado === undefined || l.estado === filtro.estado),
      )
      .sort((a, b) => b.id - a.id);
    const desde = (filtro.pagina - 1) * filtro.tamanio;
    return Promise.resolve([
      todos.slice(desde, desde + filtro.tamanio).map((l) => this.conObra(l)),
      todos.length,
    ]);
  }

  listarFilas(
    loteId: number,
    filtro: { soloErrores: boolean; pagina: number; tamanio: number },
  ): Promise<[ImportacionFila[], number]> {
    const todas = this.filas.filter(
      (f) => f.loteId === loteId && (!filtro.soloErrores || !f.valida),
    );
    const desde = (filtro.pagina - 1) * filtro.tamanio;
    return Promise.resolve([
      todas.slice(desde, desde + filtro.tamanio),
      todas.length,
    ]);
  }

  todasLasFilas(loteId: number): Promise<ImportacionFila[]> {
    return Promise.resolve(this.filas.filter((f) => f.loteId === loteId));
  }

  nombresDeUsuarios(ids: number[]): Promise<Map<number, string>> {
    return Promise.resolve(
      new Map(
        ids.flatMap((id) => {
          const nombre = this.nombres.get(id);
          return nombre ? [[id, nombre] as [number, string]] : [];
        }),
      ),
    );
  }
}
