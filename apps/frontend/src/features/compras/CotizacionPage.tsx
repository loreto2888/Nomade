import AddOutlined from '@mui/icons-material/AddOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import { useState } from 'react';
import { Link as EnlaceRouter, useNavigate } from 'react-router';
import { useCotizacion, type CotizacionDto } from '@/api/compras';
import { AttachmentUploader } from '@/components/AttachmentUploader';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { StatusChip } from '@/components/StatusChip';
import { ETIQUETA_ESTADO_COMPRA } from '@/lib/compras';
import { formatCLP, formatearFecha } from '@/lib/formato';
import { formatearRut } from '@/lib/rut';
import { AccionesDocumento } from './AccionesDocumento';
import { CotizacionDialog } from './CotizacionDialog';
import { EstadoConsulta } from './EstadoConsulta';
import { useIdRuta } from './useIdRuta';
import { OrdenTrabajoDialog } from './OrdenTrabajoDialog';
import { Dato, Seccion, Trazabilidad } from './Presentacion';
import { rejilla } from './rutas';
import { rutaOrdenTrabajo } from './rutas';

/** Ficha de una cotización: datos, flujo de aprobación, OT que originó y adjuntos. */
export function CotizacionPage() {
  const id = useIdRuta();
  const consulta = useCotizacion(id);
  return (
    <EstadoConsulta
      id={id}
      consulta={consulta}
      noExiste="La cotización no existe o fue eliminada."
      volver={{ ruta: '/ordenes-trabajo?pestana=cotizaciones', texto: 'Volver a cotizaciones' }}
    >
      {(c) => <FichaCotizacion cotizacion={c} />}
    </EstadoConsulta>
  );
}

function FichaCotizacion({ cotizacion: c }: { cotizacion: CotizacionDto }) {
  const navegar = useNavigate();
  const [dialogo, setDialogo] = useState<'editar' | 'ot' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const puedeCrearOt = c.estado === 'aprobada' && c.ordenTrabajo === null && !c.obra.cerrada;

  return (
    <>
      <CabeceraPagina
        eyebrow="Compras y gastos"
        titulo={`Cotización ${c.folio}`}
        descripcion={`${c.proveedor.razonSocial} · ${c.obra.nombre}`}
        acciones={<StatusChip estado={c.estado} etiqueta={ETIQUETA_ESTADO_COMPRA[c.estado]} />}
      />
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {c.obra.cerrada && (
          <Alert severity="info">La obra está cerrada: la cotización es de solo lectura.</Alert>
        )}
        <AccionesDocumento
          tipo="cotizacion"
          documento={c}
          obraCerrada={c.obra.cerrada}
          onEditar={() => setDialogo('editar')}
          onAviso={setAviso}
          onEliminado={() => void navegar('/ordenes-trabajo?pestana=cotizaciones')}
          notas={{ aprobar: 'Una cotización aprobada habilita crear la orden de trabajo.' }}
        >
          {puedeCrearOt && (
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={() => setDialogo('ot')}
            >
              Crear orden de trabajo
            </Button>
          )}
          {c.ordenTrabajo && (
            <Button
              variant="outlined"
              component={EnlaceRouter}
              to={rutaOrdenTrabajo(c.ordenTrabajo.id)}
            >
              Ver {c.ordenTrabajo.folio}
            </Button>
          )}
        </AccionesDocumento>

        <Seccion titulo="Datos de la cotización">
          <Box sx={rejilla}>
            <Dato etiqueta="Obra">
              <Link component={EnlaceRouter} to={`/obras/${c.obra.id}`}>
                {c.obra.nombre}
              </Link>
              <Box
                component="span"
                sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
              >
                {c.obra.codigoCentroCosto}
              </Box>
            </Dato>
            <Dato etiqueta="Proveedor">
              {c.proveedor.razonSocial}
              <Box
                component="span"
                sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
              >
                RUT {formatearRut(c.proveedor.rut)}
              </Box>
            </Dato>
            <Dato etiqueta="Monto neto">{formatCLP(c.montoNeto)}</Dato>
            <Dato etiqueta="Fecha">{formatearFecha(c.fecha)}</Dato>
            <Dato etiqueta="Válida hasta">{formatearFecha(c.validezHasta)}</Dato>
            <Dato etiqueta="Referencia del proveedor">{c.referenciaProveedor ?? '—'}</Dato>
            <Dato etiqueta="Categoría de gasto">{c.categoria.nombre}</Dato>
            <Dato etiqueta="Orden de trabajo">{c.ordenTrabajo?.folio ?? '—'}</Dato>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Dato etiqueta="Descripción / alcance">{c.descripcion}</Dato>
          </Box>
        </Seccion>

        <Trazabilidad documento={c} />

        <Seccion titulo="Adjuntos">
          <AttachmentUploader
            entidadTipo="cotizacion"
            entidadId={c.id}
            titulo="Cotización del proveedor y respaldos"
            soloLectura={c.obra.cerrada}
          />
        </Seccion>
      </Box>

      <CotizacionDialog
        abierto={dialogo === 'editar'}
        cotizacion={c}
        onCerrar={() => setDialogo(null)}
        onGuardada={() => {
          setDialogo(null);
          setAviso('Se guardó la cotización.');
        }}
      />
      <OrdenTrabajoDialog
        abierto={dialogo === 'ot'}
        cotizacion={c}
        onCerrar={() => setDialogo(null)}
        onGuardada={(ot) => {
          setDialogo(null);
          void navegar(rutaOrdenTrabajo(ot.id));
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
