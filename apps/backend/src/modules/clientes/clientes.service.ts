import { HttpStatus, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { ServicioContraparte } from '../../common/maestros/servicio-contraparte.js';
import type { Cliente } from './cliente.entity.js';
import type {
  ClienteDto,
  ListarClientesDto,
  PaginaClientesDto,
} from './clientes.dto.js';
import { aClienteDto } from './clientes.mapper.js';
import { ClientesRepositorio } from './clientes.repositorio.js';

@Injectable()
export class ClientesService extends ServicioContraparte<Cliente, ClienteDto> {
  constructor(private readonly clientes: ClientesRepositorio) {
    super(clientes, {
      codigoNoEncontrado: 'CLIENTE_NO_ENCONTRADO',
      mensajeNoEncontrado: 'El cliente no existe.',
      mensajeRutDuplicado: 'Ya existe un cliente con ese RUT.',
      restriccionRut: 'ux_cliente_rut',
    });
  }

  protected aDtos(entidades: Cliente[]): Promise<ClienteDto[]> {
    return Promise.resolve(entidades.map(aClienteDto));
  }

  /** Un cliente con obras vigentes no se puede eliminar. */
  protected async validarEliminacion(
    cliente: Cliente,
    tx: EntityManager,
  ): Promise<void> {
    const obras = await this.clientes.contarObrasVigentes(cliente.id, tx);
    if (obras > 0) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'CLIENTE_CON_OBRAS',
        `No se puede eliminar el cliente: tiene ${obras} ${obras === 1 ? 'obra vigente' : 'obras vigentes'}.`,
      );
    }
  }

  async listar(filtro: ListarClientesDto): Promise<PaginaClientesDto> {
    const [clientes, total] = await this.clientes.listar(filtro);
    return {
      items: await this.aDtos(clientes),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }
}
