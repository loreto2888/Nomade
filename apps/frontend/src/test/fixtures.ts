import type { SesionApi } from '@/api/auth';
import type { UsuarioDto } from '@/api/generated';

const PERMISOS_OPERATIVOS = ['oc.aprobar', 'lote.aprobar', 'eepp.aprobar', 'presupuesto.aprobar'];
const PERMISOS_ADMIN = [
  'usuarios.consultar',
  'usuarios.crear',
  'auditoria.consultar',
  'importaciones.administrar',
];

export const sesionAdmin: SesionApi = {
  usuario: {
    id: 1,
    correo: 'admin@nomade.cl',
    nombre: 'Ana Administradora',
    rol: 'admin',
    debeCambiarClave: false,
    tema: 'claro',
  },
  permisos: [...PERMISOS_ADMIN, ...PERMISOS_OPERATIVOS],
  expiraEn: '2026-11-19T20:00:00.000Z',
};

export const sesionUsuario: SesionApi = {
  usuario: {
    id: 2,
    correo: 'camila@nomade.cl',
    nombre: 'Camila Rojas',
    rol: 'usuario',
    debeCambiarClave: false,
    tema: 'claro',
  },
  permisos: PERMISOS_OPERATIVOS,
  expiraEn: '2026-11-19T20:00:00.000Z',
};

export const sesionClaveTemporal: SesionApi = {
  ...sesionUsuario,
  usuario: { ...sesionUsuario.usuario, debeCambiarClave: true },
};

export function usuarioEjemplo(parcial: Partial<UsuarioDto> = {}): UsuarioDto {
  return {
    id: 2,
    correo: 'camila@nomade.cl',
    nombre: 'Camila Rojas',
    rol: 'usuario',
    activo: true,
    debeCambiarClave: false,
    bloqueadoHasta: null,
    ultimoAccesoEn: '2026-11-18T15:30:00.000Z',
    tema: 'claro',
    creadoEn: '2026-11-01T12:00:00.000Z',
    actualizadoEn: '2026-11-10T12:00:00.000Z',
    version: 3,
    ...parcial,
  };
}

// ---------------------------------------------------------------------------
// Fase 2: maestros y obras
// ---------------------------------------------------------------------------

import type {
  AdjuntoDto,
  CatalogoItemDto,
  ClienteDto,
  CuentaBancariaDto,
  ObraDto,
  ParametroDto,
  ProveedorDto,
  ResumenObraDto,
} from '@/api/generated';

export function clienteEjemplo(parcial: Partial<ClienteDto> = {}): ClienteDto {
  return {
    id: 5,
    rut: '76086428-5',
    razonSocial: 'Grupo Andino SpA',
    nombreFantasia: null,
    giro: null,
    contactoNombre: 'Marta Soto',
    correo: 'marta@andino.cl',
    telefono: '+56 2 2345 6789',
    direccion: null,
    creadoEn: '2026-11-01T12:00:00.000Z',
    actualizadoEn: '2026-11-10T12:00:00.000Z',
    version: 2,
    ...parcial,
  };
}

export function proveedorEjemplo(parcial: Partial<ProveedorDto> = {}): ProveedorDto {
  return {
    ...clienteEjemplo({ id: 12, rut: '11111111-1', razonSocial: 'Materiales Cordillera SpA' }),
    tieneDatosBancarios: false,
    ...parcial,
  };
}

export function cuentaEjemplo(parcial: Partial<CuentaBancariaDto> = {}): CuentaBancariaDto {
  return {
    id: 4,
    proveedorId: 12,
    banco: 'Banco de Chile',
    tipoCuenta: 'corriente',
    numeroCuenta: '0012345678',
    titular: 'Materiales Cordillera SpA',
    titularRut: '11111111-1',
    correoNotificacion: null,
    principal: true,
    creadoEn: '2026-11-01T12:00:00.000Z',
    actualizadoEn: '2026-11-01T12:00:00.000Z',
    version: 1,
    ...parcial,
  };
}

export const ESTADOS_OBRA: CatalogoItemDto[] = [
  {
    id: 1,
    tipo: 'estado_obra',
    codigo: 'en_preparacion',
    nombre: 'En preparación',
    descripcion: null,
    orden: 10,
    activo: true,
    protegido: true,
    version: 1,
  },
  {
    id: 2,
    tipo: 'estado_obra',
    codigo: 'activa',
    nombre: 'Activa',
    descripcion: null,
    orden: 20,
    activo: true,
    protegido: true,
    version: 1,
  },
  {
    id: 3,
    tipo: 'estado_obra',
    codigo: 'suspendida',
    nombre: 'Suspendida',
    descripcion: null,
    orden: 30,
    activo: true,
    protegido: false,
    version: 1,
  },
  {
    id: 4,
    tipo: 'estado_obra',
    codigo: 'terminada',
    nombre: 'Terminada',
    descripcion: null,
    orden: 40,
    activo: true,
    protegido: false,
    version: 1,
  },
  {
    id: 5,
    tipo: 'estado_obra',
    codigo: 'cerrada',
    nombre: 'Cerrada',
    descripcion: null,
    orden: 50,
    activo: true,
    protegido: true,
    version: 1,
  },
];

export function obraEjemplo(parcial: Partial<ObraDto> = {}): ObraDto {
  return {
    id: 1,
    codigoCentroCosto: 'CC-001',
    nombre: 'Local Parque Norte',
    cliente: { id: 5, rut: '76086428-5', razonSocial: 'Grupo Andino SpA' },
    estado: { id: 2, codigo: 'activa', nombre: 'Activa' },
    responsable: 'Camila Rojas',
    direccion: 'Av. Parque Norte 1234, Santiago',
    fechaInicio: '2026-03-01',
    fechaTermino: '2026-12-15',
    monedaContrato: 'CLP',
    montoContrato: 185_000_000,
    montoContratoClp: 185_000_000,
    fechaValorUf: null,
    valorUf: null,
    observaciones: null,
    creadoEn: '2026-03-01T12:00:00.000Z',
    actualizadoEn: '2026-03-02T12:00:00.000Z',
    version: 3,
    ...parcial,
  };
}

export function resumenEjemplo(parcial: Partial<ResumenObraDto> = {}): ResumenObraDto {
  return {
    obra: obraEjemplo(),
    cantidadAdjuntos: 0,
    valorUfHoy: { fecha: '2026-11-19', valor: 39284.8712 },
    montoContratoClpHoy: null,
    ...parcial,
  };
}

export function adjuntoEjemplo(parcial: Partial<AdjuntoDto> = {}): AdjuntoDto {
  return {
    id: 9,
    entidadTipo: 'obra',
    entidadId: 1,
    nombreOriginal: 'Contrato firmado.pdf',
    tipoMime: 'application/pdf',
    extension: 'pdf',
    tamanioBytes: 482_133,
    descripcion: null,
    creadoEn: '2026-11-18T15:30:00.000Z',
    creadoPor: 1,
    ...parcial,
  };
}

export function parametroEjemplo(parcial: Partial<ParametroDto> = {}): ParametroDto {
  return {
    id: 1,
    codigo: 'iva',
    nombre: 'IVA',
    descripcion: 'Tasa del impuesto al valor agregado.',
    categoria: 'Impuestos',
    tipoValor: 'porcentaje',
    unidad: '%',
    valorVigente: {
      id: 1,
      valor: '19',
      valorNumerico: 19,
      vigenteDesde: '2003-01-01',
      vigenteHasta: null,
      motivo: 'Valor inicial provisorio',
      creadoEn: '2026-11-01T12:00:00.000Z',
      creadoPor: null,
    },
    proximoValor: null,
    version: 1,
    ...parcial,
  };
}

// ---------------------------------------------------------------------------
// Fase 3: presupuesto e importaciones
// ---------------------------------------------------------------------------

import type {
  ComparacionPresupuestoDto,
  FilaImportacionDto,
  ImportacionLoteDto,
  PartidaDto,
  PresupuestoDetalleDto,
  PresupuestoVersionDto,
} from '@/api/generated';

export const FAMILIAS_PARTIDA: CatalogoItemDto[] = [
  {
    id: 22,
    tipo: 'familia_partida',
    codigo: 'obras_preliminares',
    nombre: 'Obras preliminares',
    descripcion: null,
    orden: 10,
    activo: true,
    protegido: false,
    version: 1,
  },
  {
    id: 23,
    tipo: 'familia_partida',
    codigo: 'obra_gruesa',
    nombre: 'Obra gruesa',
    descripcion: null,
    orden: 20,
    activo: true,
    protegido: false,
    version: 1,
  },
];

export function versionPresupuestoEjemplo(
  parcial: Partial<PresupuestoVersionDto> = {},
): PresupuestoVersionDto {
  return {
    id: 12,
    obraId: 1,
    numero: 1,
    estado: 'borrador',
    vigente: false,
    descripcion: null,
    moneda: 'CLP',
    valorUf: null,
    fechaValorUf: null,
    total: 3_000_000,
    totalClp: 3_000_000,
    cantidadPartidas: 2,
    copiadaDeId: null,
    copiadaDeNumero: null,
    importacionLoteId: null,
    creadoPor: { id: 3, nombre: 'Tomás Silva' },
    creadoEn: '2026-11-10T12:00:00.000Z',
    actualizadoEn: '2026-11-10T12:00:00.000Z',
    enviadoEn: null,
    enviadoPor: null,
    resueltoEn: null,
    resueltoPor: null,
    motivoResolucion: null,
    version: 4,
    ...parcial,
  };
}

export function partidaEjemplo(parcial: Partial<PartidaDto> = {}): PartidaDto {
  return {
    id: 31,
    versionId: 12,
    orden: 1,
    codigo: '1.1',
    familia: { id: 22, codigo: 'obras_preliminares', nombre: 'Obras preliminares' },
    descripcion: 'Radier de hormigón',
    unidad: 'm2',
    cantidad: 120.5,
    precioUnitario: 18_500,
    total: 2_229_250,
    totalClp: 2_229_250,
    version: 1,
    ...parcial,
  };
}

export function detallePresupuestoEjemplo(
  version: Partial<PresupuestoVersionDto> = {},
  partidas?: PartidaDto[],
): PresupuestoDetalleDto {
  const lista = partidas ?? [
    partidaEjemplo(),
    partidaEjemplo({
      id: 32,
      orden: 2,
      codigo: '2.1',
      familia: { id: 23, codigo: 'obra_gruesa', nombre: 'Obra gruesa' },
      descripcion: 'Muros de albañilería',
      unidad: 'm2',
      cantidad: 40,
      precioUnitario: 19_268.75,
      total: 770_750,
      totalClp: 770_750,
    }),
  ];
  const v = versionPresupuestoEjemplo({ cantidadPartidas: lista.length, ...version });
  return {
    version: v,
    partidas: lista,
    totalesPorFamilia: [
      {
        familia: { id: 22, codigo: 'obras_preliminares', nombre: 'Obras preliminares' },
        cantidadPartidas: 1,
        total: 2_229_250,
        totalClp: 2_229_250,
      },
      {
        familia: { id: 23, codigo: 'obra_gruesa', nombre: 'Obra gruesa' },
        cantidadPartidas: 1,
        total: 770_750,
        totalClp: 770_750,
      },
    ],
  };
}

export function comparacionEjemplo(
  parcial: Partial<ComparacionPresupuestoDto> = {},
): ComparacionPresupuestoDto {
  return {
    base: versionPresupuestoEjemplo({ id: 11, numero: 1, estado: 'aprobado', vigente: true }),
    nueva: versionPresupuestoEjemplo({ id: 12, numero: 2 }),
    filas: [
      {
        codigo: '1.1',
        cambio: 'modificada',
        descripcion: 'Radier de hormigón',
        base: partidaEjemplo({ totalClp: 1_000_000 }),
        nueva: partidaEjemplo({ totalClp: 2_229_250 }),
        diferenciaClp: 1_229_250,
      },
      {
        codigo: '3.1',
        cambio: 'nueva',
        descripcion: 'Pintura',
        base: null,
        nueva: partidaEjemplo({ id: 40, codigo: '3.1', descripcion: 'Pintura', totalClp: 500_000 }),
        diferenciaClp: 500_000,
      },
      {
        codigo: '4.1',
        cambio: 'eliminada',
        descripcion: 'Cierre perimetral',
        base: partidaEjemplo({ id: 41, codigo: '4.1', totalClp: 300_000 }),
        nueva: null,
        diferenciaClp: -300_000,
      },
      {
        codigo: '2.1',
        cambio: 'sin_cambios',
        descripcion: 'Muros',
        base: partidaEjemplo({ id: 42, codigo: '2.1', totalClp: 770_750 }),
        nueva: partidaEjemplo({ id: 43, codigo: '2.1', totalClp: 770_750 }),
        diferenciaClp: 0,
      },
    ],
    totalBaseClp: 2_070_750,
    totalNuevoClp: 3_500_000,
    diferenciaClp: 1_429_250,
    nuevas: 1,
    eliminadas: 1,
    modificadas: 1,
    sinCambios: 1,
    ...parcial,
  };
}

export function loteEjemplo(parcial: Partial<ImportacionLoteDto> = {}): ImportacionLoteDto {
  return {
    id: 7,
    tipo: 'presupuesto',
    estado: 'previsualizado',
    obra: { id: 1, codigoCentroCosto: 'CC-001', nombre: 'Local Parque Norte' },
    nombreArchivo: 'presupuesto-local.xlsx',
    tamanioBytes: 48_213,
    totalFilas: 3,
    filasValidas: 3,
    filasConError: 0,
    montoTotal: 3_000_000,
    moneda: 'CLP',
    presupuestoVersionId: null,
    confirmadoEn: null,
    creadoPor: { id: 1, nombre: 'Ana Administradora' },
    creadoEn: '2026-11-19T12:00:00.000Z',
    version: 1,
    ...parcial,
  };
}

export function filaImportacionEjemplo(
  parcial: Partial<FilaImportacionDto> = {},
): FilaImportacionDto {
  return {
    numeroFila: 2,
    datos: {
      codigo: '1.1',
      familia: 'Obra gruesa',
      descripcion: 'Radier',
      unidad: 'm2',
      cantidad: '120,5',
      precioUnitario: '18500',
    },
    valida: true,
    errores: [],
    ...parcial,
  };
}
