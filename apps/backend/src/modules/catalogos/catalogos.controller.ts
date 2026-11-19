import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseEnumPipe,
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
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { ErrorResponseDto } from '../../common/errores/error-response.dto.js';
import { RequierePermiso } from '../../common/permisos/decoradores.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import {
  ActualizarCatalogoItemDto,
  CatalogoItemDto,
  CrearCatalogoItemDto,
  ListarCatalogoDto,
} from './catalogos.dto.js';
import { CatalogosService } from './catalogos.service.js';
import { TipoCatalogo } from './catalogos.tipos.js';

const pipeTipo = new ParseEnumPipe(TipoCatalogo, {
  exceptionFactory: () =>
    new ErrorAplicacion(
      HttpStatus.NOT_FOUND,
      'CATALOGO_NO_ENCONTRADO',
      `El catálogo no existe. Catálogos disponibles: ${Object.values(TipoCatalogo).join(', ')}.`,
    ),
});

const PARAM_TIPO = {
  name: 'tipo',
  enum: TipoCatalogo,
  enumName: 'TipoCatalogo',
  description: 'Catálogo.',
};

@ApiTags('catalogos')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller('catalogos/:tipo')
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista los ítems de un catálogo',
    description:
      'Los ítems activos se ofrecen en los formularios; con `incluirInactivos` se listan todos (administración).',
  })
  @ApiParam(PARAM_TIPO)
  @ApiOkResponse({ type: [CatalogoItemDto] })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  listarCatalogo(
    @Param('tipo', pipeTipo) tipo: TipoCatalogo,
    @Query() filtro: ListarCatalogoDto,
  ): Promise<CatalogoItemDto[]> {
    return this.catalogos.listar(tipo, filtro.incluirInactivos ?? false);
  }

  @Post()
  @RequierePermiso('catalogos.administrar')
  @Auditar({ accion: 'catalogo.crear', entidad: 'catalogo' })
  @ApiOperation({
    summary: 'Agrega un ítem a un catálogo (solo administradores)',
  })
  @ApiParam(PARAM_TIPO)
  @ApiCreatedResponse({ type: CatalogoItemDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Solo administradores.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Código o nombre duplicado en el catálogo.',
  })
  crearItemCatalogo(
    @Param('tipo', pipeTipo) tipo: TipoCatalogo,
    @Body() dto: CrearCatalogoItemDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<CatalogoItemDto> {
    return this.catalogos.crear(tipo, dto, actor, auditoria);
  }

  @Patch(':id')
  @RequierePermiso('catalogos.administrar')
  @Auditar({ accion: 'catalogo.actualizar', entidad: 'catalogo' })
  @ApiOperation({
    summary: 'Modifica un ítem de catálogo (con control de versión)',
    description:
      'El código no se puede editar. Los ítems no se eliminan: se desactivan.',
  })
  @ApiParam(PARAM_TIPO)
  @ApiParam({ name: 'id', description: 'Identificador del ítem.', example: 3 })
  @ApiOkResponse({ type: CatalogoItemDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Solo administradores.',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'Ítem protegido: no se puede desactivar (`CATALOGO_ITEM_PROTEGIDO`).',
  })
  actualizarItemCatalogo(
    @Param('tipo', pipeTipo) tipo: TipoCatalogo,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCatalogoItemDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<CatalogoItemDto> {
    return this.catalogos.actualizar(tipo, id, dto, actor, auditoria);
  }
}
