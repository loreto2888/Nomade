import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { COOKIE_SESION } from '../../app.constantes.js';
import {
  ContextoAuditoriaActual,
  UsuarioActual,
  type ActorAutenticado,
  type ContextoAuditoria,
} from '../../common/auth/actor.js';
import { ConflictResponseDto } from '../../common/errores/conflicto-version.js';
import { ErrorResponseDto } from '../../common/errores/error-response.dto.js';
import { RequierePermiso, Roles } from '../../common/permisos/decoradores.js';
import { Rol } from '../../common/permisos/rol.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import { CuentasBancariasService } from './cuentas-bancarias.service.js';
import {
  ActualizarCuentaBancariaDto,
  CrearCuentaBancariaDto,
  CuentaBancariaDto,
  EliminarCuentaBancariaDto,
} from './proveedores.dto.js';

const PARAMS = [
  {
    name: 'proveedorId',
    description: 'Identificador del proveedor.',
    example: 12,
  },
  {
    name: 'cuentaId',
    description: 'Identificador de la cuenta bancaria.',
    example: 4,
  },
] as const;

/**
 * Datos bancarios de proveedores: **solo administradores** (D-17). Toda
 * consulta y toda modificación queda en la bitácora (§13).
 */
@ApiTags('proveedores')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@ApiForbiddenResponse({
  type: ErrorResponseDto,
  description: 'Solo administradores.',
})
@Roles(Rol.Admin)
@Controller('proveedores/:proveedorId/cuentas-bancarias')
export class CuentasBancariasController {
  constructor(private readonly cuentas: CuentasBancariasService) {}

  @Get()
  @RequierePermiso('proveedores.datos_bancarios.consultar')
  @Auditar({
    accion: 'proveedor.cuenta_bancaria.consultar',
    entidad: 'proveedor',
    incluirRespuesta: false,
  })
  @ApiOperation({
    summary: 'Lista las cuentas bancarias de un proveedor (auditado)',
    description: 'Cada consulta queda registrada en la bitácora.',
  })
  @ApiParam(PARAMS[0])
  @ApiOkResponse({ type: [CuentaBancariaDto] })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  listarCuentasBancarias(
    @Param('proveedorId', ParseIntPipe) proveedorId: number,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<CuentaBancariaDto[]> {
    return this.cuentas.listar(proveedorId, auditoria);
  }

  @Post()
  @RequierePermiso('proveedores.datos_bancarios.modificar')
  @Auditar({
    accion: 'proveedor.cuenta_bancaria.crear',
    entidad: 'proveedor_cuenta_bancaria',
  })
  @ApiOperation({ summary: 'Agrega una cuenta bancaria al proveedor' })
  @ApiParam(PARAMS[0])
  @ApiCreatedResponse({ type: CuentaBancariaDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Ya existe esa cuenta (`CUENTA_BANCARIA_DUPLICADA`).',
  })
  crearCuentaBancaria(
    @Param('proveedorId', ParseIntPipe) proveedorId: number,
    @Body() dto: CrearCuentaBancariaDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<CuentaBancariaDto> {
    return this.cuentas.crear(proveedorId, dto, actor, auditoria);
  }

  @Patch(':cuentaId')
  @RequierePermiso('proveedores.datos_bancarios.modificar')
  @Auditar({
    accion: 'proveedor.cuenta_bancaria.actualizar',
    entidad: 'proveedor_cuenta_bancaria',
  })
  @ApiOperation({
    summary: 'Modifica una cuenta bancaria (con control de versión)',
  })
  @ApiParam(PARAMS[0])
  @ApiParam(PARAMS[1])
  @ApiOkResponse({ type: CuentaBancariaDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'No se puede quitar la marca de principal (`CUENTA_PRINCIPAL_REQUERIDA`).',
  })
  actualizarCuentaBancaria(
    @Param('proveedorId', ParseIntPipe) proveedorId: number,
    @Param('cuentaId', ParseIntPipe) cuentaId: number,
    @Body() dto: ActualizarCuentaBancariaDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<CuentaBancariaDto> {
    return this.cuentas.actualizar(
      proveedorId,
      cuentaId,
      dto,
      actor,
      auditoria,
    );
  }

  @Post(':cuentaId/eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequierePermiso('proveedores.datos_bancarios.modificar')
  @Auditar({
    accion: 'proveedor.cuenta_bancaria.eliminar',
    entidad: 'proveedor_cuenta_bancaria',
  })
  @ApiOperation({ summary: 'Elimina una cuenta bancaria (borrado lógico)' })
  @ApiParam(PARAMS[0])
  @ApiParam(PARAMS[1])
  @ApiNoContentResponse({ description: 'Cuenta eliminada.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  async eliminarCuentaBancaria(
    @Param('proveedorId', ParseIntPipe) proveedorId: number,
    @Param('cuentaId', ParseIntPipe) cuentaId: number,
    @Body() dto: EliminarCuentaBancariaDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<void> {
    await this.cuentas.eliminar(proveedorId, cuentaId, dto, actor, auditoria);
  }
}
