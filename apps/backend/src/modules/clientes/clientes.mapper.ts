import { aContraparteDto } from '../../common/maestros/contraparte.mapper.js';
import type { Cliente } from './cliente.entity.js';
import type { ClienteDto } from './clientes.dto.js';

export const aClienteDto = (cliente: Cliente): ClienteDto =>
  aContraparteDto(cliente);
