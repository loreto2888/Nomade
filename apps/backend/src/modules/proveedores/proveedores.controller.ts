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
  ActualizarProveedorDto,
  CrearProveedorDto,
  EliminarProveedorDto,
  ListarProveedoresDto,
  PaginaProveedoresDto,
  ProveedorDto,
} from './proveedores.dto.js';
import { ProveedoresService } from './proveedores.service.js';

const PARAM_ID = {
  name: 'id',
  description: 'Identificador del proveedor.',
  example: 12,
};

@ApiTags('proveedores')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedores: ProveedoresService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista proveedores (paginado, con búsqueda y orden)',
  })
  @ApiOkResponse({ type: PaginaProveedoresDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listarProveedores(
    @Query() filtro: ListarProveedoresDto,
  ): Promise<PaginaProveedoresDto> {
    return this.proveedores.listar(filtro);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtiene un proveedor',
    description:
      'No incluye datos bancarios: se consultan aparte y solo el administrador puede hacerlo.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ProveedorDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerProveedor(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProveedorDto> {
    return this.proveedores.obtener(id);
  }

  @Post()
  @Auditar({ accion: 'proveedor.crear', entidad: 'proveedor' })
  @ApiOperation({ summary: 'Crea un proveedor' })
  @ApiCreatedResponse({ type: ProveedorDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Datos inválidos (RUT, correo…).',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El RUT ya existe (`RUT_DUPLICADO`).',
  })
  crearProveedor(
    @Body() dto: CrearProveedorDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ProveedorDto> {
    return this.proveedores.crear(dto, actor, auditoria);
  }

  @Patch(':id')
  @Auditar({ accion: 'proveedor.actualizar', entidad: 'proveedor' })
  @ApiOperation({ summary: 'Modifica un proveedor (con control de versión)' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ProveedorDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ConflictResponseDto,
    description:
      'Versión desactualizada (`CONFLICTO_VERSION`) o RUT duplicado (`RUT_DUPLICADO`).',
  })
  actualizarProveedor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarProveedorDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ProveedorDto> {
    return this.proveedores.actualizar(id, dto, actor, auditoria);
  }

  @Post(':id/eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auditar({ accion: 'proveedor.eliminar', entidad: 'proveedor' })
  @ApiOperation({ summary: 'Elimina un proveedor (borrado lógico)' })
  @ApiParam(PARAM_ID)
  @ApiNoContentResponse({ description: 'Proveedor eliminado.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  async eliminarProveedor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EliminarProveedorDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<void> {
    await this.proveedores.eliminar(id, dto, actor, auditoria);
  }
}
