import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { COOKIE_SESION } from '../../app.constantes.js';
import { ErrorResponseDto } from '../../common/errores/error-response.dto.js';
import { ResumenCompromisosDto } from './movimientos.dto.js';
import { MovimientosService } from './movimientos.service.js';

@ApiTags('movimientos')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller()
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  @Get('obras/:obraId/compromisos')
  @ApiOperation({
    summary: 'Compromisos vigentes de una obra, por categoría de gasto',
    description:
      'Suma del libro de movimientos: OC aprobadas (o recibidas) menos sus anulaciones, en CLP neto.',
  })
  @ApiParam({
    name: 'obraId',
    description: 'Identificador de la obra.',
    example: 1,
  })
  @ApiOkResponse({ type: ResumenCompromisosDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  resumenCompromisos(
    @Param('obraId', ParseIntPipe) obraId: number,
  ): Promise<ResumenCompromisosDto> {
    return this.movimientos.resumenCompromisos(obraId);
  }
}
