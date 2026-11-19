import type { EntityManager } from 'typeorm';
import type { ActorAutenticado } from '../../src/common/auth/actor.js';
import { Rol } from '../../src/common/permisos/rol.js';
import { Reloj } from '../../src/common/tiempo/reloj.js';
import type { Adjunto } from '../../src/modules/adjuntos/adjunto.entity.js';
import type { Catalogo } from '../../src/modules/catalogos/catalogo.entity.js';
import type { TipoCatalogo } from '../../src/modules/catalogos/catalogos.tipos.js';
import type { Cliente } from '../../src/modules/clientes/cliente.entity.js';
import type { Obra } from '../../src/modules/obras/obra.entity.js';
import type {
  Parametro,
  ParametroValor,
} from '../../src/modules/parametros/parametro.entity.js';
import type {
  CuentaBancariaProveedor,
  Proveedor,
} from '../../src/modules/proveedores/proveedor.entity.js';
import type { ValorUf } from '../../src/modules/uf/valor-uf.entity.js';

export const FECHA = new Date('2026-11-19T12:00:00.000Z');

export const actorAdmin: ActorAutenticado = {
  id: 1,
  correo: 'admin@nomade.cl',
  nombre: 'Admin',
  rol: Rol.Admin,
  debeCambiarClave: false,
  sesionId: 1,
  sesionExpiraEn: FECHA,
};

export const actorUsuario: ActorAutenticado = {
  ...actorAdmin,
  id: 2,
  correo: 'camila@nomade.cl',
  nombre: 'Camila',
  rol: Rol.Usuario,
};

/** Reloj fijo: hoy es 2026-11-19 en Chile. */
export class RelojFijo extends Reloj {
  constructor(
    private readonly instante: Date = new Date('2026-11-19T15:00:00.000Z'),
  ) {
    super();
  }
  override ahora(): Date {
    return this.instante;
  }
}

/** Repositorio en memoria de maestros con borrado lógico (misma interfaz que `RepositorioMaestro`). */
export class RepositorioMaestroFake<
  E extends { id: number; version: number; eliminadoEn: Date | null },
> {
  filas = new Map<number, E>();
  protected siguienteId = 1;
  /** Trazas de bloqueos (`bloquear:<id>`) para verificar el orden. */
  llamadas: string[] = [];

  semilla(...entidades: E[]): this {
    for (const e of entidades) {
      this.filas.set(e.id, { ...e });
      this.siguienteId = Math.max(this.siguienteId, e.id + 1);
    }
    return this;
  }

  protected copia(e: E | undefined): E | null {
    return e ? { ...e } : null;
  }

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return trabajo({} as EntityManager);
  }

  buscarPorId(id: number): Promise<E | null> {
    const e = this.filas.get(id);
    return Promise.resolve(e && !e.eliminadoEn ? this.copia(e) : null);
  }

  buscarPorIdBloqueando(id: number): Promise<E | null> {
    this.llamadas.push(`bloquear:${id}`);
    return this.buscarPorId(id);
  }

  crear(datos: Partial<E>): Promise<E> {
    const entidad = {
      eliminadoEn: null,
      eliminadoPor: null,
      createdAt: FECHA,
      updatedAt: FECHA,
      ...datos,
      id: this.siguienteId++,
    } as unknown as E;
    this.filas.set(entidad.id, entidad);
    return Promise.resolve({ ...entidad });
  }

  guardar(entidad: E): Promise<E> {
    this.filas.set(entidad.id, { ...entidad });
    return Promise.resolve({ ...entidad });
  }

  vigentes(): E[] {
    return [...this.filas.values()].filter((e) => !e.eliminadoEn);
  }
}

// ---------------------------------------------------------------------------
// Fábricas de entidades
// ---------------------------------------------------------------------------

export function crearCliente(parcial: Partial<Cliente> = {}): Cliente {
  return {
    id: 1,
    rut: '76086428-5',
    razonSocial: 'Grupo Andino SpA',
    nombreFantasia: null,
    giro: null,
    contactoNombre: null,
    correo: null,
    telefono: null,
    direccion: null,
    version: 1,
    createdAt: FECHA,
    createdBy: 1,
    updatedAt: FECHA,
    updatedBy: 1,
    eliminadoEn: null,
    eliminadoPor: null,
    ...parcial,
  };
}

export function crearProveedor(parcial: Partial<Proveedor> = {}): Proveedor {
  return {
    ...crearCliente(),
    id: 1,
    rut: '11111111-1',
    razonSocial: 'Materiales Cordillera SpA',
    ...parcial,
  };
}

export function crearCuenta(
  parcial: Partial<CuentaBancariaProveedor> = {},
): CuentaBancariaProveedor {
  return {
    id: 1,
    proveedorId: 1,
    banco: 'Banco de Chile',
    tipoCuenta: 'corriente' as CuentaBancariaProveedor['tipoCuenta'],
    numeroCuenta: '0012345678',
    titular: 'Materiales Cordillera SpA',
    titularRut: '11111111-1',
    correoNotificacion: null,
    principal: true,
    version: 1,
    createdAt: FECHA,
    createdBy: 1,
    updatedAt: FECHA,
    updatedBy: 1,
    eliminadoEn: null,
    eliminadoPor: null,
    ...parcial,
  };
}

export function crearItemCatalogo(parcial: Partial<Catalogo> = {}): Catalogo {
  return {
    id: 1,
    tipo: 'estado_obra' as Catalogo['tipo'],
    codigo: 'en_preparacion',
    nombre: 'En preparación',
    descripcion: null,
    orden: 10,
    activo: true,
    protegido: true,
    version: 1,
    createdAt: FECHA,
    createdBy: null,
    updatedAt: FECHA,
    updatedBy: null,
    ...parcial,
  };
}

export function crearObra(parcial: Partial<Obra> = {}): Obra {
  return {
    id: 1,
    codigoCentroCosto: 'CC-001',
    nombre: 'Local Parque Norte',
    clienteId: 1,
    estadoId: 1,
    responsable: null,
    direccion: null,
    fechaInicio: null,
    fechaTermino: null,
    monedaContrato: 'CLP' as Obra['monedaContrato'],
    montoContrato: null,
    montoContratoClp: null,
    fechaValorUf: null,
    valorUf: null,
    observaciones: null,
    version: 1,
    createdAt: FECHA,
    createdBy: 1,
    updatedAt: FECHA,
    updatedBy: 1,
    eliminadoEn: null,
    eliminadoPor: null,
    ...parcial,
  };
}

export function crearParametro(parcial: Partial<Parametro> = {}): Parametro {
  return {
    id: 1,
    codigo: 'iva',
    nombre: 'IVA',
    descripcion: null,
    categoria: 'Impuestos',
    tipoValor: 'porcentaje' as Parametro['tipoValor'],
    unidad: '%',
    version: 1,
    createdAt: FECHA,
    createdBy: null,
    updatedAt: FECHA,
    updatedBy: null,
    ...parcial,
  };
}

export function crearValorParametro(
  parcial: Partial<ParametroValor> = {},
): ParametroValor {
  return {
    id: 1,
    parametroId: 1,
    valorNumerico: 19,
    valorTexto: null,
    vigenteDesde: '2003-01-01',
    motivo: null,
    createdAt: FECHA,
    createdBy: null,
    ...parcial,
  };
}

export function crearValorUf(parcial: Partial<ValorUf> = {}): ValorUf {
  return {
    id: 1,
    fecha: '2026-11-19',
    valor: 39284.8712,
    createdAt: FECHA,
    createdBy: 1,
    updatedAt: FECHA,
    updatedBy: 1,
    ...parcial,
  };
}

export function crearAdjunto(parcial: Partial<Adjunto> = {}): Adjunto {
  return {
    id: 1,
    entidadTipo: 'obra' as Adjunto['entidadTipo'],
    entidadId: 1,
    nombreOriginal: 'contrato.pdf',
    claveAlmacenamiento: '2026/11/00000000-0000-0000-0000-000000000001.pdf',
    tipoMime: 'application/pdf',
    extension: 'pdf',
    tamanioBytes: 100,
    sha256: 'x',
    descripcion: null,
    createdAt: FECHA,
    createdBy: 1,
    eliminadoEn: null,
    eliminadoPor: null,
    ...parcial,
  };
}

// ---------------------------------------------------------------------------
// Repositorios en memoria específicos
// ---------------------------------------------------------------------------

export class ClientesRepositorioFake extends RepositorioMaestroFake<Cliente> {
  /** Obras vigentes por cliente (para la regla de eliminación). */
  obrasPorCliente = new Map<number, number>();

  buscarPorRut(rut: string): Promise<Cliente | null> {
    return Promise.resolve(
      this.copia(this.vigentes().find((c) => c.rut === rut)),
    );
  }

  listar(filtro: {
    q?: string;
    pagina: number;
    tamanio: number;
  }): Promise<[Cliente[], number]> {
    const q = filtro.q?.toLowerCase();
    const todos = this.vigentes().filter(
      (c) => !q || c.razonSocial.toLowerCase().includes(q) || c.rut.includes(q),
    );
    const desde = (filtro.pagina - 1) * filtro.tamanio;
    return Promise.resolve([
      todos.slice(desde, desde + filtro.tamanio),
      todos.length,
    ]);
  }

  contarObrasVigentes(clienteId: number): Promise<number> {
    return Promise.resolve(this.obrasPorCliente.get(clienteId) ?? 0);
  }
}

export class ProveedoresRepositorioFake extends RepositorioMaestroFake<Proveedor> {
  /** Ids que tienen cuentas bancarias (lo informa el fake de cuentas). */
  conCuentas = new Set<number>();

  buscarPorRut(rut: string): Promise<Proveedor | null> {
    return Promise.resolve(
      this.copia(this.vigentes().find((p) => p.rut === rut)),
    );
  }

  listar(filtro: {
    pagina: number;
    tamanio: number;
  }): Promise<[Proveedor[], number]> {
    const todos = this.vigentes();
    const desde = (filtro.pagina - 1) * filtro.tamanio;
    return Promise.resolve([
      todos.slice(desde, desde + filtro.tamanio),
      todos.length,
    ]);
  }

  conCuentasBancarias(ids: number[]): Promise<Set<number>> {
    return Promise.resolve(
      new Set(ids.filter((id) => this.conCuentas.has(id))),
    );
  }
}

export class CuentasRepositorioFake extends RepositorioMaestroFake<CuentaBancariaProveedor> {
  listarPorProveedor(proveedorId: number): Promise<CuentaBancariaProveedor[]> {
    return Promise.resolve(
      this.vigentes()
        .filter((c) => c.proveedorId === proveedorId)
        .sort(
          (a, b) => Number(b.principal) - Number(a.principal) || a.id - b.id,
        )
        .map((c) => ({ ...c })),
    );
  }

  buscarDuplicada(proveedorId: number, banco: string, numero: string) {
    const c = this.vigentes().find(
      (x) =>
        x.proveedorId === proveedorId &&
        x.banco.toLowerCase() === banco.toLowerCase() &&
        x.numeroCuenta === numero,
    );
    return Promise.resolve(this.copia(c));
  }

  quitarPrincipalExcepto(
    proveedorId: number,
    exceptoId: number | null,
  ): Promise<void> {
    for (const c of this.filas.values()) {
      if (c.proveedorId === proveedorId && !c.eliminadoEn && c.id !== exceptoId)
        c.principal = false;
    }
    return Promise.resolve();
  }

  primeraVigenteExcepto(proveedorId: number, exceptoId: number) {
    const c = this.vigentes()
      .filter((x) => x.proveedorId === proveedorId && x.id !== exceptoId)
      .sort((a, b) => a.id - b.id)[0];
    return Promise.resolve(this.copia(c));
  }
}

export class CatalogosRepositorioFake {
  filas = new Map<number, Catalogo>();
  private siguienteId = 1;

  semilla(...items: Catalogo[]): this {
    for (const i of items) {
      this.filas.set(i.id, { ...i });
      this.siguienteId = Math.max(this.siguienteId, i.id + 1);
    }
    return this;
  }

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return trabajo({} as EntityManager);
  }

  listar(tipo: TipoCatalogo, incluirInactivos: boolean): Promise<Catalogo[]> {
    return Promise.resolve(
      [...this.filas.values()]
        .filter((i) => i.tipo === tipo && (incluirInactivos || i.activo))
        .sort((a, b) => a.orden - b.orden || a.id - b.id)
        .map((i) => ({ ...i })),
    );
  }

  buscarPorId(tipo: TipoCatalogo, id: number): Promise<Catalogo | null> {
    const i = this.filas.get(id);
    return Promise.resolve(i && i.tipo === tipo ? { ...i } : null);
  }

  buscarPorIdBloqueando(
    tipo: TipoCatalogo,
    id: number,
  ): Promise<Catalogo | null> {
    return this.buscarPorId(tipo, id);
  }

  buscarPorCodigo(
    tipo: TipoCatalogo,
    codigo: string,
  ): Promise<Catalogo | null> {
    const i = [...this.filas.values()].find(
      (x) => x.tipo === tipo && x.codigo === codigo,
    );
    return Promise.resolve(i ? { ...i } : null);
  }

  crear(datos: Partial<Catalogo>): Promise<Catalogo> {
    const item = crearItemCatalogo({ ...datos, id: this.siguienteId++ });
    this.filas.set(item.id, item);
    return Promise.resolve({ ...item });
  }

  guardar(item: Catalogo): Promise<Catalogo> {
    this.filas.set(item.id, { ...item });
    return Promise.resolve({ ...item });
  }
}

export class UfRepositorioFake {
  valores = new Map<string, ValorUf>();
  private siguienteId = 1;

  semilla(...valores: ValorUf[]): this {
    for (const v of valores) this.valores.set(v.fecha, { ...v });
    return this;
  }

  buscarPorFecha(fecha: string): Promise<ValorUf | null> {
    const v = this.valores.get(fecha);
    return Promise.resolve(v ? { ...v } : null);
  }

  entre(desde: string, hasta: string): Promise<ValorUf[]> {
    return Promise.resolve(
      [...this.valores.values()]
        .filter((v) => v.fecha >= desde && v.fecha <= hasta)
        .map((v) => ({ ...v })),
    );
  }

  listar(filtro: {
    desde?: string;
    hasta?: string;
    pagina: number;
    tamanio: number;
  }) {
    const todos = [...this.valores.values()]
      .filter(
        (v) =>
          (!filtro.desde || v.fecha >= filtro.desde) &&
          (!filtro.hasta || v.fecha <= filtro.hasta),
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const desde = (filtro.pagina - 1) * filtro.tamanio;
    return Promise.resolve<[ValorUf[], number]>([
      todos.slice(desde, desde + filtro.tamanio),
      todos.length,
    ]);
  }

  guardar(valor: ValorUf): Promise<ValorUf> {
    this.valores.set(valor.fecha, { ...valor });
    return Promise.resolve({ ...valor });
  }

  crear(datos: Partial<ValorUf>): Promise<ValorUf> {
    const v = crearValorUf({ ...datos, id: this.siguienteId++ });
    this.valores.set(v.fecha, v);
    return Promise.resolve({ ...v });
  }
}

export class ParametrosRepositorioFake {
  parametros = new Map<number, Parametro>();
  valores: ParametroValor[] = [];
  private siguienteValorId = 100;

  semilla(parametro: Parametro, ...valores: ParametroValor[]): this {
    this.parametros.set(parametro.id, { ...parametro });
    this.valores.push(...valores.map((v) => ({ ...v })));
    return this;
  }

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return trabajo({} as EntityManager);
  }

  listar(): Promise<Parametro[]> {
    return Promise.resolve(
      [...this.parametros.values()].map((p) => ({ ...p })),
    );
  }

  buscarPorId(id: number): Promise<Parametro | null> {
    const p = this.parametros.get(id);
    return Promise.resolve(p ? { ...p } : null);
  }

  buscarPorCodigo(codigo: string): Promise<Parametro | null> {
    const p = [...this.parametros.values()].find((x) => x.codigo === codigo);
    return Promise.resolve(p ? { ...p } : null);
  }

  buscarPorIdBloqueando(id: number): Promise<Parametro | null> {
    return this.buscarPorId(id);
  }

  guardarParametro(p: Parametro): Promise<Parametro> {
    this.parametros.set(p.id, { ...p });
    return Promise.resolve({ ...p });
  }

  valoresDe(ids: number[]): Promise<ParametroValor[]> {
    return Promise.resolve(
      this.valores
        .filter((v) => ids.includes(v.parametroId))
        .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))
        .map((v) => ({ ...v })),
    );
  }

  buscarValor(id: number): Promise<ParametroValor | null> {
    const v = this.valores.find((x) => x.id === id);
    return Promise.resolve(v ? { ...v } : null);
  }

  crearValor(datos: Partial<ParametroValor>): Promise<ParametroValor> {
    const v = crearValorParametro({ ...datos, id: this.siguienteValorId++ });
    this.valores.push(v);
    return Promise.resolve({ ...v });
  }

  eliminarValor(id: number): Promise<void> {
    this.valores = this.valores.filter((v) => v.id !== id);
    return Promise.resolve();
  }
}

export class ObrasRepositorioFake extends RepositorioMaestroFake<Obra> {
  clientes: Map<number, Cliente>;
  estados: Map<number, Catalogo>;
  adjuntos = 0;

  constructor(clientes: Map<number, Cliente>, estados: Map<number, Catalogo>) {
    super();
    this.clientes = clientes;
    this.estados = estados;
  }

  /** Une el cliente y el estado como lo hace la consulta real. */
  private conRelaciones(o: Obra | undefined): Obra | null {
    if (!o) return null;
    return {
      ...o,
      cliente: this.clientes.get(o.clienteId),
      estado: this.estados.get(o.estadoId),
    };
  }

  buscarPorCodigo(codigo: string): Promise<Obra | null> {
    return Promise.resolve(
      this.copia(this.vigentes().find((o) => o.codigoCentroCosto === codigo)),
    );
  }

  buscarConRelaciones(id: number): Promise<Obra | null> {
    const o = this.filas.get(id);
    return Promise.resolve(o && !o.eliminadoEn ? this.conRelaciones(o) : null);
  }

  listar(filtro: {
    estadoId?: number;
    clienteId?: number;
    pagina: number;
    tamanio: number;
  }) {
    const todos = this.vigentes().filter(
      (o) =>
        (filtro.estadoId === undefined || o.estadoId === filtro.estadoId) &&
        (filtro.clienteId === undefined || o.clienteId === filtro.clienteId),
    );
    const desde = (filtro.pagina - 1) * filtro.tamanio;
    return Promise.resolve<[Obra[], number]>([
      todos
        .slice(desde, desde + filtro.tamanio)
        .map((o) => this.conRelaciones(o)!),
      todos.length,
    ]);
  }

  contarAdjuntos(): Promise<number> {
    return Promise.resolve(this.adjuntos);
  }
}
