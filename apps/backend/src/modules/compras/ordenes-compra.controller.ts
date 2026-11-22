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
  Query,
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
import { RequierePermiso } from '../../common/permisos/decoradores.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import {
  AnularDocumentoCompraDto,
  AprobarDocumentoCompraDto,
  EliminarDocumentoCompraDto,
  EnviarDocumentoCompraDto,
  RechazarDocumentoCompraDto,
} from './compras.dto.js';
import {
  ActualizarOrdenCompraDto,
  CrearOrdenCompraDto,
  ListarOrdenesCompraDto,
  OrdenCompraDetalleDto,
  PaginaOrdenesCompraDto,
  RecibirOrdenCompraDto,
} from './ordenes-compra.dto.js';
import { OrdenesCompraService } from './ordenes-compra.service.js';

const PARAM_ID = {
  name: 'id',
  description: 'Identificador de la orden de compra.',
  example: 12,
};

@ApiTags('ordenes-compra')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller('ordenes-compra')
export class OrdenesCompraController {
  constructor(private readonly servicio: OrdenesCompraService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista órdenes de compra (paginado, del folio más reciente al más antiguo)',
    description: 'Todos los usuarios ven todos los documentos (D-03).',
  })
  @ApiOkResponse({ type: PaginaOrdenesCompraDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listarOrdenesCompra(
    @Query() filtro: ListarOrdenesCompraDto,
  ): Promise<PaginaOrdenesCompraDto> {
    return this.servicio.listar(filtro);
  }

  @Post()
  @Auditar({ accion: 'orden_compra.crear', entidad: 'orden_compra' })
  @ApiOperation({
    summary: 'Crea una OC en borrador (materiales o parcial de OT)',
    description:
      'Materiales: obra, proveedor y líneas. Parcial: OT aprobada, hito y porcentaje de la OT, con tope en el saldo del hito. El IVA usa el parámetro vigente a la fecha de la OC.',
  })
  @ApiCreatedResponse({ type: OrdenCompraDetalleDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  crearOrdenCompra(
    @Body() dto: CrearOrdenCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    return this.servicio.crear(dto, actor, auditoria);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene la orden de compra' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenCompraDetalleDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerOrdenCompra(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrdenCompraDetalleDto> {
    return this.servicio.obtener(id);
  }

  @Patch(':id')
  @Auditar({ accion: 'orden_compra.actualizar', entidad: 'orden_compra' })
  @ApiOperation({
    summary: 'Modifica un borrador (con control de versión)',
    description:
      'Datos y líneas (reemplazan a las actuales) mientras es un borrador. Supuesto H5: una OC aprobada no se edita, se anula.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenCompraDetalleDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'No es un borrador (`DOCUMENTO_NO_EDITABLE`) u otra regla de negocio.',
  })
  actualizarOrdenCompra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarOrdenCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    return this.servicio.actualizar(id, dto, actor, auditoria);
  }

  @Post(':id/eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auditar({ accion: 'orden_compra.eliminar', entidad: 'orden_compra' })
  @ApiOperation({
    summary: 'Elimina un borrador (borrado lógico)',
    description:
      'Solo borradores: lo enviado a revisión queda en el historial.',
  })
  @ApiParam(PARAM_ID)
  @ApiNoContentResponse({ description: 'Borrador eliminado.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  async eliminarOrdenCompra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EliminarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<void> {
    await this.servicio.eliminar(id, dto, actor, auditoria);
  }

  @Post(':id/enviar-revision')
  @HttpCode(HttpStatus.OK)
  @Auditar({ accion: 'orden_compra.enviar_revision', entidad: 'orden_compra' })
  @ApiOperation({
    summary: 'Envía un borrador a revisión',
    description:
      'borrador → en revisión. Debe tener monto (y líneas, si es de materiales) y caber en el saldo de la OT.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenCompraDetalleDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  enviarOrdenCompraARevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    return this.servicio.enviarARevision(id, dto, actor, auditoria);
  }

  @Post(':id/aprobar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('oc.aprobar')
  @Auditar({ accion: 'orden_compra.aprobar', entidad: 'orden_compra' })
  @ApiOperation({
    summary: 'Aprueba un documento en revisión',
    description:
      'Registra el compromiso (CLP neto) en el libro de movimientos. El `usuario` no puede aprobar lo que él mismo creó; el `admin` sí (D-10).',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenCompraDetalleDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Autoaprobación (`AUTOAPROBACION_NO_PERMITIDA`).',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  aprobarOrdenCompra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    return this.servicio.aprobar(id, dto, actor, auditoria);
  }

  @Post(':id/rechazar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('oc.aprobar')
  @Auditar({ accion: 'orden_compra.rechazar', entidad: 'orden_compra' })
  @ApiOperation({
    summary: 'Rechaza un documento en revisión (con motivo)',
    description:
      'El rechazo es final: para corregirlo se crea un documento nuevo.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenCompraDetalleDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  rechazarOrdenCompra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    return this.servicio.rechazar(id, dto, actor, auditoria);
  }

  @Post(':id/recibir')
  @HttpCode(HttpStatus.OK)
  @Auditar({ accion: 'orden_compra.recibir', entidad: 'orden_compra' })
  @ApiOperation({
    summary: 'Registra la recepción conforme de una OC aprobada',
    description:
      'aprobada → recibida (supuesto: recepción total, una sola vez). El compromiso se mantiene hasta la factura.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenCompraDetalleDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  recibirOrdenCompra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecibirOrdenCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    return this.servicio.recibir(id, dto, actor, auditoria);
  }

  @Post(':id/anular')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('oc.anular')
  @Auditar({ accion: 'orden_compra.anular', entidad: 'orden_compra' })
  @ApiOperation({
    summary: 'Anula un documento aprobado (con motivo)',
    description:
      'aprobada → anulada (supuesto H5: una OC aprobada no se edita). Registra la reversa del compromiso y libera el saldo de la OT.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenCompraDetalleDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  anularOrdenCompra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    return this.servicio.anular(id, dto, actor, auditoria);
  }
}
