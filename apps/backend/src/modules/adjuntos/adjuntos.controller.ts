import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { COOKIE_SESION } from '../../app.constantes.js';
import {
  ContextoAuditoriaActual,
  UsuarioActual,
  type ActorAutenticado,
  type ContextoAuditoria,
} from '../../common/auth/actor.js';
import { ErrorResponseDto } from '../../common/errores/error-response.dto.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import {
  AdjuntoDto,
  EliminarAdjuntoDto,
  ListarAdjuntosDto,
  SubirAdjuntoDto,
} from './adjuntos.dto.js';
import { AdjuntosService, type ArchivoSubido } from './adjuntos.service.js';
import { MAX_BYTES_ADJUNTO } from './politica-archivos.js';

const PARAM_ID = {
  name: 'id',
  description: 'Identificador del adjunto.',
  example: 9,
};

/** `Content-Disposition: attachment` con el nombre original codificado (RFC 5987). */
export function disposicionAdjunto(nombre: string): string {
  const ascii = nombre.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}

@ApiTags('adjuntos')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@Controller('adjuntos')
export class AdjuntosController {
  constructor(private readonly adjuntos: AdjuntosService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista los adjuntos de una obra, proveedor o cliente',
  })
  @ApiOkResponse({ type: [AdjuntoDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  listarAdjuntos(@Query() filtro: ListarAdjuntosDto): Promise<AdjuntoDto[]> {
    return this.adjuntos.listar(filtro);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: MAX_BYTES_ADJUNTO, files: 1 },
    }),
  )
  @Auditar({ accion: 'adjunto.subir', entidad: 'adjunto' })
  @ApiOperation({
    summary: 'Sube un adjunto',
    description:
      'Formulario multipart con el archivo en `archivo` (PDF, JPG, PNG, XLSX o CSV, hasta 20 MB), `entidadTipo` y `entidadId`. Se valida el contenido real del archivo.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['archivo', 'entidadTipo', 'entidadId'],
      properties: {
        archivo: {
          type: 'string',
          format: 'binary',
          description: 'PDF, JPG, PNG, XLSX o CSV, hasta 20 MB.',
        },
        entidadTipo: { $ref: '#/components/schemas/EntidadAdjuntable' },
        entidadId: { type: 'integer', example: 1 },
        descripcion: { type: 'string', maxLength: 300 },
      },
    },
  })
  @ApiCreatedResponse({ type: AdjuntoDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiPayloadTooLargeResponse({
    type: ErrorResponseDto,
    description: 'Supera 20 MB.',
  })
  @ApiUnsupportedMediaTypeResponse({
    type: ErrorResponseDto,
    description: 'Tipo no permitido.',
  })
  subirAdjunto(
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Body() dto: SubirAdjuntoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<AdjuntoDto> {
    return this.adjuntos.subir(archivo, dto, actor, auditoria);
  }

  @Get(':id/descargar')
  @ApiOperation({
    summary: 'Descarga un adjunto',
    description:
      'Solo con sesión válida; el archivo nunca se publica en una ruta estática.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({
    description: 'Contenido del archivo.',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async descargarAdjunto(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StreamableFile> {
    const descarga = await this.adjuntos.descargar(id);
    return new StreamableFile(descarga.flujo, {
      type: descarga.tipoMime,
      length: descarga.tamanioBytes,
      disposition: disposicionAdjunto(descarga.nombre),
    });
  }

  @Post(':id/eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auditar({ accion: 'adjunto.eliminar', entidad: 'adjunto' })
  @ApiOperation({ summary: 'Elimina un adjunto (borrado lógico)' })
  @ApiParam(PARAM_ID)
  @ApiNoContentResponse({ description: 'Adjunto eliminado.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async eliminarAdjunto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EliminarAdjuntoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<void> {
    await this.adjuntos.eliminar(id, dto, actor, auditoria);
  }
}
