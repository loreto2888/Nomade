import AddOutlined from '@mui/icons-material/AddOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { TipoOrdenCompra } from '@/api/compras';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { ETIQUETA_TIPO_OC } from '@/lib/compras';
import { OrdenCompraDialog } from './OrdenCompraDialog';
import { TablaOrdenesCompra } from './TablasCompras';
import { rutaOrdenCompra } from './rutas';

/** P10 — Órdenes de compra de materiales y parciales de OT. */
export function OrdenesCompraPage() {
  const navegar = useNavigate();
  const [nueva, setNueva] = useState(false);
  const [tipo, setTipo] = useState<TipoOrdenCompra | ''>('');

  return (
    <>
      <CabeceraPagina
        eyebrow="Compras y gastos"
        titulo="Órdenes de compra"
        descripcion="Gestiona compras de materiales y órdenes para pagos parciales de las OT."
        acciones={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setNueva(true)}>
            Nueva orden de compra
          </Button>
        }
      />

      <Card>
        <Box sx={{ px: { xs: 1.5, md: 2 }, pt: { xs: 1.5, md: 2 } }}>
          <TextField
            select
            size="small"
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoOrdenCompra | '')}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="materiales">{ETIQUETA_TIPO_OC.materiales}</MenuItem>
            <MenuItem value="parcial_ot">{ETIQUETA_TIPO_OC.parcial_ot}</MenuItem>
          </TextField>
        </Box>
        <TablaOrdenesCompra
          key={tipo}
          tipo={tipo === '' ? undefined : tipo}
          conFiltros
          etiqueta="Órdenes de compra"
          vacio="No hay órdenes de compra que coincidan con la búsqueda."
        />
      </Card>

      <OrdenCompraDialog
        abierto={nueva}
        onCerrar={() => setNueva(false)}
        onGuardada={(d) => {
          setNueva(false);
          void navegar(rutaOrdenCompra(d.ordenCompra.id));
        }}
      />
    </>
  );
}
