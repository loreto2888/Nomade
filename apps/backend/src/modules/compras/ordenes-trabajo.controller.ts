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
  ActualizarOrdenTrabajoDto,
  CrearOrdenTrabajoDto,
  ListarOrdenesTrabajoDto,
  OrdenTrabajoDto,
  PaginaOrdenesTrabajoDto,
} from './ordenes-trabajo.dto.js';
import { OrdenesTrabajoService } from './ordenes-trabajo.service.js';

const PARAM_ID = {
  name: 'id',
  description: 'Identificador de la orden de trabajo.',
  example: 12,
};

@ApiTags('ordenes-trabajo')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller('ordenes-trabajo')
export class OrdenesTrabajoController {
  constructor(private readonly servicio: OrdenesTrabajoService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista órdenes de trabajo (paginado, del folio más reciente al más antiguo)',
    description: 'Todos los usuarios ven todos los documentos (D-03).',
  })
  @ApiOkResponse({ type: PaginaOrdenesTrabajoDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listarOrdenesTrabajo(
    @Query() filtro: ListarOrdenesTrabajoDto,
  ): Promise<PaginaOrdenesTrabajoDto> {
    return this.servicio.listar(filtro);
  }

  @Post()
  @Auditar({ accion: 'orden_trabajo.crear', entidad: 'orden_trabajo' })
  @ApiOperation({
    summary: 'Crea una OT en borrador desde una cotización aprobada',
    description:
      'Toma el proveedor, la obra, la categoría y el monto de la cotización (que no debe tener otra OT vigente). Los hitos pueden sumar menos de 100 % mientras es borrador.',
  })
  @ApiCreatedResponse({ type: OrdenTrabajoDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  crearOrdenTrabajo(
    @Body() dto: CrearOrdenTrabajoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    return this.servicio.crear(dto, actor, auditoria);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene la orden de trabajo' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenTrabajoDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerOrdenTrabajo(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrdenTrabajoDto> {
    return this.servicio.obtener(id);
  }

  @Patch(':id')
  @Auditar({ accion: 'orden_trabajo.actualizar', entidad: 'orden_trabajo' })
  @ApiOperation({
    summary: 'Modifica un borrador (con control de versión)',
    description:
      'Alcance, fechas e hitos (reemplazan a los actuales). Supuesto H5: los hitos no cambian después de aprobar la OT.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenTrabajoDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'No es un borrador (`DOCUMENTO_NO_EDITABLE`) u otra regla de negocio.',
  })
  actualizarOrdenTrabajo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarOrdenTrabajoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    return this.servicio.actualizar(id, dto, actor, auditoria);
  }

  @Post(':id/eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auditar({ accion: 'orden_trabajo.eliminar', entidad: 'orden_trabajo' })
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
  async eliminarOrdenTrabajo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EliminarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<void> {
    await this.servicio.eliminar(id, dto, actor, auditoria);
  }

  @Post(':id/enviar-revision')
  @HttpCode(HttpStatus.OK)
  @Auditar({
    accion: 'orden_trabajo.enviar_revision',
    entidad: 'orden_trabajo',
  })
  @ApiOperation({
    summary: 'Envía un borrador a revisión',
    description:
      'borrador → en revisión. Los hitos deben sumar exactamente 100 %.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenTrabajoDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  enviarOrdenTrabajoARevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    return this.servicio.enviarARevision(id, dto, actor, auditoria);
  }

  @Post(':id/aprobar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('ot.aprobar')
  @Auditar({ accion: 'orden_trabajo.aprobar', entidad: 'orden_trabajo' })
  @ApiOperation({
    summary: 'Aprueba un documento en revisión',
    description:
      'Una OT aprobada admite OC parciales hasta su saldo. El `usuario` no puede aprobar lo que él mismo creó; el `admin` sí (D-10).',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenTrabajoDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Autoaprobación (`AUTOAPROBACION_NO_PERMITIDA`).',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  aprobarOrdenTrabajo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    return this.servicio.aprobar(id, dto, actor, auditoria);
  }

  @Post(':id/rechazar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('ot.aprobar')
  @Auditar({ accion: 'orden_trabajo.rechazar', entidad: 'orden_trabajo' })
  @ApiOperation({
    summary: 'Rechaza un documento en revisión (con motivo)',
    description:
      'El rechazo es final: para corregirlo se crea un documento nuevo.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenTrabajoDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  rechazarOrdenTrabajo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    return this.servicio.rechazar(id, dto, actor, auditoria);
  }

  @Post(':id/anular')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('ot.anular')
  @Auditar({ accion: 'orden_trabajo.anular', entidad: 'orden_trabajo' })
  @ApiOperation({
    summary: 'Anula un documento aprobado (con motivo)',
    description:
      'aprobada → anulada (supuesto H5). Solo sin OC parciales vigentes; libera la cotización para otra OT.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: OrdenTrabajoDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  anularOrdenTrabajo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    return this.servicio.anular(id, dto, actor, auditoria);
  }
}
