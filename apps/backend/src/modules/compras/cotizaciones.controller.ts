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
  AprobarDocumentoCompraDto,
  EliminarDocumentoCompraDto,
  EnviarDocumentoCompraDto,
  RechazarDocumentoCompraDto,
} from './compras.dto.js';
import {
  ActualizarCotizacionDto,
  CotizacionDto,
  CrearCotizacionDto,
  ListarCotizacionesDto,
  PaginaCotizacionesDto,
} from './cotizaciones.dto.js';
import { CotizacionesService } from './cotizaciones.service.js';

const PARAM_ID = {
  name: 'id',
  description: 'Identificador de la cotización.',
  example: 12,
};

@ApiTags('cotizaciones')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller('cotizaciones')
export class CotizacionesController {
  constructor(private readonly servicio: CotizacionesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista cotizaciones (paginado, del folio más reciente al más antiguo)',
    description: 'Todos los usuarios ven todos los documentos (D-03).',
  })
  @ApiOkResponse({ type: PaginaCotizacionesDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listarCotizaciones(
    @Query() filtro: ListarCotizacionesDto,
  ): Promise<PaginaCotizacionesDto> {
    return this.servicio.listar(filtro);
  }

  @Post()
  @Auditar({ accion: 'cotizacion.crear', entidad: 'cotizacion' })
  @ApiOperation({
    summary: 'Registra una cotización en borrador',
    description:
      'Cotización de un proveedor para una obra (monto neto en CLP). Recibe su folio COT- correlativo.',
  })
  @ApiCreatedResponse({ type: CotizacionDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  crearCotizacion(
    @Body() dto: CrearCotizacionDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    return this.servicio.crear(dto, actor, auditoria);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene la cotización' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: CotizacionDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerCotizacion(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CotizacionDto> {
    return this.servicio.obtener(id);
  }

  @Patch(':id')
  @Auditar({ accion: 'cotizacion.actualizar', entidad: 'cotizacion' })
  @ApiOperation({
    summary: 'Modifica un borrador (con control de versión)',
    description: 'Datos de la cotización mientras es un borrador.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: CotizacionDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'No es un borrador (`DOCUMENTO_NO_EDITABLE`) u otra regla de negocio.',
  })
  actualizarCotizacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCotizacionDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    return this.servicio.actualizar(id, dto, actor, auditoria);
  }

  @Post(':id/eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auditar({ accion: 'cotizacion.eliminar', entidad: 'cotizacion' })
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
  async eliminarCotizacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EliminarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<void> {
    await this.servicio.eliminar(id, dto, actor, auditoria);
  }

  @Post(':id/enviar-revision')
  @HttpCode(HttpStatus.OK)
  @Auditar({ accion: 'cotizacion.enviar_revision', entidad: 'cotizacion' })
  @ApiOperation({
    summary: 'Envía un borrador a revisión',
    description:
      'borrador → en revisión. Desde ahí la cotización queda congelada.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: CotizacionDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  enviarCotizacionARevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    return this.servicio.enviarARevision(id, dto, actor, auditoria);
  }

  @Post(':id/aprobar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('cotizacion.aprobar')
  @Auditar({ accion: 'cotizacion.aprobar', entidad: 'cotizacion' })
  @ApiOperation({
    summary: 'Aprueba un documento en revisión',
    description:
      'Una cotización aprobada habilita crear una OT. El `usuario` no puede aprobar lo que él mismo creó; el `admin` sí (D-10).',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: CotizacionDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Autoaprobación (`AUTOAPROBACION_NO_PERMITIDA`).',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  aprobarCotizacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    return this.servicio.aprobar(id, dto, actor, auditoria);
  }

  @Post(':id/rechazar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('cotizacion.aprobar')
  @Auditar({ accion: 'cotizacion.rechazar', entidad: 'cotizacion' })
  @ApiOperation({
    summary: 'Rechaza un documento en revisión (con motivo)',
    description:
      'El rechazo es final: para corregirlo se crea un documento nuevo.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: CotizacionDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  rechazarCotizacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarDocumentoCompraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    return this.servicio.rechazar(id, dto, actor, auditoria);
  }
}
