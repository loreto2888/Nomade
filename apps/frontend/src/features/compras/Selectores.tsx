import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { useObras } from '@/api/obras';
import { useProveedores } from '@/api/proveedores';
import { useValorDiferido } from '@/lib/useValorDiferido';

export interface Opcion {
  id: number;
  etiqueta: string;
  detalle?: string;
}

interface SelectorProps {
  label: string;
  value: Opcion | null;
  onChange: (opcion: Opcion | null) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
}

function SelectorRemoto({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled,
  required,
  opciones,
  cargando,
  onBuscar,
}: SelectorProps & { opciones: Opcion[]; cargando: boolean; onBuscar: (texto: string) => void }) {
  return (
    <Autocomplete
      value={value}
      onChange={(_e, opcion) => onChange(opcion)}
      onInputChange={(_e, texto, motivo) => {
        if (motivo === 'input') onBuscar(texto);
      }}
      options={value && !opciones.some((o) => o.id === value.id) ? [value, ...opciones] : opciones}
      getOptionLabel={(o) => o.etiqueta}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(x) => x}
      loading={cargando}
      disabled={disabled}
      noOptionsText="Sin resultados"
      loadingText="Buscando…"
      renderOption={(props, o) => (
        <li {...props} key={o.id}>
          <div>
            <div>{o.etiqueta}</div>
            {o.detalle && <div style={{ fontSize: 12, opacity: 0.7 }}>{o.detalle}</div>}
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          required={required}
        />
      )}
    />
  );
}

/** Obra con búsqueda en el servidor (nombre o centro de costo). */
export function SelectorObra(props: SelectorProps) {
  const [texto, setTexto] = useState('');
  const q = useValorDiferido(texto.trim());
  const consulta = useObras({ pagina: 1, tamanio: 20, q: q || undefined });
  const opciones = (consulta.data?.items ?? [])
    .filter((o) => o.estado.codigo !== 'cerrada')
    .map((o) => ({
      id: o.id,
      etiqueta: o.nombre,
      detalle: `${o.codigoCentroCosto} · ${o.cliente.razonSocial}`,
    }));
  return (
    <SelectorRemoto
      {...props}
      opciones={opciones}
      cargando={consulta.isFetching}
      onBuscar={setTexto}
    />
  );
}

/** Proveedor con búsqueda en el servidor (razón social o RUT). */
export function SelectorProveedor(props: SelectorProps) {
  const [texto, setTexto] = useState('');
  const q = useValorDiferido(texto.trim());
  const consulta = useProveedores({ pagina: 1, tamanio: 20, q: q || undefined });
  const opciones = (consulta.data?.items ?? []).map((p) => ({
    id: p.id,
    etiqueta: p.razonSocial,
    detalle: p.rut,
  }));
  return (
    <SelectorRemoto
      {...props}
      opciones={opciones}
      cargando={consulta.isFetching}
      onBuscar={setTexto}
    />
  );
}
