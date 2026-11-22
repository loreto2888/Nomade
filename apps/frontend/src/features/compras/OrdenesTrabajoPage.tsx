import AddOutlined from '@mui/icons-material/AddOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { CotizacionDialog } from './CotizacionDialog';
import { OrdenTrabajoDialog } from './OrdenTrabajoDialog';
import { TablaCotizaciones, TablaOrdenesTrabajo } from './TablasCompras';
import { rutaCotizacion, rutaOrdenTrabajo } from './rutas';

/** P11 — Órdenes de trabajo y subcontratos, con sus cotizaciones de origen. */
export function OrdenesTrabajoPage() {
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const pestana = parametros.get('pestana') === 'cotizaciones' ? 'cotizaciones' : 'ordenes';
  const [dialogo, setDialogo] = useState<'cotizacion' | 'ot' | null>(null);

  return (
    <>
      <CabeceraPagina
        eyebrow="Compras y gastos"
        titulo="Órdenes de trabajo y subcontratos"
        descripcion="Registra cotizaciones de contratistas y, al aprobarlas, crea la OT con sus hitos de pago."
        acciones={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<AddOutlined />}
              onClick={() => setDialogo('cotizacion')}
            >
              Nueva cotización
            </Button>
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={() => setDialogo('ot')}
            >
              Nueva orden de trabajo
            </Button>
          </Box>
        }
      />

      <Card>
        <Tabs
          value={pestana}
          onChange={(_e, valor: string) =>
            setParametros(valor === 'ordenes' ? {} : { pestana: valor })
          }
          aria-label="Documentos"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="ordenes" label="Órdenes de trabajo" />
          <Tab value="cotizaciones" label="Cotizaciones" />
        </Tabs>
        {pestana === 'ordenes' ? (
          <TablaOrdenesTrabajo
            conFiltros
            etiqueta="Órdenes de trabajo"
            vacio="No hay órdenes de trabajo que coincidan con la búsqueda."
          />
        ) : (
          <TablaCotizaciones
            conFiltros
            etiqueta="Cotizaciones"
            vacio="No hay cotizaciones que coincidan con la búsqueda."
          />
        )}
      </Card>

      <CotizacionDialog
        abierto={dialogo === 'cotizacion'}
        onCerrar={() => setDialogo(null)}
        onGuardada={(c) => {
          setDialogo(null);
          void navegar(rutaCotizacion(c.id));
        }}
      />
      <OrdenTrabajoDialog
        abierto={dialogo === 'ot'}
        onCerrar={() => setDialogo(null)}
        onGuardada={(ot) => {
          setDialogo(null);
          void navegar(rutaOrdenTrabajo(ot.id));
        }}
      />
    </>
  );
}
