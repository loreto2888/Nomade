import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
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
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { ErrorResponseDto } from '../../common/errores/error-response.dto.js';
import { RequierePermiso } from '../../common/permisos/decoradores.js';
import { esFechaValida } from '../../common/tiempo/reloj.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import {
  ConsultarValorUfDto,
  GuardarValorUfDto,
  ListarValoresUfDto,
  PaginaValoresUfDto,
  ValorUfDto,
} from './uf.dto.js';
import { UfService } from './uf.service.js';

@ApiTags('uf')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller('uf')
export class UfController {
  constructor(private readonly uf: UfService) {}

  @Get('valor')
  @ApiOperation({
    summary: 'Valor de la UF aplicable a una fecha',
    description:
      'Sirve para convertir montos UF ↔ CLP. Usa el valor del día o el último anterior (hasta 7 días).',
  })
  @ApiOkResponse({ type: ValorUfDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'No hay valor cargado (`UF_NO_DISPONIBLE`).',
  })
  obtenerValorUf(@Query() consulta: ConsultarValorUfDto): Promise<ValorUfDto> {
    return this.uf.exigirValorParaFecha(consulta.fecha);
  }

  @Get()
  @RequierePermiso('parametros.administrar')
  @ApiOperation({
    summary: 'Lista los valores de la UF cargados (solo administradores)',
  })
  @ApiOkResponse({ type: PaginaValoresUfDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Solo administradores.',
  })
  listarValoresUf(
    @Query() filtro: ListarValoresUfDto,
  ): Promise<PaginaValoresUfDto> {
    return this.uf.listar(filtro);
  }

  @Put(':fecha')
  @RequierePermiso('parametros.administrar')
  @Auditar({ accion: 'uf.guardar', entidad: 'valor_uf' })
  @ApiOperation({
    summary:
      'Crea o corrige el valor de la UF de un día (solo administradores)',
  })
  @ApiParam({
    name: 'fecha',
    example: '2026-11-19',
    description: 'Fecha AAAA-MM-DD.',
  })
  @ApiOkResponse({ type: ValorUfDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Solo administradores.',
  })
  guardarValorUf(
    @Param('fecha') fecha: string,
    @Body() dto: GuardarValorUfDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ValorUfDto> {
    if (!esFechaValida(fecha)) {
      throw new ErrorAplicacion(
        HttpStatus.BAD_REQUEST,
        'VALIDACION',
        'Los datos enviados no son válidos.',
        [
          {
            campo: 'fecha',
            errores: ['Ingresa una fecha válida con el formato AAAA-MM-DD.'],
          },
        ],
      );
    }
    return this.uf.guardar(fecha, dto.valor, actor, auditoria);
  }
}
