import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import HighlightOffOutlined from '@mui/icons-material/HighlightOffOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { esConflictoVersion, mensajeDeError } from '@/api/errores';
import type { PresupuestoVersionDto } from '@/api/generated';
import {
  clavePresupuestos,
  urlExportarPresupuesto,
  useActualizarPresupuesto,
  useAprobarPresupuesto,
  useCrearPresupuesto,
  useEliminarPresupuesto,
  useEnviarPresupuestoARevision,
  useRechazarPresupuesto,
} from '@/api/presupuestos';
import { useSesion } from '@/app/sesion';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { accionesDeVersion } from '@/lib/presupuesto';

type Dialogo = 'enviar' | 'aprobar' | 'rechazar' | 'eliminar' | 'descripcion' | null;

interface AccionesFlujoProps {
  version: PresupuestoVersionDto;
  obraId: number;
  obraCerrada: boolean;
  onAviso: (mensaje: string) => void;
  /** Se creó una versión nueva (copia de esta): el padre la selecciona. */
  onCopiada: (nueva: PresupuestoVersionDto) => void;
  /** Se eliminó el borrador. */
  onEliminada: () => void;
}

/**
 * Acciones del flujo de una versión según su estado, el rol y quién la creó: enviar a revisión,
 * aprobar, rechazar (con motivo), copiar a una versión nueva, eliminar el borrador y exportar.
 * Cada acción pide confirmación; el backend valida de nuevo (incluida la no autoaprobación, D-10).
 */
export function AccionesFlujo({
  version,
  obraId,
  obraCerrada,
  onAviso,
  onCopiada,
  onEliminada,
}: AccionesFlujoProps) {
  const sesion = useSesion();
  const queryClient = useQueryClient();
  const acciones = accionesDeVersion(version, sesion, obraCerrada);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const enviar = useEnviarPresupuestoARevision();
  const aprobar = useAprobarPresupuesto();
  const rechazar = useRechazarPresupuesto();
  const eliminar = useEliminarPresupuesto();
  const copiar = useCrearPresupuesto(obraId);
  const [errorCopia, setErrorCopia] = useState<string | null>(null);

  const cerrar = () => {
    enviar.reset();
    aprobar.reset();
    rechazar.reset();
    eliminar.reset();
    setDialogo(null);
  };

  // Un 409 significa que la versión cambió: se recargan los datos para que la persona vea lo vigente.
  const alFallar = (error: unknown) => {
    if (esConflictoVersion(error))
      void queryClient.invalidateQueries({ queryKey: clavePresupuestos });
  };
  const textoError = (mutacion: { isError: boolean; error: unknown }) =>
    mutacion.isError ? mensajeDeError(mutacion.error) : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {acciones.enviarARevision && (
          <Button
            variant="contained"
            startIcon={<SendOutlined />}
            disabled={acciones.bloqueoEnvio !== null}
            onClick={() => setDialogo('enviar')}
          >
            Enviar a revisión
          </Button>
        )}
        {version.estado === 'en_revision' && acciones.aprobar && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleOutlined />}
            onClick={() => setDialogo('aprobar')}
          >
            Aprobar
          </Button>
        )}
        {version.estado === 'en_revision' && acciones.rechazar && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<HighlightOffOutlined />}
            onClick={() => setDialogo('rechazar')}
          >
            Rechazar
          </Button>
        )}
        {acciones.editar && (
          <Button
            variant="outlined"
            startIcon={<EditNoteOutlined />}
            onClick={() => setDialogo('descripcion')}
          >
            Editar descripción
          </Button>
        )}
        {acciones.copiar && (
          <Button
            variant="outlined"
            startIcon={<ContentCopyOutlined />}
            disabled={copiar.isPending}
            onClick={() => {
              setErrorCopia(null);
              copiar.mutate(
                { copiarDeId: version.id },
                {
                  onSuccess: (nueva) => {
                    onAviso(
                      `Se creó la versión ${nueva.numero} en borrador, copiada de la ${version.numero}.`,
                    );
                    onCopiada(nueva);
                  },
                  onError: (error) => setErrorCopia(mensajeDeError(error)),
                },
              );
            }}
          >
            Crear versión desde esta
          </Button>
        )}
        <Button
          variant="outlined"
          component="a"
          href={urlExportarPresupuesto(version.id)}
          startIcon={<FileDownloadOutlined />}
        >
          Exportar a Excel
        </Button>
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

      {acciones.bloqueoEnvio && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          {acciones.bloqueoEnvio}
        </Alert>
      )}
      {acciones.bloqueoAprobacion && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          {acciones.bloqueoAprobacion}
        </Alert>
      )}
      {errorCopia && (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setErrorCopia(null)}>
          {errorCopia}
        </Alert>
      )}

      <ConfirmDialog
        abierto={dialogo === 'enviar'}
        titulo="Enviar a revisión"
        descripcion={`La versión ${version.numero} quedará congelada hasta que otra persona la apruebe o la rechace. Ya no se podrán modificar sus partidas.`}
        textoConfirmar="Enviar a revisión"
        cargando={enviar.isPending}
        error={textoError(enviar)}
        onConfirmar={() =>
          enviar.mutate(
            { id: version.id, version: version.version },
            {
              onSuccess: () => {
                onAviso(`La versión ${version.numero} se envió a revisión.`);
                cerrar();
              },
              onError: alFallar,
            },
          )
        }
        onCancelar={cerrar}
      />

      <ConfirmDialog
        abierto={dialogo === 'aprobar'}
        titulo="Aprobar versión"
        descripcion={`Al aprobar la versión ${version.numero} pasa a ser el presupuesto vigente de la obra y no podrá modificarse (un cambio requiere una versión nueva).`}
        textoConfirmar="Aprobar"
        pedirMotivo
        cargando={aprobar.isPending}
        error={textoError(aprobar)}
        onConfirmar={(motivo) =>
          aprobar.mutate(
            { id: version.id, version: version.version, motivo },
            {
              onSuccess: () => {
                onAviso(`La versión ${version.numero} quedó aprobada y vigente.`);
                cerrar();
              },
              onError: alFallar,
            },
          )
        }
        onCancelar={cerrar}
      />

      <ConfirmDialog
        abierto={dialogo === 'rechazar'}
        titulo="Rechazar versión"
        descripcion={`La versión ${version.numero} quedará rechazada. Para corregirla se crea una versión nueva copiada de ella.`}
        textoConfirmar="Rechazar"
        peligro
        pedirMotivo
        motivoObligatorio
        cargando={rechazar.isPending}
        error={textoError(rechazar)}
        onConfirmar={(motivo) =>
          rechazar.mutate(
            { id: version.id, version: version.version, motivo: motivo ?? '' },
            {
              onSuccess: () => {
                onAviso(`La versión ${version.numero} se rechazó.`);
                cerrar();
              },
              onError: alFallar,
            },
          )
        }
        onCancelar={cerrar}
      />

      <ConfirmDialog
        abierto={dialogo === 'eliminar'}
        titulo="Eliminar borrador"
        descripcion={`Se eliminará el borrador de la versión ${version.numero} con sus ${version.cantidadPartidas} partida(s). El registro se conserva en la bitácora.`}
        textoConfirmar="Eliminar"
        peligro
        pedirMotivo
        cargando={eliminar.isPending}
        error={textoError(eliminar)}
        onConfirmar={(motivo) =>
          eliminar.mutate(
            { id: version.id, version: version.version, motivo },
            {
              onSuccess: () => {
                onAviso(`Se eliminó el borrador de la versión ${version.numero}.`);
                cerrar();
                onEliminada();
              },
              onError: alFallar,
            },
          )
        }
        onCancelar={cerrar}
      />

      <DescripcionDialog
        abierto={dialogo === 'descripcion'}
        version={version}
        onCerrar={() => setDialogo(null)}
        onGuardada={() => {
          onAviso('Se guardó la descripción.');
          setDialogo(null);
        }}
      />
    </Box>
  );
}

function DescripcionDialog({
  abierto,
  version,
  onCerrar,
  onGuardada,
}: {
  abierto: boolean;
  version: PresupuestoVersionDto;
  onCerrar: () => void;
  onGuardada: () => void;
}) {
  const idTitulo = useId();
  const actualizar = useActualizarPresupuesto();
  const [texto, setTexto] = useState<string | null>(null);
  const valor = texto ?? version.descripcion ?? '';

  return (
    <Dialog
      open={abierto}
      onClose={actualizar.isPending ? undefined : onCerrar}
      aria-labelledby={idTitulo}
      fullWidth
      maxWidth="xs"
      slotProps={{ transition: { onExited: () => setTexto(null) } }}
    >
      <DialogTitle id={idTitulo}>Descripción de la versión {version.numero}</DialogTitle>
      <DialogContent>
        <TextField
          label="Descripción"
          value={valor}
          onChange={(e) => setTexto(e.target.value)}
          fullWidth
          margin="dense"
          slotProps={{ htmlInput: { maxLength: 200 } }}
          helperText="Un nombre corto que identifique esta versión (opcional)."
        />
        {actualizar.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {mensajeDeError(actualizar.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} color="inherit" disabled={actualizar.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={actualizar.isPending}
          onClick={() =>
            actualizar.mutate(
              { id: version.id, version: version.version, descripcion: valor.trim() || null },
              { onSuccess: onGuardada },
            )
          }
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
