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
import { Auditar } from '../auditoria/auditar.decorator.js';
import {
  ActualizarObraDto,
  CrearObraDto,
  EliminarObraDto,
  ListarObrasDto,
  ObraDto,
  PaginaObrasDto,
  ResumenObraDto,
} from './obras.dto.js';
import { ObrasService } from './obras.service.js';

const PARAM_ID = {
  name: 'id',
  description: 'Identificador de la obra.',
  example: 1,
};

@ApiTags('obras')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller('obras')
export class ObrasController {
  constructor(private readonly obras: ObrasService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista obras (paginado, con búsqueda, filtros y orden)',
    description: 'Todos los usuarios ven todas las obras (D-03).',
  })
  @ApiOkResponse({ type: PaginaObrasDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listarObras(@Query() filtro: ListarObrasDto): Promise<PaginaObrasDto> {
    return this.obras.listar(filtro);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una obra (datos para editarla)' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ObraDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerObra(@Param('id', ParseIntPipe) id: number): Promise<ObraDto> {
    return this.obras.obtener(id);
  }

  @Get(':id/resumen')
  @ApiOperation({
    summary: 'Ficha de la obra: resumen',
    description:
      'Datos de la obra, adjuntos y, en contratos en UF, el equivalente en CLP al valor de la UF de hoy.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ResumenObraDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerResumenObra(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResumenObraDto> {
    return this.obras.resumen(id);
  }

  @Post()
  @Auditar({ accion: 'obra.crear', entidad: 'obra' })
  @ApiOperation({ summary: 'Crea una obra / centro de costo' })
  @ApiCreatedResponse({ type: ObraDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El centro de costo ya existe (`CENTRO_COSTO_DUPLICADO`).',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'Cliente o estado inválido, o contrato en UF sin valor de UF cargado (`UF_NO_DISPONIBLE`).',
  })
  crearObra(
    @Body() dto: CrearObraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ObraDto> {
    return this.obras.crear(dto, actor, auditoria);
  }

  @Patch(':id')
  @Auditar({ accion: 'obra.actualizar', entidad: 'obra' })
  @ApiOperation({ summary: 'Modifica una obra (con control de versión)' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ObraDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ConflictResponseDto,
    description:
      'Versión desactualizada (`CONFLICTO_VERSION`) o centro de costo duplicado.',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'Obra cerrada, estado/cliente inválido o UF no disponible.',
  })
  actualizarObra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarObraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ObraDto> {
    return this.obras.actualizar(id, dto, actor, auditoria);
  }

  @Post(':id/eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auditar({ accion: 'obra.eliminar', entidad: 'obra' })
  @ApiOperation({
    summary: 'Elimina una obra (borrado lógico)',
    description: 'Solo obras "en preparación".',
  })
  @ApiParam(PARAM_ID)
  @ApiNoContentResponse({ description: 'Obra eliminada.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'La obra no está en preparación (`OBRA_NO_ELIMINABLE`).',
  })
  async eliminarObra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EliminarObraDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<void> {
    await this.obras.eliminar(id, dto, actor, auditoria);
  }
}
