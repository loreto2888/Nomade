import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
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
import {
  AgregarValorParametroDto,
  EliminarValorParametroDto,
  ParametroDto,
  ValorParametroDto,
} from './parametros.dto.js';
import { ParametrosService } from './parametros.service.js';

const PARAM_ID = {
  name: 'id',
  description: 'Identificador del parámetro.',
  example: 1,
};

/** P27 — Parámetros del sistema: solo administradores (D-03). */
@ApiTags('parametros')
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
@RequierePermiso('parametros.administrar')
@Controller('parametros')
export class ParametrosController {
  constructor(private readonly parametros: ParametrosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los parámetros con su valor vigente' })
  @ApiOkResponse({ type: [ParametroDto] })
  listarParametros(): Promise<ParametroDto[]> {
    return this.parametros.listar();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtiene un parámetro con su valor vigente y el próximo',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ParametroDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerParametro(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ParametroDto> {
    return this.parametros.obtener(id);
  }

  @Get(':id/valores')
  @ApiOperation({
    summary: 'Historial de valores de un parámetro (el más reciente primero)',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: [ValorParametroDto] })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  listarValoresParametro(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ValorParametroDto[]> {
    return this.parametros.historial(id);
  }

  @Post(':id/valores')
  @HttpCode(HttpStatus.OK)
  @Auditar({
    accion: 'parametro.valor.agregar',
    entidad: 'parametro',
    incluirRespuesta: false,
  })
  @ApiOperation({
    summary: 'Agrega una versión del valor con su fecha de vigencia',
    description:
      'La vigencia empieza hoy o después y debe ser posterior a la última versión. Las versiones existentes no se modifican.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ParametroDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'Vigencia en el pasado o no posterior a la última versión.',
  })
  agregarValorParametro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AgregarValorParametroDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ParametroDto> {
    return this.parametros.agregarValor(id, dto, actor, auditoria);
  }

  @Post(':id/valores/:valorId/eliminar')
  @HttpCode(HttpStatus.OK)
  @Auditar({
    accion: 'parametro.valor.eliminar',
    entidad: 'parametro',
    incluirRespuesta: false,
  })
  @ApiOperation({
    summary: 'Elimina una versión programada que aún no está vigente',
  })
  @ApiParam(PARAM_ID)
  @ApiParam({
    name: 'valorId',
    description: 'Identificador de la versión del valor.',
    example: 7,
  })
  @ApiOkResponse({ type: ParametroDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'La versión ya está vigente (`VALOR_YA_VIGENTE`).',
  })
  eliminarValorParametro(
    @Param('id', ParseIntPipe) id: number,
    @Param('valorId', ParseIntPipe) valorId: number,
    @Body() dto: EliminarValorParametroDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ParametroDto> {
    return this.parametros.eliminarValor(id, valorId, dto, actor, auditoria);
  }
}
