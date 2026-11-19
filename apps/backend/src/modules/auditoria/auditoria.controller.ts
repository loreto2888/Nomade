import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { COOKIE_SESION } from '../../app.constantes.js';
import { ErrorResponseDto } from '../../common/errores/error-response.dto.js';
import { RequierePermiso, Roles } from '../../common/permisos/decoradores.js';
import { Rol } from '../../common/permisos/rol.js';
import { ConsultarAuditoriaDto, PaginaAuditoriaDto } from './auditoria.dto.js';
import { AuditoriaService } from './auditoria.service.js';

@ApiTags('auditoria')
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
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}

  @Get()
  @RequierePermiso('auditoria.consultar')
  @ApiOperation({
    summary: 'Consulta la bitácora de auditoría',
    description:
      'Bitácora append-only, paginada y ordenada del más reciente al más antiguo.',
  })
  @ApiOkResponse({ type: PaginaAuditoriaDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  consultarAuditoria(
    @Query() filtro: ConsultarAuditoriaDto,
  ): Promise<PaginaAuditoriaDto> {
    return this.auditoria.consultar(filtro);
  }
}
