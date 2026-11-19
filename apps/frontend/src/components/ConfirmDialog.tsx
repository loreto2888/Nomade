import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { useId, useState, type ReactNode } from 'react';

interface ConfirmDialogProps {
  abierto: boolean;
  titulo: string;
  descripcion: ReactNode;
  textoConfirmar?: string;
  /** Pide un motivo (queda en la bitácora). */
  pedirMotivo?: boolean;
  /** El motivo es obligatorio (por ejemplo, al rechazar). */
  motivoObligatorio?: boolean;
  /** Estilo destructivo del botón de confirmación. */
  peligro?: boolean;
  cargando?: boolean;
  error?: string | null;
  onConfirmar: (motivo: string | undefined) => void;
  onCancelar: () => void;
}

/** Diálogo de confirmación, con motivo opcional u obligatorio. */
export function ConfirmDialog({
  abierto,
  titulo,
  descripcion,
  textoConfirmar = 'Confirmar',
  pedirMotivo = false,
  motivoObligatorio = false,
  peligro = false,
  cargando = false,
  error = null,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const idTitulo = useId();
  const [motivo, setMotivo] = useState('');
  const motivoLimpio = motivo.trim();
  const faltaMotivo = motivoObligatorio && motivoLimpio.length === 0;

  return (
    <Dialog
      open={abierto}
      onClose={cargando ? undefined : onCancelar}
      aria-labelledby={idTitulo}
      fullWidth
      maxWidth="xs"
      slotProps={{ transition: { onExited: () => setMotivo('') } }}
    >
      <DialogTitle id={idTitulo}>{titulo}</DialogTitle>
      <DialogContent>
        <DialogContentText component="div">{descripcion}</DialogContentText>
        {pedirMotivo && (
          <TextField
            label={motivoObligatorio ? 'Motivo' : 'Motivo (opcional)'}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            margin="normal"
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancelar} disabled={cargando} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          color={peligro ? 'error' : 'primary'}
          disabled={cargando || faltaMotivo}
          onClick={() => onConfirmar(motivoLimpio || undefined)}
        >
          {textoConfirmar}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
