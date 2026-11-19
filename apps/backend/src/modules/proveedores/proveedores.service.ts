import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ServicioContraparte } from '../../common/maestros/servicio-contraparte.js';
import { aContraparteDto } from '../../common/maestros/contraparte.mapper.js';
import type { Proveedor } from './proveedor.entity.js';
import type {
  ListarProveedoresDto,
  PaginaProveedoresDto,
  ProveedorDto,
} from './proveedores.dto.js';
import { ProveedoresRepositorio } from './proveedores.repositorio.js';

@Injectable()
export class ProveedoresService extends ServicioContraparte<
  Proveedor,
  ProveedorDto
> {
  constructor(private readonly proveedores: ProveedoresRepositorio) {
    super(proveedores, {
      codigoNoEncontrado: 'PROVEEDOR_NO_ENCONTRADO',
      mensajeNoEncontrado: 'El proveedor no existe.',
      mensajeRutDuplicado: 'Ya existe un proveedor con ese RUT.',
      restriccionRut: 'ux_proveedor_rut',
    });
  }

  protected async aDtos(entidades: Proveedor[]): Promise<ProveedorDto[]> {
    const conCuentas = await this.proveedores.conCuentasBancarias(
      entidades.map((e) => e.id),
    );
    return entidades.map((e) => ({
      ...aContraparteDto(e),
      tieneDatosBancarios: conCuentas.has(e.id),
    }));
  }

  /**
   * Hoy un proveedor se puede eliminar siempre (aún no existen documentos de compra).
   * Las fases de compras agregarán aquí la regla de "sin documentos vigentes".
   */
  protected validarEliminacion(
    _proveedor: Proveedor,
    _tx: EntityManager,
  ): Promise<void> {
    return Promise.resolve();
  }

  async listar(filtro: ListarProveedoresDto): Promise<PaginaProveedoresDto> {
    const [proveedores, total] = await this.proveedores.listar(filtro);
    return {
      items: await this.aDtos(proveedores),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }
}
