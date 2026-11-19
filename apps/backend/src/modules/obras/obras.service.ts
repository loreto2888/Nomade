import { HttpStatus, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { esViolacionUnica } from '../../common/base-datos/errores-pg.js';
import { ufAClp, type ValorUfDia } from '../../common/dinero/conversion-uf.js';
import { conflictoVersion } from '../../common/errores/conflicto-version.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { Reloj } from '../../common/tiempo/reloj.js';
import { CatalogosRepositorio } from '../catalogos/catalogos.repositorio.js';
import {
  CodigoEstadoObra,
  TipoCatalogo,
} from '../catalogos/catalogos.tipos.js';
import type { Catalogo } from '../catalogos/catalogo.entity.js';
import { ClientesRepositorio } from '../clientes/clientes.repositorio.js';
import { UfService } from '../uf/uf.service.js';
import { calcularContrato } from './contrato.js';
import type { Obra } from './obra.entity.js';
import type {
  ActualizarObraDto,
  CrearObraDto,
  EliminarObraDto,
  ListarObrasDto,
  ObraDto,
  PaginaObrasDto,
  ResumenObraDto,
} from './obras.dto.js';
import { aObraDto } from './obras.mapper.js';
import { ObrasRepositorio } from './obras.repositorio.js';
import { MonedaContrato } from './obras.tipos.js';

const RESTRICCION_CENTRO_COSTO = 'ux_obra_codigo_centro_costo';

const noEncontrada = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'OBRA_NO_ENCONTRADA',
    'La obra no existe.',
  );

const centroCostoDuplicado = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.CONFLICT,
    'CENTRO_COSTO_DUPLICADO',
    'Ya existe una obra con ese centro de costo.',
    [
      {
        campo: 'codigoCentroCosto',
        errores: ['Ya existe una obra con ese centro de costo.'],
      },
    ],
  );

const obraCerrada = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'OBRA_CERRADA',
    'La obra está cerrada: solo se puede consultar.',
  );

/** Valida `fechaTermino >= fechaInicio` (400 con el campo afectado). */
export function validarFechasObra(
  inicio: string | null,
  termino: string | null,
): void {
  if (inicio && termino && termino < inicio) {
    throw new ErrorAplicacion(
      HttpStatus.BAD_REQUEST,
      'VALIDACION',
      'Los datos enviados no son válidos.',
      [
        {
          campo: 'fechaTermino',
          errores: [
            'La fecha de término no puede ser anterior a la de inicio.',
          ],
        },
      ],
    );
  }
}

@Injectable()
export class ObrasService {
  constructor(
    private readonly obras: ObrasRepositorio,
    private readonly clientes: ClientesRepositorio,
    private readonly catalogos: CatalogosRepositorio,
    private readonly uf: UfService,
    private readonly reloj: Reloj,
  ) {}

  async listar(filtro: ListarObrasDto): Promise<PaginaObrasDto> {
    const [obras, total] = await this.obras.listar(filtro);
    return {
      items: obras.map(aObraDto),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }

  async obtener(id: number): Promise<ObraDto> {
    const obra = await this.obras.buscarConRelaciones(id);
    if (!obra) throw noEncontrada();
    return aObraDto(obra);
  }

  /** Ficha 360° (pestaña Resumen): datos de la obra, adjuntos y equivalente en CLP a la UF de hoy. */
  async resumen(id: number): Promise<ResumenObraDto> {
    const obra = await this.obtener(id);
    const [cantidadAdjuntos, valorUfHoy] = await Promise.all([
      this.obras.contarAdjuntos(id),
      this.uf.valorParaFecha(this.reloj.hoy()),
    ]);
    const clpHoy =
      obra.monedaContrato === MonedaContrato.Uf &&
      obra.montoContrato !== null &&
      valorUfHoy
        ? ufAClp(obra.montoContrato, valorUfHoy.valor)
        : null;
    return { obra, cantidadAdjuntos, valorUfHoy, montoContratoClpHoy: clpHoy };
  }

  async crear(
    dto: CrearObraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<ObraDto> {
    validarFechasObra(dto.fechaInicio ?? null, dto.fechaTermino ?? null);
    const moneda = dto.monedaContrato ?? MonedaContrato.Clp;
    const monto = dto.montoContrato ?? null;
    const valorUf = await this.valorUfSiCorresponde(
      moneda,
      monto,
      dto.fechaConversionUf,
    );
    const contrato = calcularContrato({ moneda, monto, valorUf });

    try {
      const creada = await this.obras.enTransaccion(async (tx) => {
        await this.exigirCliente(dto.clienteId, tx);
        const estado =
          dto.estadoId !== undefined
            ? await this.resolverEstadoDestino(dto.estadoId, tx)
            : await this.estadoInicial(tx);
        if (await this.obras.buscarPorCodigo(dto.codigoCentroCosto, tx)) {
          throw centroCostoDuplicado();
        }
        const obra = await this.obras.crear(
          {
            codigoCentroCosto: dto.codigoCentroCosto,
            nombre: dto.nombre,
            clienteId: dto.clienteId,
            estadoId: estado.id,
            responsable: dto.responsable ?? null,
            direccion: dto.direccion ?? null,
            fechaInicio: dto.fechaInicio ?? null,
            fechaTermino: dto.fechaTermino ?? null,
            ...contrato,
            observaciones: dto.observaciones ?? null,
            version: 1,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
          tx,
        );
        return aObraDto((await this.obras.buscarConRelaciones(obra.id, tx))!);
      });
      auditoria.entidadId = creada.id;
      auditoria.despues = creada;
      return creada;
    } catch (error) {
      if (esViolacionUnica(error, RESTRICCION_CENTRO_COSTO))
        throw centroCostoDuplicado();
      throw error;
    }
  }

  async actualizar(
    id: number,
    dto: ActualizarObraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<ObraDto> {
    try {
      const { antes, despues } = await this.obras.enTransaccion(async (tx) => {
        const obra = await this.obras.buscarPorIdBloqueando(id, tx);
        if (!obra) throw noEncontrada();
        if (obra.version !== dto.version) throw conflictoVersion(obra.version);
        const estadoActual = await this.estadoDe(obra, tx);
        if (estadoActual.codigo === CodigoEstadoObra.Cerrada)
          throw obraCerrada();
        const antes = aObraDto((await this.obras.buscarConRelaciones(id, tx))!);

        this.rechazarNulos(dto);
        if (
          dto.codigoCentroCosto !== undefined &&
          dto.codigoCentroCosto !== obra.codigoCentroCosto
        ) {
          const otra = await this.obras.buscarPorCodigo(
            dto.codigoCentroCosto,
            tx,
          );
          if (otra && otra.id !== obra.id) throw centroCostoDuplicado();
          obra.codigoCentroCosto = dto.codigoCentroCosto;
        }
        if (dto.nombre !== undefined) obra.nombre = dto.nombre;
        if (dto.clienteId !== undefined && dto.clienteId !== obra.clienteId) {
          await this.exigirCliente(dto.clienteId, tx);
          obra.clienteId = dto.clienteId;
        }
        if (dto.estadoId !== undefined && dto.estadoId !== obra.estadoId) {
          obra.estadoId = (
            await this.resolverEstadoDestino(dto.estadoId, tx)
          ).id;
        }
        if (dto.responsable !== undefined) obra.responsable = dto.responsable;
        if (dto.direccion !== undefined) obra.direccion = dto.direccion;
        if (dto.fechaInicio !== undefined) obra.fechaInicio = dto.fechaInicio;
        if (dto.fechaTermino !== undefined)
          obra.fechaTermino = dto.fechaTermino;
        if (dto.observaciones !== undefined)
          obra.observaciones = dto.observaciones;
        validarFechasObra(obra.fechaInicio, obra.fechaTermino);

        const cambiaContrato =
          dto.monedaContrato !== undefined ||
          dto.montoContrato !== undefined ||
          dto.fechaConversionUf !== undefined;
        if (cambiaContrato) {
          const moneda = dto.monedaContrato ?? obra.monedaContrato;
          const monto =
            dto.montoContrato !== undefined
              ? dto.montoContrato
              : obra.montoContrato;
          const valorUf = await this.valorUfSiCorresponde(
            moneda,
            monto,
            dto.fechaConversionUf,
          );
          Object.assign(obra, calcularContrato({ moneda, monto, valorUf }));
        }

        obra.version += 1;
        obra.updatedBy = actor.id;
        await this.obras.guardar(obra, tx);
        const despues = aObraDto(
          (await this.obras.buscarConRelaciones(id, tx))!,
        );
        return { antes, despues };
      });
      auditoria.entidadId = id;
      auditoria.antes = antes;
      auditoria.despues = despues;
      return despues;
    } catch (error) {
      if (esViolacionUnica(error, RESTRICCION_CENTRO_COSTO))
        throw centroCostoDuplicado();
      throw error;
    }
  }

  /** Borrado lógico, solo mientras la obra está "en preparación" (aún sin operación). */
  async eliminar(
    id: number,
    dto: EliminarObraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<void> {
    const antes = await this.obras.enTransaccion(async (tx) => {
      const obra = await this.obras.buscarPorIdBloqueando(id, tx);
      if (!obra) throw noEncontrada();
      if (obra.version !== dto.version) throw conflictoVersion(obra.version);
      const estado = await this.estadoDe(obra, tx);
      if (estado.codigo !== CodigoEstadoObra.EnPreparacion) {
        throw new ErrorAplicacion(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'OBRA_NO_ELIMINABLE',
          'Solo se puede eliminar una obra que está "en preparación".',
        );
      }
      const antes = aObraDto((await this.obras.buscarConRelaciones(id, tx))!);
      obra.eliminadoEn = new Date();
      obra.eliminadoPor = actor.id;
      obra.updatedBy = actor.id;
      obra.version += 1;
      await this.obras.guardar(obra, tx);
      return antes;
    });
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.motivo = dto.motivo;
  }

  // -------------------------------------------------------------------------

  /** `null` explícito en campos obligatorios → 400 (los opcionales sí se pueden vaciar). */
  private rechazarNulos(dto: ActualizarObraDto): void {
    const obligatorios = [
      'codigoCentroCosto',
      'nombre',
      'clienteId',
      'estadoId',
    ] as const;
    for (const campo of obligatorios) {
      if ((dto[campo] as unknown) === null) {
        throw new ErrorAplicacion(
          HttpStatus.BAD_REQUEST,
          'VALIDACION',
          'Los datos enviados no son válidos.',
          [{ campo, errores: ['Este campo es obligatorio.'] }],
        );
      }
    }
    if ((dto.monedaContrato as unknown) === null) {
      throw new ErrorAplicacion(
        HttpStatus.BAD_REQUEST,
        'VALIDACION',
        'Los datos enviados no son válidos.',
        [{ campo: 'monedaContrato', errores: ['Este campo es obligatorio.'] }],
      );
    }
  }

  private async exigirCliente(
    clienteId: number,
    tx: EntityManager,
  ): Promise<void> {
    if (!(await this.clientes.buscarPorId(clienteId, tx))) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'CLIENTE_NO_ENCONTRADO',
        'El cliente seleccionado no existe.',
        [
          {
            campo: 'clienteId',
            errores: ['El cliente seleccionado no existe.'],
          },
        ],
      );
    }
  }

  private async estadoInicial(tx: EntityManager): Promise<Catalogo> {
    const estado = await this.catalogos.buscarPorCodigo(
      TipoCatalogo.EstadoObra,
      CodigoEstadoObra.EnPreparacion,
      tx,
    );
    if (!estado) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ESTADO_NO_DISPONIBLE',
        'Falta el estado de obra "en preparación" en el catálogo.',
      );
    }
    return estado;
  }

  /** Estado al que se puede llevar una obra: activo en el catálogo y distinto de "cerrada". */
  private async resolverEstadoDestino(
    estadoId: number,
    tx: EntityManager,
  ): Promise<Catalogo> {
    const estado = await this.catalogos.buscarPorId(
      TipoCatalogo.EstadoObra,
      estadoId,
      tx,
    );
    if (!estado?.activo) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ESTADO_NO_DISPONIBLE',
        'El estado seleccionado no existe o está inactivo.',
        [
          {
            campo: 'estadoId',
            errores: ['El estado seleccionado no existe o está inactivo.'],
          },
        ],
      );
    }
    if (estado.codigo === CodigoEstadoObra.Cerrada) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'CIERRE_NO_DISPONIBLE',
        'El cierre de una obra se realiza desde el módulo de cierres (aún no disponible).',
        [
          {
            campo: 'estadoId',
            errores: ['El cierre de obra no se puede hacer desde la edición.'],
          },
        ],
      );
    }
    return estado;
  }

  private async estadoDe(obra: Obra, tx: EntityManager): Promise<Catalogo> {
    const estado = await this.catalogos.buscarPorId(
      TipoCatalogo.EstadoObra,
      obra.estadoId,
      tx,
    );
    if (!estado)
      throw new Error(`La obra ${obra.id} tiene un estado inexistente`);
    return estado;
  }

  /** Valor de la UF solo si el contrato es en UF y tiene monto; 422 si no hay valor cargado. */
  private async valorUfSiCorresponde(
    moneda: MonedaContrato,
    monto: number | null,
    fechaConversion: string | null | undefined,
  ): Promise<ValorUfDia | null> {
    if (moneda !== MonedaContrato.Uf || monto === null) return null;
    return this.uf.exigirValorParaFecha(fechaConversion ?? this.reloj.hoy());
  }
}
