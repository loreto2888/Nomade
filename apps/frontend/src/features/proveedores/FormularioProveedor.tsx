import { useActualizarProveedor, useCrearProveedor, type ProveedorDto } from '@/api/proveedores';
import { FormularioContraparte } from '@/features/maestros/FormularioContraparte';

interface FormularioProveedorProps {
  abierto: boolean;
  /** Proveedor a editar; sin él, crea uno nuevo. */
  proveedor?: ProveedorDto;
  onCerrar: () => void;
  onGuardado: (proveedor: ProveedorDto, creado: boolean) => void;
  onConflicto: () => void;
}

/** Alta y edición de proveedores (los datos bancarios se administran aparte, solo admin). */
export function FormularioProveedor({ proveedor, ...resto }: FormularioProveedorProps) {
  const crear = useCrearProveedor();
  const actualizar = useActualizarProveedor();
  return (
    <FormularioContraparte
      {...resto}
      registro={proveedor}
      titulos={{ nuevo: 'Nuevo proveedor', editar: 'Editar proveedor' }}
      entidad="el proveedor"
      textoCrear="Crear proveedor"
      crear={crear}
      actualizar={actualizar}
    />
  );
}
