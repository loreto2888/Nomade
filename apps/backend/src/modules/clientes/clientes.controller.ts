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
  ActualizarClienteDto,
  ClienteDto,
  CrearClienteDto,
  EliminarClienteDto,
  ListarClientesDto,
  PaginaClientesDto,
} from './clientes.dto.js';
import { ClientesService } from './clientes.service.js';

const PARAM_ID = {
  name: 'id',
  description: 'Identificador del cliente.',
  example: 5,
};

@ApiTags('clientes')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista clientes (paginado, con búsqueda y orden)' })
  @ApiOkResponse({ type: PaginaClientesDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listarClientes(
    @Query() filtro: ListarClientesDto,
  ): Promise<PaginaClientesDto> {
    return this.clientes.listar(filtro);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un cliente' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ClienteDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerCliente(@Param('id', ParseIntPipe) id: number): Promise<ClienteDto> {
    return this.clientes.obtener(id);
  }

  @Post()
  @Auditar({ accion: 'cliente.crear', entidad: 'cliente' })
  @ApiOperation({ summary: 'Crea un cliente' })
  @ApiCreatedResponse({ type: ClienteDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Datos inválidos (RUT, correo…).',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El RUT ya existe (`RUT_DUPLICADO`).',
  })
  crearCliente(
    @Body() dto: CrearClienteDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ClienteDto> {
    return this.clientes.crear(dto, actor, auditoria);
  }

  @Patch(':id')
  @Auditar({ accion: 'cliente.actualizar', entidad: 'cliente' })
  @ApiOperation({ summary: 'Modifica un cliente (con control de versión)' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ClienteDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ConflictResponseDto,
    description:
      'Versión desactualizada (`CONFLICTO_VERSION`) o RUT duplicado (`RUT_DUPLICADO`).',
  })
  actualizarCliente(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarClienteDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ClienteDto> {
    return this.clientes.actualizar(id, dto, actor, auditoria);
  }

  @Post(':id/eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auditar({ accion: 'cliente.eliminar', entidad: 'cliente' })
  @ApiOperation({
    summary: 'Elimina un cliente (borrado lógico)',
    description: 'No se puede eliminar un cliente con obras vigentes.',
  })
  @ApiParam(PARAM_ID)
  @ApiNoContentResponse({ description: 'Cliente eliminado.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'El cliente tiene obras vigentes (`CLIENTE_CON_OBRAS`).',
  })
  async eliminarCliente(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EliminarClienteDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<void> {
    await this.clientes.eliminar(id, dto, actor, auditoria);
  }
}
