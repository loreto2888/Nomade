import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { useId, useState } from 'react';
import { mensajeDeError } from '@/api/errores';
import {
  useCuentasBancarias,
  useEliminarCuentaBancaria,
  type CuentaBancariaDto,
  type ProveedorDto,
} from '@/api/proveedores';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatearRut } from '@/lib/rut';
import { FormularioCuentaBancaria } from './FormularioCuentaBancaria';
import { TIPOS_CUENTA } from './esquemas';

interface CuentasBancariasDialogProps {
  abierto: boolean;
  proveedor: ProveedorDto | null;
  onCerrar: () => void;
}

const etiquetaTipo = (tipo: string) => TIPOS_CUENTA.find((t) => t.valor === tipo)?.etiqueta ?? tipo;

/**
 * Datos bancarios de un proveedor. Solo el administrador debe abrirlo (el backend responde 403 a
 * los demás); cada consulta y cada cambio queda registrado en la bitácora (D-17, §13).
 */
export function CuentasBancariasDialog({
  abierto,
  proveedor,
  onCerrar,
}: CuentasBancariasDialogProps) {
  const idTitulo = useId();
  const proveedorId = proveedor?.id;
  const consulta = useCuentasBancarias(proveedorId, abierto);
  const eliminar = useEliminarCuentaBancaria(proveedorId ?? 0);
  const [formulario, setFormulario] = useState<{ cuenta?: CuentaBancariaDto } | null>(null);
  const [aEliminar, setAEliminar] = useState<CuentaBancariaDto | null>(null);
  const cuentas = consulta.data ?? [];

  const cerrarEliminar = () => {
    eliminar.reset();
    setAEliminar(null);
  };

  return (
    <>
      <Dialog open={abierto} onClose={onCerrar} aria-labelledby={idTitulo} fullWidth maxWidth="md">
        <DialogTitle id={idTitulo}>Datos bancarios · {proveedor?.razonSocial}</DialogTitle>
        <DialogContent>
          <Alert severity="info" icon={<LockOutlined fontSize="inherit" />} sx={{ mb: 2 }}>
            Datos sensibles: solo los administradores pueden verlos y modificarlos. Cada consulta y
            cada cambio queda registrado en la bitácora de auditoría.
          </Alert>

          {consulta.isPending && (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
              <CircularProgress size={28} aria-label="Cargando cuentas" />
            </Box>
          )}
          {consulta.isError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void consulta.refetch()}>
                  Reintentar
                </Button>
              }
            >
              {mensajeDeError(consulta.error)}
            </Alert>
          )}
          {consulta.isSuccess && cuentas.length === 0 && (
            <Alert severity="warning">
              Este proveedor aún no tiene cuentas bancarias registradas.
            </Alert>
          )}

          {cuentas.length > 0 && (
            <List disablePadding aria-label="Cuentas bancarias">
              {cuentas.map((cuenta) => (
                <ListItem
                  key={cuenta.id}
                  divider
                  disableGutters
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        aria-label={`Editar cuenta ${cuenta.numeroCuenta}`}
                        onClick={() => setFormulario({ cuenta })}
                      >
                        <EditOutlined fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label={`Eliminar cuenta ${cuenta.numeroCuenta}`}
                        onClick={() => setAEliminar(cuenta)}
                      >
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    sx={{ pr: 10 }}
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <strong>{cuenta.banco}</strong>
                        <span>
                          {etiquetaTipo(cuenta.tipoCuenta)} · {cuenta.numeroCuenta}
                        </span>
                        {cuenta.principal && (
                          <Chip size="small" color="primary" label="Principal" />
                        )}
                      </Box>
                    }
                    secondary={`${cuenta.titular} · RUT ${formatearRut(cuenta.titularRut)}${cuenta.correoNotificacion ? ` · ${cuenta.correoNotificacion}` : ''}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            startIcon={<AddOutlined />}
            onClick={() => setFormulario({})}
            disabled={proveedorId === undefined}
          >
            Agregar cuenta
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={onCerrar} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {proveedorId !== undefined && (
        <FormularioCuentaBancaria
          abierto={formulario !== null}
          proveedorId={proveedorId}
          cuenta={formulario?.cuenta}
          onCerrar={() => setFormulario(null)}
          onGuardada={() => setFormulario(null)}
          onConflicto={() => {
            setFormulario(null);
            void consulta.refetch();
          }}
        />
      )}

      <ConfirmDialog
        abierto={aEliminar !== null}
        titulo="Eliminar cuenta bancaria"
        descripcion={`Se eliminará la cuenta ${aEliminar?.numeroCuenta ?? ''} de ${aEliminar?.banco ?? ''}. Si era la principal, la siguiente pasará a serlo.`}
        textoConfirmar="Eliminar"
        peligro
        pedirMotivo
        cargando={eliminar.isPending}
        error={eliminar.isError ? mensajeDeError(eliminar.error) : null}
        onConfirmar={(motivo) => {
          if (!aEliminar) return;
          eliminar.mutate(
            { cuentaId: aEliminar.id, version: aEliminar.version, motivo },
            { onSuccess: cerrarEliminar },
          );
        }}
        onCancelar={cerrarEliminar}
      />
    </>
  );
}
