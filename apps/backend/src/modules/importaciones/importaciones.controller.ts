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
  ApiConflictResponse,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiUnsupportedMediaTypeResponse,
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
import { RequierePermiso } from '../../common/permisos/decoradores.js';
import { disposicionAdjunto } from '../adjuntos/adjuntos.controller.js';
import type { ArchivoSubido } from '../adjuntos/adjuntos.service.js';
import { MAX_BYTES_ADJUNTO } from '../adjuntos/politica-archivos.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import { TIPO_MIME_XLSX } from '../presupuestos/exportacion-excel.js';
import {
  ConfirmarImportacionDto,
  DescartarImportacionDto,
  ImportacionLoteDto,
  ListarFilasImportacionDto,
  ListarImportacionesDto,
  PaginaFilasImportacionDto,
  PaginaImportacionesDto,
  SubirImportacionPresupuestoDto,
} from './importaciones.dto.js';
import { ImportacionesService } from './importaciones.service.js';

const PARAM_ID = {
  name: 'id',
  description: 'Identificador del lote de importación.',
  example: 7,
};

/** P24 — Importación masiva. Solo administradores (D-11). */
@ApiTags('importaciones')
@ApiCookieAuth(COOKIE_SESION)
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Sin sesión válida.',
})
@ApiForbiddenResponse({
  type: ErrorResponseDto,
  description: 'Solo administradores.',
})
@RequierePermiso('importaciones.administrar')
@Controller('importaciones')
export class ImportacionesController {
  constructor(private readonly importaciones: ImportacionesService) {}

  @Get('plantillas/presupuesto')
  @ApiOperation({
    summary: 'Descarga la plantilla provisoria de presupuesto (.xlsx)',
    description:
      'Columnas: código, familia, descripción, unidad, cantidad y precio unitario. La plantilla real del cliente aún no existe (H9).',
  })
  @ApiOkResponse({
    description: 'Archivo .xlsx.',
    content: {
      [TIPO_MIME_XLSX]: { schema: { type: 'string', format: 'binary' } },
    },
  })
  async descargarPlantillaPresupuesto(): Promise<StreamableFile> {
    const plantilla = await this.importaciones.plantillaPresupuesto();
    return new StreamableFile(plantilla.contenido, {
      type: TIPO_MIME_XLSX,
      length: plantilla.contenido.length,
      disposition: disposicionAdjunto(plantilla.nombre),
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Lista los lotes de importación (los más recientes primero)',
  })
  @ApiOkResponse({ type: PaginaImportacionesDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listarImportaciones(
    @Query() filtro: ListarImportacionesDto,
  ): Promise<PaginaImportacionesDto> {
    return this.importaciones.listar(filtro);
  }

  @Post('presupuestos')
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: MAX_BYTES_ADJUNTO, files: 1 },
    }),
  )
  @Auditar({ accion: 'importacion.subir', entidad: 'importacion_lote' })
  @ApiOperation({
    summary: 'Sube una planilla de presupuesto y la previsualiza',
    description:
      'Formulario multipart con el archivo en `archivo` (.xlsx o .csv, hasta 20 MB y 5.000 filas) y `obraId`. Valida fila a fila y guarda el lote; no crea nada en el presupuesto hasta confirmar.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['archivo', 'obraId'],
      properties: {
        archivo: {
          type: 'string',
          format: 'binary',
          description: 'Planilla .xlsx o .csv.',
        },
        obraId: { type: 'integer', example: 1 },
      },
    },
  })
  @ApiCreatedResponse({ type: ImportacionLoteDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiPayloadTooLargeResponse({
    type: ErrorResponseDto,
    description: 'Supera 20 MB.',
  })
  @ApiUnsupportedMediaTypeResponse({
    type: ErrorResponseDto,
    description: 'No es .xlsx ni .csv.',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'Planilla inválida (`PLANTILLA_INVALIDA`, `ARCHIVO_ILEGIBLE`, `PLANILLA_DEMASIADO_GRANDE`) u obra cerrada.',
  })
  subirImportacionPresupuesto(
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Body() dto: SubirImportacionPresupuestoDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ImportacionLoteDto> {
    return this.importaciones.subirPresupuesto(archivo, dto, actor, auditoria);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un lote de importación' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ImportacionLoteDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtenerImportacion(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ImportacionLoteDto> {
    return this.importaciones.obtener(id);
  }

  @Get(':id/filas')
  @ApiOperation({
    summary: 'Filas de un lote con su validación (paginado)',
    description:
      'Con `soloErrores=true` devuelve únicamente las filas con errores.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: PaginaFilasImportacionDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  listarFilasImportacion(
    @Param('id', ParseIntPipe) id: number,
    @Query() filtro: ListarFilasImportacionDto,
  ): Promise<PaginaFilasImportacionDto> {
    return this.importaciones.listarFilas(id, filtro);
  }

  @Post(':id/confirmar')
  @HttpCode(HttpStatus.OK)
  @Auditar({ accion: 'importacion.confirmar', entidad: 'importacion_lote' })
  @ApiOperation({
    summary:
      'Confirma un lote sin errores: crea la versión de presupuesto en borrador',
    description:
      'Vuelve a validar las filas y crea la versión (`presupuestoVersionId` en la respuesta). Un lote con errores no se puede confirmar.',
  })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ImportacionLoteDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'Lote con errores (`IMPORTACION_CON_ERRORES`), ya resuelto (`IMPORTACION_NO_PENDIENTE`) o desactualizado.',
  })
  confirmarImportacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmarImportacionDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ImportacionLoteDto> {
    return this.importaciones.confirmar(id, dto, actor, auditoria);
  }

  @Post(':id/descartar')
  @HttpCode(HttpStatus.OK)
  @Auditar({ accion: 'importacion.descartar', entidad: 'importacion_lote' })
  @ApiOperation({ summary: 'Descarta un lote pendiente' })
  @ApiParam(PARAM_ID)
  @ApiOkResponse({ type: ImportacionLoteDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  descartarImportacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DescartarImportacionDto,
    @UsuarioActual() actor: ActorAutenticado,
    @ContextoAuditoriaActual() auditoria: ContextoAuditoria,
  ): Promise<ImportacionLoteDto> {
    return this.importaciones.descartar(id, dto, actor, auditoria);
  }
}
