import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';

interface ClaveTemporalDialogProps {
  abierto: boolean;
  nombre: string;
  clave: string;
  onCerrar: () => void;
}

/** Muestra una sola vez la contraseña temporal generada (alta de usuario o restablecimiento). */
export function ClaveTemporalDialog({
  abierto,
  nombre,
  clave,
  onCerrar,
}: ClaveTemporalDialogProps) {
  const idTitulo = useId();
  const [copiada, setCopiada] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(clave);
      setCopiada(true);
    } catch {
      setCopiada(false);
    }
  };

  return (
    <Dialog
      open={abierto}
      onClose={onCerrar}
      aria-labelledby={idTitulo}
      fullWidth
      maxWidth="xs"
      slotProps={{ transition: { onExited: () => setCopiada(false) } }}
    >
      <DialogTitle id={idTitulo}>Contraseña temporal</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography sx={{ fontSize: 14 }}>
          Entrega esta contraseña a <strong>{nombre}</strong> por un canal seguro. Deberá cambiarla
          al ingresar.
        </Typography>
        <TextField
          label="Contraseña temporal"
          value={clave}
          fullWidth
          slotProps={{
            input: {
              readOnly: true,
              sx: {
                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                letterSpacing: '0.04em',
              },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Copiar contraseña"
                    edge="end"
                    onClick={() => void copiar()}
                  >
                    <ContentCopyOutlined fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        {copiada && (
          <Typography role="status" sx={{ fontSize: 12, color: 'success.main' }}>
            Contraseña copiada al portapapeles.
          </Typography>
        )}
        <Alert severity="warning" variant="outlined">
          Solo se muestra esta vez: no se puede volver a consultar.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onCerrar}>
          Listo
        </Button>
      </DialogActions>
    </Dialog>
  );
}
