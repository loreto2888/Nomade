import AddOutlined from '@mui/icons-material/AddOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCompromisosObra } from '@/api/compras';
import { mensajeDeError } from '@/api/errores';
import type { ObraDto } from '@/api/obras';
import { formatCLP } from '@/lib/formato';
import { CotizacionDialog } from './CotizacionDialog';
import { OrdenCompraDialog } from './OrdenCompraDialog';
import { Seccion } from './Presentacion';
import { TablaCotizaciones, TablaOrdenesCompra, TablaOrdenesTrabajo } from './TablasCompras';
import { rutaCotizacion, rutaOrdenCompra } from './rutas';

/** Pestaña «Compras» de la ficha de obra: compromisos vigentes, OT, OC y cotizaciones de la obra. */
export function ComprasObraTab({ obra }: { obra: ObraDto }) {
  const navegar = useNavigate();
  const cerrada = obra.estado.codigo === 'cerrada';
  const compromisos = useCompromisosObra(obra.id);
  const [dialogo, setDialogo] = useState<'cotizacion' | 'oc' | null>(null);
  const opcionObra = { id: obra.id, etiqueta: obra.nombre, detalle: obra.codigoCentroCosto };
  const filtros = { obraId: obra.id };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      {!cerrada && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<AddOutlined />}
            onClick={() => setDialogo('cotizacion')}
          >
            Nueva cotización
          </Button>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setDialogo('oc')}>
            Nueva OC de materiales
          </Button>
        </Box>
      )}

      <Seccion titulo="Compromisos vigentes">
        {compromisos.isError ? (
          <Alert severity="error">{mensajeDeError(compromisos.error)}</Alert>
        ) : (
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700 }} aria-label="Total comprometido">
              {formatCLP(compromisos.data?.totalClp ?? null)}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
              OC aprobadas o recibidas, neto de anulaciones (CLP sin IVA). No es costo: el costo
              real se reconoce con la factura.
            </Typography>
            {(compromisos.data?.porCategoria.length ?? 0) > 0 && (
              <Table size="small" aria-label="Compromisos por categoría">
                <TableBody>
                  {compromisos.data!.porCategoria.map((c) => (
                    <TableRow key={c.categoria?.id ?? 0}>
                      <TableCell>{c.categoria?.nombre ?? 'Sin categoría'}</TableCell>
                      <TableCell align="right">{formatCLP(c.totalClp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}
      </Seccion>

      <Seccion titulo="Órdenes de trabajo">
        <TablaOrdenesTrabajo
          filtros={filtros}
          sinObra
          etiqueta="OT de la obra"
          vacio="La obra no tiene órdenes de trabajo."
        />
      </Seccion>
      <Seccion titulo="Órdenes de compra">
        <TablaOrdenesCompra
          filtros={filtros}
          sinObra
          etiqueta="OC de la obra"
          vacio="La obra no tiene órdenes de compra."
        />
      </Seccion>
      <Seccion titulo="Cotizaciones">
        <TablaCotizaciones
          filtros={filtros}
          sinObra
          etiqueta="Cotizaciones de la obra"
          vacio="La obra no tiene cotizaciones."
        />
      </Seccion>

      <CotizacionDialog
        abierto={dialogo === 'cotizacion'}
        obra={opcionObra}
        onCerrar={() => setDialogo(null)}
        onGuardada={(c) => {
          setDialogo(null);
          void navegar(rutaCotizacion(c.id));
        }}
      />
      <OrdenCompraDialog
        abierto={dialogo === 'oc'}
        obra={opcionObra}
        onCerrar={() => setDialogo(null)}
        onGuardada={(d) => {
          setDialogo(null);
          void navegar(rutaOrdenCompra(d.ordenCompra.id));
        }}
      />
    </Box>
  );
}
