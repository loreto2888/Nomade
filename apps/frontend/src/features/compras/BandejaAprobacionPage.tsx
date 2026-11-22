import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';
import {
  useCotizaciones,
  useOrdenesCompra,
  useOrdenesTrabajo,
  type CotizacionDto,
  type OrdenCompraDto,
  type OrdenTrabajoDto,
} from '@/api/compras';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { AccionesDocumento } from './AccionesDocumento';
import { TablaCotizaciones, TablaOrdenesCompra, TablaOrdenesTrabajo } from './TablasCompras';

const PENDIENTES = { pagina: 1, tamanio: 1, estado: 'en_revision' as const };

function Bloque({
  titulo,
  total,
  children,
}: {
  titulo: string;
  total: number | undefined;
  children: ReactNode;
}) {
  return (
    <Card component="section" aria-label={titulo}>
      <Box sx={{ px: 2.25, pt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" component="h2" sx={{ fontSize: 15 }}>
          {titulo}
        </Typography>
        {total !== undefined && (
          <Chip
            size="small"
            color={total > 0 ? 'warning' : 'default'}
            label={total}
            aria-label={`${total} pendientes`}
          />
        )}
      </Box>
      {children}
    </Card>
  );
}

/**
 * P30 — Bandeja de aprobación: OC, OT y cotizaciones en revisión, con aprobación y rechazo en la
 * misma fila. Los lotes de pago y la planilla bancaria llegan en la fase 6 (H4).
 */
export function BandejaAprobacionPage() {
  const [aviso, setAviso] = useState<string | null>(null);
  const ocs = useOrdenesCompra(PENDIENTES);
  const ots = useOrdenesTrabajo(PENDIENTES);
  const cotizaciones = useCotizaciones(PENDIENTES);

  return (
    <>
      <CabeceraPagina
        eyebrow="Compras y gastos"
        titulo="Aprobación y pagos masivos"
        descripcion="Aprueba o rechaza los documentos de compra en revisión. Nadie (salvo un administrador) aprueba lo que creó."
      />
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Bloque titulo="Órdenes de compra por aprobar" total={ocs.data?.total}>
          <TablaOrdenesCompra
            filtros={{ estado: 'en_revision' }}
            etiqueta="OC en revisión"
            vacio="No hay órdenes de compra pendientes de aprobación."
            acciones={(fila) => (
              <AccionesDocumento
                compacto
                tipo="orden_compra"
                documento={fila as OrdenCompraDto}
                onAviso={setAviso}
              />
            )}
          />
        </Bloque>
        <Bloque titulo="Órdenes de trabajo por aprobar" total={ots.data?.total}>
          <TablaOrdenesTrabajo
            filtros={{ estado: 'en_revision' }}
            etiqueta="OT en revisión"
            vacio="No hay órdenes de trabajo pendientes de aprobación."
            acciones={(fila) => (
              <AccionesDocumento
                compacto
                tipo="orden_trabajo"
                documento={fila as OrdenTrabajoDto}
                onAviso={setAviso}
              />
            )}
          />
        </Bloque>
        <Bloque titulo="Cotizaciones por aprobar" total={cotizaciones.data?.total}>
          <TablaCotizaciones
            filtros={{ estado: 'en_revision' }}
            etiqueta="Cotizaciones en revisión"
            vacio="No hay cotizaciones pendientes de aprobación."
            acciones={(fila) => (
              <AccionesDocumento
                compacto
                tipo="cotizacion"
                documento={fila as CotizacionDto}
                onAviso={setAviso}
              />
            )}
          />
        </Bloque>
        <Alert severity="info">
          Lotes de pago y planilla bancaria: pendientes (fase 6). Falta definir con el cliente el
          banco, el formato de la planilla masiva y cómo se registra el resultado (H4).
        </Alert>
      </Box>
      <Snackbar
        open={aviso !== null}
        autoHideDuration={5000}
        onClose={() => setAviso(null)}
        message={aviso ?? ''}
      />
    </>
  );
}
