import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useId } from 'react';
import type { EntidadAdjuntable } from '@/api/adjuntos';
import { AttachmentUploader } from './AttachmentUploader';

interface AdjuntosDialogProps {
  abierto: boolean;
  entidadTipo: EntidadAdjuntable;
  entidadId: number | null;
  /** Nombre del registro, para el título. */
  nombre: string;
  onCerrar: () => void;
}

/** Adjuntos de un registro (proveedor, cliente…) en un diálogo. */
export function AdjuntosDialog({
  abierto,
  entidadTipo,
  entidadId,
  nombre,
  onCerrar,
}: AdjuntosDialogProps) {
  const idTitulo = useId();
  return (
    <Dialog open={abierto} onClose={onCerrar} aria-labelledby={idTitulo} fullWidth maxWidth="sm">
      <DialogTitle id={idTitulo}>Adjuntos · {nombre}</DialogTitle>
      <DialogContent>
        {entidadId !== null && (
          <AttachmentUploader entidadTipo={entidadTipo} entidadId={entidadId} titulo="Archivos" />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
