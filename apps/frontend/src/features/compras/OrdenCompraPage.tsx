import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as EnlaceRouter, useNavigate } from 'react-router';
import { useOrdenCompra, type OrdenCompraDetalleDto } from '@/api/compras';
import { AttachmentUploader } from '@/components/AttachmentUploader';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { StatusChip } from '@/components/StatusChip';
import { ETIQUETA_ESTADO_COMPRA, ETIQUETA_TIPO_OC, formatearPorcentaje } from '@/lib/compras';
import { formatCLP, formatearFecha, formatearFechaHora } from '@/lib/formato';
import { formatearCantidad } from '@/lib/presupuesto';
import { AccionesDocumento } from './AccionesDocumento';
import { EstadoConsulta } from './EstadoConsulta';
import { useIdRuta } from './useIdRuta';
import { OrdenCompraDialog } from './OrdenCompraDialog';
import { Dato, Seccion, Trazabilidad } from './Presentacion';
import { rejilla } from './rutas';
import { rutaOrdenTrabajo } from './rutas';

/** Ficha de una orden de compra: montos, líneas o hito de la OT, recepción, libro de movimientos. */
export function OrdenCompraPage() {
  const id = useIdRuta();
  const consulta = useOrdenCompra(id);
  return (
    <EstadoConsulta
      id={id}
      consulta={consulta}
      noExiste="La orden de compra no existe o fue eliminada."
      volver={{ ruta: '/ordenes-compra', texto: 'Volver a órdenes de compra' }}
    >
      {(d) => <FichaOrdenCompra detalle={d} />}
    </EstadoConsulta>
  );
}

function FichaOrdenCompra({ detalle }: { detalle: OrdenCompraDetalleDto }) {
  const navegar = useNavigate();
  const { ordenCompra: oc, movimientos } = detalle;
  const [editar, setEditar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <>
      <CabeceraPagina
        eyebrow="Compras y gastos"
        titulo={`Orden de compra ${oc.folio}`}
        descripcion={`${oc.proveedor.razonSocial} · ${oc.obra.nombre}`}
        acciones={<StatusChip estado={oc.estado} etiqueta={ETIQUETA_ESTADO_COMPRA[oc.estado]} />}
      />
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {oc.obra.cerrada && (
          <Alert severity="info">La obra está cerrada: la OC es de solo lectura.</Alert>
        )}
        <AccionesDocumento
          tipo="orden_compra"
          documento={oc}
          obraCerrada={oc.obra.cerrada}
          onEditar={() => setEditar(true)}
          onAviso={setAviso}
          onEliminado={() => void navegar('/ordenes-compra')}
          notas={{
            aprobar: `Se registrará un compromiso de ${formatCLP(oc.montoNeto)} (neto) en el libro de movimientos de la obra.`,
            anular:
              'Se registrará la reversa del compromiso y, si es parcial, se liberará el saldo de la OT.',
          }}
        />

        <Seccion titulo="Datos de la orden de compra">
          <Box sx={rejilla}>
            <Dato etiqueta="Tipo">{ETIQUETA_TIPO_OC[oc.tipo]}</Dato>
            <Dato etiqueta="Obra">
              <Link component={EnlaceRouter} to={`/obras/${oc.obra.id}`}>
                {oc.obra.nombre}
              </Link>
            </Dato>
            <Dato etiqueta="Proveedor">{oc.proveedor.razonSocial}</Dato>
            {oc.ordenTrabajo && (
              <Dato etiqueta="Orden de trabajo">
                <Link component={EnlaceRouter} to={rutaOrdenTrabajo(oc.ordenTrabajo.id)}>
                  {oc.ordenTrabajo.folio}
                </Link>
              </Dato>
            )}
            {oc.hito && (
              <Dato etiqueta="Hito">
                {oc.hito.numero}. {oc.hito.descripcion} ({formatearPorcentaje(oc.hito.porcentaje)})
              </Dato>
            )}
            {oc.porcentaje !== null && (
              <Dato etiqueta="Porcentaje de la OT">{formatearPorcentaje(oc.porcentaje)}</Dato>
            )}
            <Dato etiqueta="Fecha">{formatearFecha(oc.fecha)}</Dato>
            <Dato etiqueta="Entrega">{formatearFecha(oc.fechaEntrega)}</Dato>
            <Dato etiqueta="Categoría de gasto">{oc.categoria.nombre}</Dato>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Dato etiqueta="Descripción">{oc.descripcion}</Dato>
          </Box>
          <Box
            sx={{
              mt: 2.5,
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
            aria-label="Montos de la OC"
            role="group"
          >
            <Dato etiqueta="Neto">{formatCLP(oc.montoNeto)}</Dato>
            <Dato
              etiqueta={oc.afectaIva ? `IVA (${formatearPorcentaje(oc.tasaIva)})` : 'IVA (exenta)'}
            >
              {formatCLP(oc.montoIva)}
            </Dato>
            <Dato etiqueta="Total">
              <strong>{formatCLP(oc.montoTotal)}</strong>
            </Dato>
          </Box>
        </Seccion>

        {oc.tipo === 'materiales' && (
          <Seccion titulo="Líneas">
            {oc.lineas.length === 0 ? (
              <Alert severity="info">La OC aún no tiene líneas. Edítala para agregarlas.</Alert>
            ) : (
              <TableContainer>
                <Table size="small" aria-label="Líneas de la OC">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ítem</TableCell>
                      <TableCell>Unidad</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Precio unitario</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {oc.lineas.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.descripcion}</TableCell>
                        <TableCell>{l.unidad}</TableCell>
                        <TableCell align="right">{formatearCantidad(l.cantidad)}</TableCell>
                        <TableCell align="right">
                          {`$ ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(l.precioUnitario)}`}
                        </TableCell>
                        <TableCell align="right">{formatCLP(l.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        Neto
                      </TableCell>
                      <TableCell align="right">{formatCLP(oc.montoNeto)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            )}
          </Seccion>
        )}

        {oc.fechaRecepcion && (
          <Seccion titulo="Recepción">
            <Box sx={rejilla}>
              <Dato etiqueta="Fecha de recepción">{formatearFecha(oc.fechaRecepcion)}</Dato>
              <Dato etiqueta="Registrada por">
                {oc.recibidoPor?.nombre ?? '—'}
                <Box
                  component="span"
                  sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
                >
                  {formatearFechaHora(oc.recibidoEn)}
                </Box>
              </Dato>
              <Dato etiqueta="Observación">{oc.observacionRecepcion ?? '—'}</Dato>
            </Box>
          </Seccion>
        )}

        <Seccion titulo="Libro de movimientos">
          {movimientos.length === 0 ? (
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              Sin movimientos: el compromiso se registra al aprobar la OC.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small" aria-label="Movimientos de la OC">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Movimiento</TableCell>
                    <TableCell align="right">Monto (CLP)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatearFecha(m.fecha)}</TableCell>
                      <TableCell>{m.descripcion}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: m.montoClp < 0 ? 'error.main' : undefined }}
                      >
                        {m.montoClp < 0 ? `− ${formatCLP(-m.montoClp)}` : formatCLP(m.montoClp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Seccion>

        <Trazabilidad documento={oc} />

        <Seccion titulo="Adjuntos">
          <AttachmentUploader
            entidadTipo="orden_compra"
            entidadId={oc.id}
            titulo="Guías de despacho y respaldos"
            soloLectura={oc.obra.cerrada}
          />
        </Seccion>
      </Box>

      <OrdenCompraDialog
        abierto={editar}
        ordenCompra={oc}
        onCerrar={() => setEditar(false)}
        onGuardada={() => {
          setEditar(false);
          setAviso('Se guardó la orden de compra.');
        }}
      />
      <Snackbar
        open={aviso !== null}
        autoHideDuration={5000}
        onClose={() => setAviso(null)}
        message={aviso ?? ''}
      />
    </>
  );
}
