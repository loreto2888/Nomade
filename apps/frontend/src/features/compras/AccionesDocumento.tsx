import BlockOutlined from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HighlightOffOutlined from '@mui/icons-material/HighlightOffOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { useQueryClient } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';
import {
  claveCompras,
  useAccionDocumento,
  useRecibirOrdenCompra,
  type AccionFlujo,
  type EstadoDocumentoCompra,
} from '@/api/compras';
import { esConflictoVersion, mensajeDeError } from '@/api/errores';
import { useSesion } from '@/app/sesion';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { accionesDeDocumento, NOMBRE_DOCUMENTO, type TipoDocumento } from '@/lib/compras';

interface Documento {
  id: number;
  folio: string;
  version: number;
  estado: EstadoDocumentoCompra;
  creadoPor: { id: number } | null;
  fecha?: string;
}

interface AccionesDocumentoProps {
  tipo: TipoDocumento;
  documento: Documento;
  obraCerrada?: boolean;
  /** Abre el formulario de edición (solo borradores). */
  onEditar?: () => void;
  onAviso: (mensaje: string) => void;
  /** Se eliminó el borrador. */
  onEliminado?: () => void;
  /** Texto adicional de cada confirmación (consecuencias propias del documento). */
  notas?: Partial<Record<AccionFlujo, string>>;
  /** Botones propios del documento (p. ej. «Crear OT»). */
  children?: ReactNode;
  /** Variante para filas de tabla (bandeja): botones pequeños y aviso de D-10 como texto. */
  compacto?: boolean;
}

type Dialogo = AccionFlujo | 'recibir' | null;

const TEXTOS: Record<AccionFlujo, { titulo: string; boton: string; hecho: string }> = {
  enviar: { titulo: 'Enviar a revisión', boton: 'Enviar a revisión', hecho: 'se envió a revisión' },
  aprobar: { titulo: 'Aprobar', boton: 'Aprobar', hecho: 'quedó aprobada' },
  rechazar: { titulo: 'Rechazar', boton: 'Rechazar', hecho: 'se rechazó' },
  eliminar: { titulo: 'Eliminar borrador', boton: 'Eliminar', hecho: 'se eliminó' },
  anular: { titulo: 'Anular', boton: 'Anular', hecho: 'se anuló' },
};

const DESCRIPCION: Record<AccionFlujo, (doc: string) => string> = {
  enviar: (doc) => `${doc} quedará congelada hasta que otra persona la apruebe o la rechace.`,
  aprobar: (doc) => `${doc} quedará aprobada y ya no podrá modificarse.`,
  rechazar: (doc) => `${doc} quedará rechazada. Para corregirla se registra una nueva.`,
  eliminar: (doc) => `Se eliminará el borrador ${doc}. El registro se conserva en la bitácora.`,
  anular: (doc) => `${doc} quedará anulada. Esta acción no se puede deshacer.`,
};

/**
 * Acciones del flujo de un documento de compra según su estado, el rol y quién lo creó: editar,
 * enviar a revisión, aprobar, rechazar (con motivo), anular (con motivo), recibir (OC) y eliminar el
 * borrador. Cada acción pide confirmación; el backend valida de nuevo (incluido D-10).
 */
export function AccionesDocumento({
  tipo,
  documento,
  obraCerrada = false,
  onEditar,
  onAviso,
  onEliminado,
  notas = {},
  children,
  compacto = false,
}: AccionesDocumentoProps) {
  const sesion = useSesion();
  const queryClient = useQueryClient();
  const acciones = accionesDeDocumento(tipo, documento, sesion, obraCerrada);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const mutaciones = {
    enviar: useAccionDocumento(tipo, 'enviar'),
    aprobar: useAccionDocumento(tipo, 'aprobar'),
    rechazar: useAccionDocumento(tipo, 'rechazar'),
    eliminar: useAccionDocumento(tipo, 'eliminar'),
    anular: useAccionDocumento(tipo, 'anular'),
  };

  const cerrar = () => {
    Object.values(mutaciones).forEach((m) => m.reset());
    setDialogo(null);
  };

  const ejecutar = (accion: AccionFlujo, motivo: string | undefined) =>
    mutaciones[accion].mutate(
      { id: documento.id, version: documento.version, motivo },
      {
        onSuccess: () => {
          onAviso(`La ${NOMBRE_DOCUMENTO[tipo]} ${documento.folio} ${TEXTOS[accion].hecho}.`);
          cerrar();
          if (accion === 'eliminar') onEliminado?.();
        },
        onError: (error) => {
          // 409: otra persona cambió el documento; se recargan los datos para ver lo vigente.
          if (esConflictoVersion(error))
            void queryClient.invalidateQueries({ queryKey: claveCompras });
        },
      },
    );

  const doc = `La ${NOMBRE_DOCUMENTO[tipo]} ${documento.folio}`;
  const confirmacion = (accion: AccionFlujo) => {
    const m = mutaciones[accion];
    const motivo = accion === 'rechazar' || accion === 'anular';
    return (
      <ConfirmDialog
        key={accion}
        abierto={dialogo === accion}
        titulo={`${TEXTOS[accion].titulo} ${documento.folio}`}
        descripcion={
          <>
            {DESCRIPCION[accion](accion === 'eliminar' ? documento.folio : doc)}
            {notas[accion] && (
              <Box component="span" sx={{ display: 'block', mt: 1 }}>
                {notas[accion]}
              </Box>
            )}
          </>
        }
        textoConfirmar={TEXTOS[accion].boton}
        peligro={accion === 'rechazar' || accion === 'anular' || accion === 'eliminar'}
        pedirMotivo={accion !== 'enviar'}
        motivoObligatorio={motivo}
        cargando={m.isPending}
        error={m.isError ? mensajeDeError(m.error) : null}
        onConfirmar={(texto) => ejecutar(accion, texto)}
        onCancelar={cerrar}
      />
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          alignItems: 'center',
          '& .MuiButton-root': compacto ? { py: 0.25, px: 1, fontSize: 12 } : {},
        }}
      >
        {acciones.enviar && (
          <Button
            variant="contained"
            startIcon={<SendOutlined />}
            onClick={() => setDialogo('enviar')}
          >
            Enviar a revisión
          </Button>
        )}
        {acciones.aprobar && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleOutlined />}
            onClick={() => setDialogo('aprobar')}
          >
            Aprobar
          </Button>
        )}
        {acciones.rechazar && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<HighlightOffOutlined />}
            onClick={() => setDialogo('rechazar')}
          >
            Rechazar
          </Button>
        )}
        {acciones.recibir && (
          <Button
            variant="contained"
            startIcon={<Inventory2Outlined />}
            onClick={() => setDialogo('recibir')}
          >
            Registrar recepción
          </Button>
        )}
        {acciones.editar && onEditar && (
          <Button variant="outlined" startIcon={<EditOutlined />} onClick={onEditar}>
            Editar
          </Button>
        )}
        {children}
        {acciones.anular && (
          <Button color="error" startIcon={<BlockOutlined />} onClick={() => setDialogo('anular')}>
            Anular
          </Button>
        )}
        {acciones.eliminar && (
          <Button
            color="error"
            startIcon={<DeleteOutlined />}
            onClick={() => setDialogo('eliminar')}
          >
            Eliminar borrador
          </Button>
        )}
      </Box>

      {acciones.bloqueoAprobacion &&
        (compacto ? (
          <Box
            component="span"
            sx={{ display: 'block', fontSize: 12, color: 'text.secondary', mt: 0.5 }}
          >
            Debe aprobarla otra persona (la creaste tú).
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            {acciones.bloqueoAprobacion}
          </Alert>
        ))}

      {(['enviar', 'aprobar', 'rechazar', 'anular', 'eliminar'] as const).map(confirmacion)}

      {tipo === 'orden_compra' && (
        <RecibirDialog
          abierto={dialogo === 'recibir'}
          documento={documento}
          onCerrar={() => setDialogo(null)}
          onRecibida={() => {
            onAviso(`Se registró la recepción de la OC ${documento.folio}.`);
            setDialogo(null);
          }}
        />
      )}
    </Box>
  );
}

function hoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

function RecibirDialog({
  abierto,
  documento,
  onCerrar,
  onRecibida,
}: {
  abierto: boolean;
  documento: Documento;
  onCerrar: () => void;
  onRecibida: () => void;
}) {
  const idTitulo = useId();
  const recibir = useRecibirOrdenCompra();
  const [fecha, setFecha] = useState(hoyChile);
  const [observacion, setObservacion] = useState('');

  return (
    <Dialog
      open={abierto}
      onClose={recibir.isPending ? undefined : onCerrar}
      aria-labelledby={idTitulo}
      fullWidth
      maxWidth="xs"
      slotProps={{
        transition: {
          onExited: () => {
            recibir.reset();
            setFecha(hoyChile());
            setObservacion('');
          },
        },
      }}
    >
      <DialogTitle id={idTitulo}>Recepción de la OC {documento.folio}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Registra la recepción conforme (total) de lo ordenado. El compromiso se mantiene hasta que
          llegue la factura.
        </DialogContentText>
        <TextField
          label="Fecha de recepción"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          fullWidth
          margin="dense"
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { max: hoyChile(), min: documento.fecha },
          }}
        />
        <TextField
          label="Observación (opcional)"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          fullWidth
          margin="dense"
          multiline
          minRows={2}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
        {recibir.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {mensajeDeError(recibir.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} color="inherit" disabled={recibir.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={recibir.isPending || fecha === ''}
          onClick={() =>
            recibir.mutate(
              {
                id: documento.id,
                version: documento.version,
                fechaRecepcion: fecha,
                observacion: observacion.trim() || null,
              },
              { onSuccess: onRecibida },
            )
          }
        >
          Registrar recepción
        </Button>
      </DialogActions>
    </Dialog>
  );
}
