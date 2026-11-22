import { HttpStatus, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { CatalogosRepositorio } from '../catalogos/catalogos.repositorio.js';
import { TipoCatalogo } from '../catalogos/catalogos.tipos.js';
import { ObrasRepositorio } from '../obras/obras.repositorio.js';
import type { Movimiento } from './movimiento.entity.js';
import type {
  MovimientoDto,
  ResumenCompromisosDto,
} from './movimientos.dto.js';
import { MovimientosRepositorio } from './movimientos.repositorio.js';
import { OrigenMovimiento, TipoMovimiento } from './movimientos.tipos.js';

export interface NuevoMovimiento {
  fecha: string;
  obraId: number;
  proveedorId: number | null;
  categoriaGastoId: number | null;
  origenTipo: OrigenMovimiento;
  origenId: number;
  /** Positivo: el hecho original. */
  montoClp: number;
  descripcion: string;
  actorId: number;
}

export interface Reversa {
  tipo: TipoMovimiento;
  origenTipo: OrigenMovimiento;
  origenId: number;
  fecha: string;
  descripcion: string;
  actorId: number;
}

export const aMovimientoDto = (m: Movimiento): MovimientoDto => ({
  id: m.id,
  fecha: m.fecha,
  tipo: m.tipo,
  origenTipo: m.origenTipo,
  origenId: m.origenId,
  montoClp: m.montoClp,
  reversaDeId: m.reversaDeId,
  descripcion: m.descripcion,
  creadoEn: m.createdAt.toISOString(),
});

/**
 * Libro de movimientos (plan §9.3). Cada hecho genera su movimiento una sola vez (índice único por
 * origen) dentro de la transacción del documento; una corrección es una reversa, nunca una edición.
 */
@Injectable()
export class MovimientosService {
  constructor(
    private readonly repositorio: MovimientosRepositorio,
    private readonly obras: ObrasRepositorio,
    private readonly catalogos: CatalogosRepositorio,
  ) {}

  /** Compromiso de una OC aprobada (no es costo: lo será la factura, fase 5). */
  registrarCompromiso(
    tx: EntityManager,
    datos: NuevoMovimiento,
  ): Promise<Movimiento> {
    return this.repositorio.insertar(
      {
        fecha: datos.fecha,
        tipo: TipoMovimiento.Compromiso,
        obraId: datos.obraId,
        proveedorId: datos.proveedorId,
        categoriaGastoId: datos.categoriaGastoId,
        origenTipo: datos.origenTipo,
        origenId: datos.origenId,
        montoClp: datos.montoClp,
        reversaDeId: null,
        descripcion: datos.descripcion,
        createdBy: datos.actorId,
      },
      tx,
    );
  }

  /** Reversa del movimiento original de un hecho (monto con signo contrario). */
  async revertir(tx: EntityManager, datos: Reversa): Promise<Movimiento> {
    const original = await this.repositorio.buscarOriginal(
      datos.tipo,
      datos.origenTipo,
      datos.origenId,
      tx,
    );
    if (!original) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'MOVIMIENTO_NO_ENCONTRADO',
        'No existe el movimiento que se quiere revertir.',
      );
    }
    if (await this.repositorio.buscarReversaDe(original.id, tx)) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'MOVIMIENTO_YA_REVERTIDO',
        'El movimiento ya fue revertido.',
      );
    }
    return this.repositorio.insertar(
      {
        fecha: datos.fecha,
        tipo: original.tipo,
        obraId: original.obraId,
        proveedorId: original.proveedorId,
        categoriaGastoId: original.categoriaGastoId,
        origenTipo: original.origenTipo,
        origenId: original.origenId,
        montoClp: -original.montoClp,
        reversaDeId: original.id,
        descripcion: datos.descripcion,
        createdBy: datos.actorId,
      },
      tx,
    );
  }

  async listarDeOrigen(
    origenTipo: OrigenMovimiento,
    origenId: number,
  ): Promise<MovimientoDto[]> {
    return (await this.repositorio.listarDeOrigen(origenTipo, origenId)).map(
      aMovimientoDto,
    );
  }

  /** Compromisos vigentes de una obra, por categoría de gasto (en el orden del catálogo). */
  async resumenCompromisos(obraId: number): Promise<ResumenCompromisosDto> {
    if (!(await this.obras.buscarPorId(obraId))) {
      throw new ErrorAplicacion(
        HttpStatus.NOT_FOUND,
        'OBRA_NO_ENCONTRADA',
        'La obra no existe.',
      );
    }
    const [totales, categorias] = await Promise.all([
      this.repositorio.totalesPorCategoria(obraId, TipoMovimiento.Compromiso),
      this.catalogos.listar(TipoCatalogo.CategoriaGasto, true),
    ]);
    const porId = new Map(categorias.map((c) => [c.id, c]));
    const orden = (id: number | null) =>
      (id !== null ? porId.get(id)?.orden : undefined) ??
      Number.MAX_SAFE_INTEGER;
    const vigentes = totales
      .filter((t) => t.totalClp !== 0)
      .sort((a, b) => orden(a.categoriaGastoId) - orden(b.categoriaGastoId));
    return {
      obraId,
      totalClp: vigentes.reduce((suma, t) => suma + t.totalClp, 0),
      porCategoria: vigentes.map((t) => {
        const c =
          t.categoriaGastoId === null
            ? undefined
            : porId.get(t.categoriaGastoId);
        return {
          categoria:
            t.categoriaGastoId === null
              ? null
              : {
                  id: t.categoriaGastoId,
                  codigo: c?.codigo ?? String(t.categoriaGastoId),
                  nombre: c?.nombre ?? `Categoría ${t.categoriaGastoId}`,
                },
          totalClp: t.totalClp,
        };
      }),
    };
  }
}
