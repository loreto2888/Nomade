import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useId } from 'react';

export interface DiferenciaConflicto {
  campo: string;
  /** Lo que la persona escribió. */
  tuValor: string;
  /** Lo que hay hoy en el servidor. */
  valorActual: string;
}

interface ConflictDialogProps {
  abierto: boolean;
  /** Qué se estaba editando: «la obra», «el proveedor»… (con artículo). */
  entidad: string;
  /** Campos en que difieren los datos de la persona y los del servidor, si se pudieron comparar. */
  diferencias?: DiferenciaConflicto[];
  /** Descarta lo escrito y carga los datos vigentes. */
  onUsarActual: () => void;
  /** Conserva lo escrito sobre la versión vigente (sobrescribe el cambio ajeno). Opcional. */
  onConservarMios?: () => void;
  /** Cierra sin decidir (sigue en el formulario). */
  onCerrar: () => void;
  cargando?: boolean;
}

/**
 * Aviso de conflicto de versión (409): otra persona modificó el registro mientras se editaba.
 * Permite comparar y elegir entre los datos vigentes o los propios (plan §10.2, P31).
 */
export function ConflictDialog({
  abierto,
  entidad,
  diferencias,
  onUsarActual,
  onConservarMios,
  onCerrar,
  cargando = false,
}: ConflictDialogProps) {
  const idTitulo = useId();
  return (
    <Dialog
      open={abierto}
      onClose={cargando ? undefined : onCerrar}
      aria-labelledby={idTitulo}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id={idTitulo}>Otra persona modificó {entidad}</DialogTitle>
      <DialogContent>
        <DialogContentText component="div">
          Mientras editabas, alguien guardó cambios. Elige con qué datos quedarte: nada se guarda
          hasta que lo confirmes.
        </DialogContentText>
        {diferencias && diferencias.length > 0 ? (
          <Table
            size="small"
            sx={{ mt: 2 }}
            aria-label="Diferencias entre tus datos y los vigentes"
          >
            <TableHead>
              <TableRow>
                <TableCell>Campo</TableCell>
                <TableCell>Tu valor</TableCell>
                <TableCell>Valor vigente</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {diferencias.map((d) => (
                <TableRow key={d.campo}>
                  <TableCell component="th" scope="row">
                    {d.campo}
                  </TableCell>
                  <TableCell>{d.tuValor}</TableCell>
                  <TableCell>{d.valorActual}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          diferencias && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Los campos que editaste no cambiaron en el servidor; la otra persona modificó otros
              datos.
            </Alert>
          )
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onCerrar} color="inherit" disabled={cargando}>
          Seguir editando
        </Button>
        {onConservarMios && (
          <Button onClick={onConservarMios} color="warning" disabled={cargando}>
            Conservar mis cambios
          </Button>
        )}
        <Button onClick={onUsarActual} variant="contained" disabled={cargando}>
          Usar los datos vigentes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
