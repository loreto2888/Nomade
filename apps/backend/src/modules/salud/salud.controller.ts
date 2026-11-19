import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { EstadoSalud, SaludDto } from './salud.dto.js';
import { SaludService } from './salud.service.js';

@ApiTags('salud')
@Controller('health')
export class SaludController {
  constructor(private readonly saludService: SaludService) {}

  @Get()
  @ApiOperation({ summary: 'Estado del servicio y de la base de datos' })
  @ApiOkResponse({ type: SaludDto, description: 'Servicio operativo.' })
  @ApiServiceUnavailableResponse({
    type: SaludDto,
    description: 'La base de datos no responde.',
  })
  async obtenerSalud(
    @Res({ passthrough: true }) res: Response,
  ): Promise<SaludDto> {
    const salud = await this.saludService.obtenerSalud();
    res.status(
      salud.estado === EstadoSalud.Ok
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE,
    );
    res.setHeader('Cache-Control', 'no-store');
    return salud;
  }
}
