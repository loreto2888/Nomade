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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  ContextoAuditoriaActual,
  UsuarioActual,
  type ActorAutenticado,
  type ContextoAuditoria,
} from '../../common/auth/actor.js';
import { COOKIE_SESION } from '../../app.constantes.js';
import { ConflictResponseDto } from '../../common/errores/conflicto-version.js';
import { ErrorResponseDto } from '../../common/errores/error-response.dto.js';
import { RequierePermiso, Roles } from '../../common/permisos/decoradores.js';
import { Rol } from '../../common/permisos/rol.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import {
  AccionUsuarioDto,
  ActualizarUsuarioDto,
  CrearUsuarioDto,
  ListarUsuariosDto,
  PaginaUsuariosDto,
  UsuarioClaveTemporalDto,
  UsuarioDto,
} from './usuarios.dto.js';
import { UsuariosService } from './usuarios.service.js';

const PARAM_ID = {
  name: 'id',
  description: 'Identificador del usuario.',
  example: 12,
};

@ApiTags('usuarios')
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
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  @RequierePermiso('usuarios.consultar')
  @ApiOperation({ summary: 'Lista usuarios (paginado y filtrable)' })
  @ApiOkResponse({ type: PaginaUsuariosDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listarUsuarios(
    @Query() filtro: ListarUsuariosDto,
  ): Promise<PaginaUsuariosDto> {
    return this.usuarios.listar(filtro);
  }

  @Get(':id')
  @RequierePermiso('usuarios.consultar')
  @ApiOperation({ summary: 'Obtiene un usuario' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: UsuarioDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerUsuario(@Param('id', ParseIntPipe) id: number): Promise<UsuarioDto> {
    return this.usuarios.obtener(id);
  }

  @Post()
  @RequierePermiso('usuarios.crear')
  @Auditar({
    accion: 'usuario.crear',
    entidad: 'usuario',
    incluirRespuesta: false,
  })
  @ApiOperation({
    summary: 'Crea un usuario con contraseña temporal',
    description:
      'La contraseña temporal se genera en el servidor y se devuelve una sola vez; el usuario deberá cambiarla al ingresar.',
  })
  @ApiCreatedResponse({ type: UsuarioClaveTemporalDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El correo ya existe.',
  })
  crearUsuario(
    @Body() dto: CrearUsuarioDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<UsuarioClaveTemporalDto> {
    return this.usuarios.crear(dto, actor, auditoria);
  }

  @Patch(':id')
  @RequierePermiso('usuarios.actualizar')
  @Auditar({
    accion: 'usuario.actualizar',
    entidad: 'usuario',
    incluirRespuesta: false,
  })
  @ApiOperation({
    summary: 'Modifica nombre, correo o rol (con control de versión)',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: UsuarioDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ConflictResponseDto,
    description:
      'Versión desactualizada (`CONFLICTO_VERSION`) o correo duplicado (`CORREO_DUPLICADO`).',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'Viola una regla: un admin no puede quitarse el rol; debe quedar un admin activo.',
  })
  actualizarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<UsuarioDto> {
    return this.usuarios.actualizar(id, dto, actor, auditoria);
  }

  @Post(':id/desactivar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('usuarios.activar')
  @Auditar({
    accion: 'usuario.desactivar',
    entidad: 'usuario',
    incluirRespuesta: false,
  })
  @ApiOperation({
    summary: 'Desactiva un usuario',
    description: 'Los usuarios nunca se eliminan. Se revocan sus sesiones.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: UsuarioDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'Un admin no puede desactivarse; debe quedar al menos un admin activo.',
  })
  desactivarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AccionUsuarioDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<UsuarioDto> {
    return this.usuarios.desactivar(id, dto, actor, auditoria);
  }

  @Post(':id/activar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('usuarios.activar')
  @Auditar({
    accion: 'usuario.activar',
    entidad: 'usuario',
    incluirRespuesta: false,
  })
  @ApiOperation({ summary: 'Reactiva un usuario desactivado' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: UsuarioDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  activarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AccionUsuarioDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<UsuarioDto> {
    return this.usuarios.activar(id, dto, actor, auditoria);
  }

  @Post(':id/restablecer-clave')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso('usuarios.restablecer_clave')
  @Auditar({
    accion: 'usuario.restablecer_clave',
    entidad: 'usuario',
    incluirRespuesta: false,
  })
  @ApiOperation({
    summary: 'Restablece la contraseña con una temporal',
    description:
      'Genera una contraseña temporal (se devuelve una sola vez), obliga a cambiarla y cierra las sesiones del usuario.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: UsuarioClaveTemporalDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  restablecerClaveUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AccionUsuarioDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<UsuarioClaveTemporalDto> {
    return this.usuarios.restablecerClave(id, dto, actor, auditoria);
  }
}
