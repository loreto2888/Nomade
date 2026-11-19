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
  StreamableFile,
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
import { disposicionAdjunto } from '../adjuntos/adjuntos.controller.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import { TIPO_MIME_XLSX } from './exportacion-excel.js';
import {
  ActualizarPartidaDto,
  ActualizarPresupuestoDto,
  AprobarPresupuestoDto,
  CompararPresupuestoDto,
  ComparacionPresupuestoDto,
  CrearPartidaDto,
  CrearPresupuestoDto,
  EliminarPartidaDto,
  EliminarPresupuestoDto,
  EnviarPresupuestoDto,
  PartidaDto,
  PresupuestoDetalleDto,
  PresupuestoVersionDto,
  RechazarPresupuestoDto,
} from './presupuestos.dto.js';
import { PresupuestosService } from './presupuestos.service.js';

const PARAM_OBRA = {
  name: 'obraId',
  description: 'Identificador de la obra.',
  example: 1,
};
const PARAM_ID = {
  name: 'id',
  description: 'Identificador de la versión de presupuesto.',
  example: 12,
};
const PARAM_PARTIDA = {
  name: 'partidaId',
  description: 'Identificador de la partida.',
  example: 31,
};

@ApiTags('presupuestos')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller()
export class PresupuestosController {
  constructor(private readonly presupuestos: PresupuestosService) {}

  @Get('obras/:obraId/presupuestos')
  @ApiOperation({
    summary: 'Lista las versiones de presupuesto de una obra',
    description:
      'De la más reciente a la más antigua, con su estado, totales y quién la creó, envió y aprobó o rechazó.',
  })
  @ApiParam(PARAM_OBRA)
  @ApiOkResponse({ type: [PresupuestoVersionDto] })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  listarPresupuestos(
    @Param('obraId', ParseIntPipe) obraId: number,
  ): Promise<PresupuestoVersionDto[]> {
    return this.presupuestos.listarVersiones(obraId);
  }

  @Post('obras/:obraId/presupuestos')
  @Auditar({ accion: 'presupuesto.crear', entidad: 'presupuesto_version' })
  @ApiOperation({
    summary: 'Crea una versión de presupuesto en borrador',
    description:
      'Vacía o copiada de otra versión de la misma obra (`copiarDeId`). Un cambio sobre un presupuesto aprobado requiere una versión nueva copiada de la vigente. En obras en UF la versión se valoriza al valor de la UF de hoy.',
  })
  @ApiParam(PARAM_OBRA)
  @ApiCreatedResponse({ type: PresupuestoVersionDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'Obra cerrada, versión de origen inválida o UF no disponible (`UF_NO_DISPONIBLE`).',
  })
  crearPresupuesto(
    @Param('obraId', ParseIntPipe) obraId: number,
    @Body() dto: CrearPresupuestoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<PresupuestoVersionDto> {
    return this.presupuestos.crear(obraId, dto, actor, auditoria);
  }

  @Get('presupuestos/:id')
  @ApiOperation({
    summary: 'Obtiene una versión con sus partidas y totales por familia',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: PresupuestoDetalleDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerPresupuesto(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PresupuestoDetalleDto> {
    return this.presupuestos.obtener(id);
  }

  @Get('presupuestos/:id/comparacion')
  @ApiOperation({
    summary: 'Compara una versión con la vigente (o con otra versión)',
    description:
      'Cruza las partidas por código: nuevas, eliminadas, modificadas y sin cambios, con la diferencia en CLP.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ComparacionPresupuestoDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'No hay versión vigente (`SIN_VERSION_BASE`) o se comparan versiones de obras distintas o la misma.',
  })
  compararPresupuesto(
    @Param('id', ParseIntPipe) id: number,
    @Query() consulta: CompararPresupuestoDto,
  ): Promise<ComparacionPresupuestoDto> {
    return this.presupuestos.comparar(id, consulta.baseId);
  }

  @Get('presupuestos/:id/exportar')
  @ApiOperation({
    summary: 'Exporta una versión a Excel',
    description:
      'Hoja «Partidas» (mismas columnas de la plantilla de importación, más totales) y hoja «Resumen».',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({
    description: 'Archivo .xlsx.',
    content: {
      [TIPO_MIME_XLSX]: { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async exportarPresupuesto(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StreamableFile> {
    const archivo = await this.presupuestos.exportar(id);
    return new StreamableFile(archivo.contenido, {
      type: TIPO_MIME_XLSX,
      length: archivo.contenido.length,
      disposition: disposicionAdjunto(archivo.nombre),
    });
  }

  @Patch('presupuestos/:id')
  @Auditar({ accion: 'presupuesto.actualizar', entidad: 'presupuesto_version' })
  @ApiOperation({
    summary: 'Modifica los datos de un borrador (descripción)',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: PresupuestoVersionDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'La versión no es un borrador (`VERSION_NO_EDITABLE`).',
  })
  actualizarPresupuesto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPresupuestoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<PresupuestoVersionDto> {
    return this.presupuestos.actualizar(id, dto, actor, auditoria);
  }

  @Post('presupuestos/:id/eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auditar({ accion: 'presupuesto.eliminar', entidad: 'presupuesto_version' })
  @ApiOperation({
    summary: 'Elimina un borrador (borrado lógico)',
    description:
      'Solo borradores: una versión en revisión, aprobada o rechazada queda en el historial.',
  })
  @ApiParam(PARAM_ID)
  @ApiNoContentResponse({ description: 'Borrador eliminado.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  async eliminarPresupuesto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EliminarPresupuestoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<void> {
    await this.presupuestos.eliminar(id, dto, actor, auditoria);
  }

  @Post('presupuestos/:id/enviar-revision')
  @HttpCode(HttpStatus.OK)
  @Auditar({
    accion: 'presupuesto.enviar_revision',
    entidad: 'presupuesto_version',
  })
  @ApiOperation({
    summary: 'Envía un borrador a revisión',
    description:
      'borrador → en revisión. La versión queda congelada y debe tener al menos una partida.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: PresupuestoVersionDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'Transición no válida (`TRANSICION_NO_VALIDA`) o sin partidas (`PRESUPUESTO_VACIO`).',
  })
  enviarPresupuestoARevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarPresupuestoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<PresupuestoVersionDto> {
    return this.presupuestos.enviarARevision(id, dto, actor, auditoria);
  }

  @Post('presupuestos/:id/aprobar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('presupuesto.aprobar')
  @Auditar({ accion: 'presupuesto.aprobar', entidad: 'presupuesto_version' })
  @ApiOperation({
    summary: 'Aprueba una versión en revisión',
    description:
      'Deja esta versión como la única vigente de la obra (la vigente anterior queda en el historial). El `usuario` no puede aprobar una versión que él mismo creó; el `admin` sí (D-10).',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: PresupuestoVersionDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Autoaprobación (`AUTOAPROBACION_NO_PERMITIDA`).',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'La versión no está en revisión (`TRANSICION_NO_VALIDA`).',
  })
  aprobarPresupuesto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarPresupuestoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<PresupuestoVersionDto> {
    return this.presupuestos.aprobar(id, dto, actor, auditoria);
  }

  @Post('presupuestos/:id/rechazar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('presupuesto.aprobar')
  @Auditar({ accion: 'presupuesto.rechazar', entidad: 'presupuesto_version' })
  @ApiOperation({
    summary: 'Rechaza una versión en revisión (con motivo)',
    description:
      'La versión rechazada es final: para corregirla se crea una versión nueva copiada de ella.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: PresupuestoVersionDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  rechazarPresupuesto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarPresupuestoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<PresupuestoVersionDto> {
    return this.presupuestos.rechazar(id, dto, actor, auditoria);
  }

  @Post('presupuestos/:id/partidas')
  @Auditar({ accion: 'partida.crear', entidad: 'partida' })
  @ApiOperation({
    summary: 'Agrega una partida a un borrador',
    description:
      'Los totales (de la partida y de la versión) los calcula el servidor.',
  })
  @ApiParam(PARAM_ID)
  @ApiCreatedResponse({ type: PartidaDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El código ya existe en la versión (`PARTIDA_DUPLICADA`).',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'La versión no es un borrador o la familia no está disponible.',
  })
  crearPartida(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearPartidaDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<PartidaDto> {
    return this.presupuestos.crearPartida(id, dto, actor, auditoria);
  }

  @Patch('presupuestos/:id/partidas/:partidaId')
  @Auditar({ accion: 'partida.actualizar', entidad: 'partida' })
  @ApiOperation({
    summary: 'Modifica una partida de un borrador (con control de versión)',
  })
  @ApiParam(PARAM_ID)
  @ApiParam(PARAM_PARTIDA)
  @ApiOkResponse({ type: PartidaDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ConflictResponseDto,
    description: 'Versión desactualizada o código duplicado.',
  })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  actualizarPartida(
    @Param('id', ParseIntPipe) id: number,
    @Param('partidaId', ParseIntPipe) partidaId: number,
    @Body() dto: ActualizarPartidaDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<PartidaDto> {
    return this.presupuestos.actualizarPartida(
      id,
      partidaId,
      dto,
      actor,
      auditoria,
    );
  }

  @Post('presupuestos/:id/partidas/:partidaId/eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auditar({ accion: 'partida.eliminar', entidad: 'partida' })
  @ApiOperation({ summary: 'Elimina una partida de un borrador' })
  @ApiParam(PARAM_ID)
  @ApiParam(PARAM_PARTIDA)
  @ApiNoContentResponse({ description: 'Partida eliminada.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  async eliminarPartida(
    @Param('id', ParseIntPipe) id: number,
    @Param('partidaId', ParseIntPipe) partidaId: number,
    @Body() dto: EliminarPartidaDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<void> {
    await this.presupuestos.eliminarPartida(
      id,
      partidaId,
      dto,
      actor,
      auditoria,
    );
  }
}
