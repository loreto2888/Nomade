import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { COOKIE_SESION } from '../../app.constantes.js';
import {
  ContextoAuditoriaActual,
  UsuarioActual,
  type ActorAutenticado,
  type ContextoAuditoria,
  type RequestConActor,
} from '../../common/auth/actor.js';
import { ErrorResponseDto } from '../../common/errores/error-response.dto.js';
import {
  PermitirConCambioClave,
  Publico,
} from '../../common/permisos/decoradores.js';
import {
  ipCliente,
  opcionesCookieSesion,
  opcionesLimpiarCookie,
} from '../../common/seguridad/cookie-sesion.js';
import type { Entorno } from '../../config/entorno.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import {
  ActualizarTemaDto,
  CambiarClaveDto,
  IniciarSesionDto,
  SesionActualDto,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { LimiteLoginGuard } from './limite-login.guard.js';

/** Límite por IP: 10 solicitudes por minuto en los endpoints sensibles. */
const LIMITE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieSegura: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<Entorno, true>,
  ) {
    this.cookieSegura = config.get('COOKIE_SECURE', { infer: true });
  }

  @Post('login')
  @Publico()
  @UseGuards(LimiteLoginGuard)
  @Throttle(LIMITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inicia sesión con correo y contraseña',
    description:
      'Crea una sesión opaca y la entrega en la cookie `httpOnly` `nomade_session` (8 h máximo, 30 min de inactividad). Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.',
  })
  @ApiOkResponse({ type: SesionActualDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Correo o contraseña incorrectos.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Cuenta desactivada u origen no permitido.',
  })
  @ApiResponse({
    status: HttpStatus.LOCKED,
    type: ErrorResponseDto,
    description: 'Cuenta bloqueada temporalmente.',
  })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  async iniciarSesion(
    @Body() dto: IniciarSesionDto,
    @Req() req: RequestConActor,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SesionActualDto> {
    const idCorrelacion = res.getHeader('x-request-id');
    const resultado = await this.auth.iniciarSesion(dto, {
      ip: ipCliente(req),
      agenteUsuario: req.headers['user-agent'] ?? null,
      idCorrelacion: typeof idCorrelacion === 'string' ? idCorrelacion : null,
    });
    res.cookie(
      COOKIE_SESION,
      resultado.token,
      opcionesCookieSesion(this.cookieSegura, resultado.expiraEn),
    );
    res.setHeader('Cache-Control', 'no-store');
    return resultado.sesion;
  }

  @Post('logout')
  @PermitirConCambioClave()
  @Auditar({ accion: 'auth.logout', entidad: 'sesion' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(COOKIE_SESION)
  @ApiOperation({ summary: 'Cierra la sesión actual' })
  @ApiNoContentResponse({ description: 'Sesión cerrada.' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  async cerrarSesion(
    @UsuarioActual() actor: ActorAutenticado,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.cerrarSesion(actor);
    res.clearCookie(COOKIE_SESION, opcionesLimpiarCookie(this.cookieSegura));
  }

  @Get('sesion')
  @PermitirConCambioClave()
  @ApiCookieAuth(COOKIE_SESION)
  @ApiOperation({ summary: 'Sesión actual: usuario, rol y permisos' })
  @ApiOkResponse({ type: SesionActualDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Sin sesión o sesión vencida.',
  })
  async obtenerSesion(
    @UsuarioActual() actor: ActorAutenticado,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SesionActualDto> {
    res.setHeader('Cache-Control', 'no-store');
    return this.auth.obtenerSesion(actor);
  }

  @Post('cambiar-clave')
  @PermitirConCambioClave()
  @UseGuards(LimiteLoginGuard)
  @Throttle(LIMITE)
  @Auditar({
    accion: 'auth.cambiar_clave',
    entidad: 'usuario',
    incluirRespuesta: false,
  })
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(COOKIE_SESION)
  @ApiOperation({
    summary: 'Cambia la contraseña propia',
    description:
      'Mínimo 12 caracteres. Si la cuenta tenía una contraseña temporal, desbloquea el resto de la aplicación. Cierra las demás sesiones del usuario.',
  })
  @ApiOkResponse({ type: SesionActualDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Contraseña actual incorrecta o nueva inválida.',
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  cambiarClave(
    @Body() dto: CambiarClaveDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<SesionActualDto> {
    return this.auth.cambiarClave(actor, dto, auditoria);
  }

  @Patch('tema')
  @ApiCookieAuth(COOKIE_SESION)
  @ApiOperation({
    summary: 'Guarda la preferencia de tema (claro u oscuro) del usuario',
  })
  @ApiOkResponse({ type: SesionActualDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  actualizarTema(
    @Body() dto: ActualizarTemaDto,
    @UsuarioActual() actor: ActorAutenticado,
  ): Promise<SesionActualDto> {
    return this.auth.actualizarTema(actor, dto.tema);
  }
}
