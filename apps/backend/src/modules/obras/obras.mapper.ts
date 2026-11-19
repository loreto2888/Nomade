import type { Obra } from './obra.entity.js';
import type { ObraDto } from './obras.dto.js';

/** Proyección pública. Exige la obra cargada con su cliente y estado. */
export function aObraDto(obra: Obra): ObraDto {
  if (!obra.cliente || !obra.estado) {
    throw new Error('aObraDto requiere la obra con cliente y estado cargados');
  }
  return {
    id: obra.id,
    codigoCentroCosto: obra.codigoCentroCosto,
    nombre: obra.nombre,
    cliente: {
      id: obra.cliente.id,
      rut: obra.cliente.rut,
      razonSocial: obra.cliente.razonSocial,
    },
    estado: {
      id: obra.estado.id,
      codigo: obra.estado.codigo,
      nombre: obra.estado.nombre,
    },
    responsable: obra.responsable,
    direccion: obra.direccion,
    fechaInicio: obra.fechaInicio,
    fechaTermino: obra.fechaTermino,
    monedaContrato: obra.monedaContrato,
    montoContrato: obra.montoContrato,
    montoContratoClp: obra.montoContratoClp,
    fechaValorUf: obra.fechaValorUf,
    valorUf: obra.valorUf,
    observaciones: obra.observaciones,
    creadoEn: obra.createdAt.toISOString(),
    actualizadoEn: obra.updatedAt.toISOString(),
    version: obra.version,
  };
}
