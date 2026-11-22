import AddOutlined from '@mui/icons-material/AddOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useState } from 'react';
import { Link as EnlaceRouter, useNavigate } from 'react-router';
import { useOrdenTrabajo, type OrdenTrabajoDto } from '@/api/compras';
import { AttachmentUploader } from '@/components/AttachmentUploader';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { StatusChip } from '@/components/StatusChip';
import { ETIQUETA_ESTADO_COMPRA, formatearPorcentaje } from '@/lib/compras';
import { formatCLP, formatearFecha } from '@/lib/formato';
import { AccionesDocumento } from './AccionesDocumento';
import { EstadoConsulta } from './EstadoConsulta';
import { useIdRuta } from './useIdRuta';
import { OrdenCompraDialog } from './OrdenCompraDialog';
import { OrdenTrabajoDialog } from './OrdenTrabajoDialog';
import { Dato, Seccion, Trazabilidad } from './Presentacion';
import { rejilla } from './rutas';
import { TablaOrdenesCompra } from './TablasCompras';
import { rutaCotizacion, rutaOrdenCompra } from './rutas';

/** Ficha de una orden de trabajo: hitos con su avance de órdenes, OC parciales y adjuntos. */
export function OrdenTrabajoPage() {
  const id = useIdRuta();
  const consulta = useOrdenTrabajo(id);
  return (
    <EstadoConsulta
      id={id}
      consulta={consulta}
      noExiste="La orden de trabajo no existe o fue eliminada."
      volver={{ ruta: '/ordenes-trabajo', texto: 'Volver a órdenes de trabajo' }}
    >
      {(ot) => <FichaOrdenTrabajo ot={ot} />}
    </EstadoConsulta>
  );
}

function FichaOrdenTrabajo({ ot }: { ot: OrdenTrabajoDto }) {
  const navegar = useNavigate();
  const [dialogo, setDialogo] = useState<'editar' | 'oc' | null>(null);
  const [hitoOc, setHitoOc] = useState<number | undefined>(undefined);
  const [aviso, setAviso] = useState<string | null>(null);
  const admiteOc = ot.estado === 'aprobada' && ot.saldo > 0 && !ot.obra.cerrada;
  const sumaHitos = ot.hitos.reduce((s, h) => s + Math.round(h.porcentaje * 100), 0) / 100;

  const nuevaOc = (hitoId?: number) => {
    setHitoOc(hitoId);
    setDialogo('oc');
  };

  return (
    <>
      <CabeceraPagina
        eyebrow="Compras y gastos"
        titulo={`Orden de trabajo ${ot.folio}`}
        descripcion={`${ot.proveedor.razonSocial} · ${ot.obra.nombre}`}
        acciones={<StatusChip estado={ot.estado} etiqueta={ETIQUETA_ESTADO_COMPRA[ot.estado]} />}
      />
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {ot.obra.cerrada && (
          <Alert severity="info">La obra está cerrada: la OT es de solo lectura.</Alert>
        )}
        <AccionesDocumento
          tipo="orden_trabajo"
          documento={ot}
          obraCerrada={ot.obra.cerrada}
          onEditar={() => setDialogo('editar')}
          onAviso={setAviso}
          onEliminado={() => void navegar('/ordenes-trabajo')}
          notas={{
            enviar:
              sumaHitos === 100
                ? undefined
                : `Los hitos suman ${formatearPorcentaje(sumaHitos)}: deben sumar 100 %.`,
            aprobar:
              'Una OT aprobada admite órdenes de compra parciales hasta su saldo. Sus hitos ya no se podrán cambiar.',
            anular:
              'Solo se puede anular si no tiene OC vigentes. La cotización queda libre para otra OT.',
          }}
        >
          {admiteOc && (
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => nuevaOc()}>
              Nueva OC parcial
            </Button>
          )}
        </AccionesDocumento>

        <Seccion titulo="Datos de la orden de trabajo">
          <Box sx={rejilla}>
            <Dato etiqueta="Obra">
              <Link component={EnlaceRouter} to={`/obras/${ot.obra.id}`}>
                {ot.obra.nombre}
              </Link>
            </Dato>
            <Dato etiqueta="Contratista">{ot.proveedor.razonSocial}</Dato>
            <Dato etiqueta="Cotización">
              <Link component={EnlaceRouter} to={rutaCotizacion(ot.cotizacion.id)}>
                {ot.cotizacion.folio}
              </Link>
            </Dato>
            <Dato etiqueta="Monto contratado (neto)">{formatCLP(ot.montoNeto)}</Dato>
            <Dato etiqueta="Ordenado">
              {formatCLP(ot.montoOrdenado)} ({formatearPorcentaje(ot.porcentajeOrdenado)})
            </Dato>
            <Dato etiqueta="Saldo por ordenar">{formatCLP(ot.saldo)}</Dato>
            <Dato etiqueta="Inicio">{formatearFecha(ot.fechaInicio)}</Dato>
            <Dato etiqueta="Término">{formatearFecha(ot.fechaTermino)}</Dato>
            <Dato etiqueta="Categoría de gasto">{ot.categoria.nombre}</Dato>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Dato etiqueta="Alcance">{ot.descripcion}</Dato>
          </Box>
        </Seccion>

        <Seccion titulo="Hitos de pago">
          {ot.hitos.length === 0 ? (
            <Alert severity="info">
              La OT aún no tiene hitos. Edítala para definirlos (deben sumar 100 %).
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small" aria-label="Hitos de la OT">
                <TableHead>
                  <TableRow>
                    <TableCell>Hito</TableCell>
                    <TableCell align="right">%</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>Ordenado</TableCell>
                    <TableCell align="right">Disponible</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ot.hitos.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        {h.numero}. {h.descripcion}
                        {h.fechaEstimada && (
                          <Box
                            component="span"
                            sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
                          >
                            Estimado: {formatearFecha(h.fechaEstimada)}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right">{formatearPorcentaje(h.porcentaje)}</TableCell>
                      <TableCell align="right">{formatCLP(h.montoNeto)}</TableCell>
                      <TableCell>
                        <LinearProgress
                          variant="determinate"
                          value={
                            h.porcentaje > 0
                              ? Math.min(100, (h.porcentajeOrdenado / h.porcentaje) * 100)
                              : 0
                          }
                          aria-label={`Ordenado del hito ${h.numero}`}
                        />
                        <Box component="span" sx={{ fontSize: 12 }}>
                          {formatearPorcentaje(h.porcentajeOrdenado)} · {formatCLP(h.montoOrdenado)}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {formatearPorcentaje(h.porcentajeDisponible)}
                        <Box
                          component="span"
                          sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
                        >
                          {formatCLP(h.montoDisponible)}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {admiteOc && h.porcentajeDisponible > 0 && (
                          <Button size="small" onClick={() => nuevaOc(h.id)}>
                            Ordenar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Seccion>

        {ot.estado !== 'borrador' && (
          <Seccion titulo="Órdenes de compra parciales">
            <TablaOrdenesCompra
              filtros={{ ordenTrabajoId: ot.id }}
              sinObra
              etiqueta="OC de la OT"
              vacio="Aún no hay órdenes de compra de esta OT."
            />
          </Seccion>
        )}

        <Trazabilidad documento={ot} />

        <Seccion titulo="Adjuntos">
          <AttachmentUploader
            entidadTipo="orden_trabajo"
            entidadId={ot.id}
            titulo="Contrato y respaldos"
            soloLectura={ot.obra.cerrada}
          />
        </Seccion>
      </Box>

      <OrdenTrabajoDialog
        abierto={dialogo === 'editar'}
        ordenTrabajo={ot}
        onCerrar={() => setDialogo(null)}
        onGuardada={() => {
          setDialogo(null);
          setAviso('Se guardó la orden de trabajo.');
        }}
      />
      <OrdenCompraDialog
        abierto={dialogo === 'oc'}
        tipoInicial="parcial_ot"
        ordenTrabajoId={ot.id}
        hitoId={hitoOc}
        onCerrar={() => setDialogo(null)}
        onGuardada={(d) => {
          setDialogo(null);
          void navegar(rutaOrdenCompra(d.ordenCompra.id));
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
