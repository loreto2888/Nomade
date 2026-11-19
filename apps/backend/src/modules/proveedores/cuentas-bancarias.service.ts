import { HttpStatus, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { esViolacionUnica } from '../../common/base-datos/errores-pg.js';
import { conflictoVersion } from '../../common/errores/conflicto-version.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import type { CuentaBancariaProveedor } from './proveedor.entity.js';
import type {
  ActualizarCuentaBancariaDto,
  CrearCuentaBancariaDto,
  CuentaBancariaDto,
  EliminarCuentaBancariaDto,
} from './proveedores.dto.js';
import {
  CuentasBancariasRepositorio,
  ProveedoresRepositorio,
} from './proveedores.repositorio.js';

const RESTRICCION_DUPLICADA = 'ux_cuenta_proveedor_banco_numero';
const RESTRICCION_PRINCIPAL = 'ux_cuenta_proveedor_principal';

export function aCuentaBancariaDto(
  c: CuentaBancariaProveedor,
): CuentaBancariaDto {
  return {
    id: c.id,
    proveedorId: c.proveedorId,
    banco: c.banco,
    tipoCuenta: c.tipoCuenta,
    numeroCuenta: c.numeroCuenta,
    titular: c.titular,
    titularRut: c.titularRut,
    correoNotificacion: c.correoNotificacion,
    principal: c.principal,
    creadoEn: c.createdAt.toISOString(),
    actualizadoEn: c.updatedAt.toISOString(),
    version: c.version,
  };
}

const proveedorNoEncontrado = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'PROVEEDOR_NO_ENCONTRADO',
    'El proveedor no existe.',
  );

const cuentaNoEncontrada = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'CUENTA_BANCARIA_NO_ENCONTRADA',
    'La cuenta bancaria no existe.',
  );

const cuentaDuplicada = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.CONFLICT,
    'CUENTA_BANCARIA_DUPLICADA',
    'El proveedor ya tiene registrada una cuenta con ese banco y número.',
  );

/**
 * Cuentas bancarias de proveedores. Todos los métodos se exponen solo al
 * administrador (D-17) y cada consulta o cambio queda en la bitácora (§13).
 */
@Injectable()
export class CuentasBancariasService {
  constructor(
    private readonly proveedores: ProveedoresRepositorio,
    private readonly cuentas: CuentasBancariasRepositorio,
  ) {}

  /** Consulta auditada: la bitácora registra quién vio los datos bancarios de qué proveedor. */
  async listar(
    proveedorId: number,
    auditoria: ContextoAuditoria,
  ): Promise<CuentaBancariaDto[]> {
    if (!(await this.proveedores.buscarPorId(proveedorId))) {
      throw proveedorNoEncontrado();
    }
    const cuentas = await this.cuentas.listarPorProveedor(proveedorId);
    auditoria.entidadId = proveedorId;
    auditoria.despues = { cuentasConsultadas: cuentas.length };
    return cuentas.map(aCuentaBancariaDto);
  }

  async crear(
    proveedorId: number,
    dto: CrearCuentaBancariaDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<CuentaBancariaDto> {
    try {
      const creada = await this.cuentas.enTransaccion(async (tx) => {
        // El bloqueo del proveedor serializa los cambios de "cuenta principal".
        if (!(await this.proveedores.buscarPorIdBloqueando(proveedorId, tx))) {
          throw proveedorNoEncontrado();
        }
        if (
          await this.cuentas.buscarDuplicada(
            proveedorId,
            dto.banco,
            dto.numeroCuenta,
            tx,
          )
        ) {
          throw cuentaDuplicada();
        }
        const existentes = await this.cuentas.listarPorProveedor(
          proveedorId,
          tx,
        );
        const principal = dto.principal === true || existentes.length === 0;
        if (principal) {
          await this.cuentas.quitarPrincipalExcepto(
            proveedorId,
            null,
            actor.id,
            tx,
          );
        }
        return this.cuentas.crear(
          {
            proveedorId,
            banco: dto.banco,
            tipoCuenta: dto.tipoCuenta,
            numeroCuenta: dto.numeroCuenta,
            titular: dto.titular,
            titularRut: dto.titularRut,
            correoNotificacion: dto.correoNotificacion ?? null,
            principal,
            version: 1,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
          tx,
        );
      });
      const resultado = aCuentaBancariaDto(creada);
      auditoria.entidadId = creada.id;
      auditoria.despues = resultado;
      return resultado;
    } catch (error) {
      throw this.traducir(error);
    }
  }

  async actualizar(
    proveedorId: number,
    cuentaId: number,
    dto: ActualizarCuentaBancariaDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<CuentaBancariaDto> {
    try {
      const { antes, despues } = await this.cuentas.enTransaccion(
        async (tx) => {
          const cuenta = await this.bloquear(proveedorId, cuentaId, tx);
          if (cuenta.version !== dto.version)
            throw conflictoVersion(cuenta.version);
          const antes = aCuentaBancariaDto(cuenta);

          if (dto.principal === false && cuenta.principal) {
            throw new ErrorAplicacion(
              HttpStatus.UNPROCESSABLE_ENTITY,
              'CUENTA_PRINCIPAL_REQUERIDA',
              'No se puede quitar la marca de cuenta principal: marca otra cuenta como principal.',
            );
          }
          const banco = dto.banco ?? cuenta.banco;
          const numero = dto.numeroCuenta ?? cuenta.numeroCuenta;
          if (
            (banco.toLowerCase() !== cuenta.banco.toLowerCase() ||
              numero !== cuenta.numeroCuenta) &&
            (await this.cuentas.buscarDuplicada(proveedorId, banco, numero, tx))
          ) {
            throw cuentaDuplicada();
          }
          if (dto.principal === true && !cuenta.principal) {
            await this.cuentas.quitarPrincipalExcepto(
              proveedorId,
              cuenta.id,
              actor.id,
              tx,
            );
            cuenta.principal = true;
          }
          if (dto.banco !== undefined) cuenta.banco = dto.banco;
          if (dto.tipoCuenta !== undefined) cuenta.tipoCuenta = dto.tipoCuenta;
          if (dto.numeroCuenta !== undefined)
            cuenta.numeroCuenta = dto.numeroCuenta;
          if (dto.titular !== undefined) cuenta.titular = dto.titular;
          if (dto.titularRut !== undefined) cuenta.titularRut = dto.titularRut;
          if (dto.correoNotificacion !== undefined) {
            cuenta.correoNotificacion = dto.correoNotificacion;
          }
          cuenta.version += 1;
          cuenta.updatedBy = actor.id;
          const guardada = await this.cuentas.guardar(cuenta, tx);
          return { antes, despues: aCuentaBancariaDto(guardada) };
        },
      );
      auditoria.entidadId = cuentaId;
      auditoria.antes = antes;
      auditoria.despues = despues;
      return despues;
    } catch (error) {
      throw this.traducir(error);
    }
  }

  /** Borrado lógico. Si era la principal, la siguiente cuenta vigente pasa a serlo. */
  async eliminar(
    proveedorId: number,
    cuentaId: number,
    dto: EliminarCuentaBancariaDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<void> {
    const antes = await this.cuentas.enTransaccion(async (tx) => {
      const cuenta = await this.bloquear(proveedorId, cuentaId, tx);
      if (cuenta.version !== dto.version)
        throw conflictoVersion(cuenta.version);
      const antes = aCuentaBancariaDto(cuenta);
      const eraPrincipal = cuenta.principal;
      cuenta.principal = false;
      cuenta.eliminadoEn = new Date();
      cuenta.eliminadoPor = actor.id;
      cuenta.updatedBy = actor.id;
      cuenta.version += 1;
      await this.cuentas.guardar(cuenta, tx);
      if (eraPrincipal) {
        const siguiente = await this.cuentas.primeraVigenteExcepto(
          proveedorId,
          cuentaId,
          tx,
        );
        if (siguiente) {
          siguiente.principal = true;
          siguiente.updatedBy = actor.id;
          siguiente.version += 1;
          await this.cuentas.guardar(siguiente, tx);
        }
      }
      return antes;
    });
    auditoria.entidadId = cuentaId;
    auditoria.antes = antes;
    auditoria.motivo = dto.motivo;
  }

  /** Bloquea el proveedor (mutex de "principal") y luego la cuenta, que debe ser suya. */
  private async bloquear(
    proveedorId: number,
    cuentaId: number,
    tx: EntityManager,
  ): Promise<CuentaBancariaProveedor> {
    if (!(await this.proveedores.buscarPorIdBloqueando(proveedorId, tx))) {
      throw proveedorNoEncontrado();
    }
    const cuenta = await this.cuentas.buscarPorIdBloqueando(cuentaId, tx);
    if (!cuenta || cuenta.proveedorId !== proveedorId)
      throw cuentaNoEncontrada();
    return cuenta;
  }

  private traducir(error: unknown): unknown {
    if (esViolacionUnica(error, RESTRICCION_DUPLICADA))
      return cuentaDuplicada();
    if (esViolacionUnica(error, RESTRICCION_PRINCIPAL)) {
      return new ErrorAplicacion(
        HttpStatus.CONFLICT,
        'CONFLICTO',
        'Otra persona cambió la cuenta principal del proveedor. Reintenta.',
      );
    }
    return error;
  }
}
