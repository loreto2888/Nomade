import { useActualizarCliente, useCrearCliente, type ClienteDto } from '@/api/clientes';
import { FormularioContraparte } from '@/features/maestros/FormularioContraparte';

interface FormularioClienteProps {
  abierto: boolean;
  /** Cliente a editar; sin él, crea uno nuevo. */
  cliente?: ClienteDto;
  onCerrar: () => void;
  onGuardado: (cliente: ClienteDto, creado: boolean) => void;
  onConflicto: () => void;
}

/** Alta y edición de clientes. */
export function FormularioCliente({ cliente, ...resto }: FormularioClienteProps) {
  const crear = useCrearCliente();
  const actualizar = useActualizarCliente();
  return (
    <FormularioContraparte
      {...resto}
      registro={cliente}
      titulos={{ nuevo: 'Nuevo cliente', editar: 'Editar cliente' }}
      entidad="el cliente"
      textoCrear="Crear cliente"
      crear={crear}
      actualizar={actualizar}
    />
  );
}
