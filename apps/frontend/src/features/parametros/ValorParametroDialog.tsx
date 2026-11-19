import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { erroresPorCampo, esConflictoVersion, mensajeDeError } from '@/api/errores';
import {
  useAgregarValorParametro,
  useEliminarValorParametro,
  useHistorialParametro,
  type ParametroDto,
} from '@/api/parametros';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatearFecha } from '@/lib/formato';

const esquema = z.object({
  valor: z.string().trim().min(1, 'Ingresa el valor.').max(200, 'El valor es demasiado largo.'),
  vigenteDesde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresa la fecha de inicio de la vigencia.'),
  motivo: z.string().trim().max(500, 'El motivo debe tener como máximo 500 caracteres.'),
});
type Datos = z.infer<typeof esquema>;

/** Fecha de hoy `AAAA-MM-DD` según el reloj del navegador (el servidor valida con la hora de Chile). */
function hoyLocal(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

interface ValorParametroDialogProps {
  /** Parámetro a modificar; `null` mantiene el diálogo cerrado. */
  parametro: ParametroDto | null;
  onCerrar: () => void;
}

/** Agrega una versión del valor de un parámetro con su vigencia y muestra su historial. */
export function ValorParametroDialog({ parametro, onCerrar }: ValorParametroDialogProps) {
  const idTitulo = useId();
  const abierto = parametro !== null;
  const agregar = useAgregarValorParametro();
  const eliminar = useEliminarValorParametro();
  const historial = useHistorialParametro(parametro?.id);
  const [aEliminar, setAEliminar] = useState<{ id: number; texto: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { valor: '', vigenteDesde: hoyLocal(), motivo: '' },
  });

  useEffect(() => {
    if (parametro) {
      reset({ valor: '', vigenteDesde: hoyLocal(), motivo: '' });
      agregar.reset();
      eliminar.reset();
    }
    // Se reinicia solo al abrir con otro parámetro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametro?.id]);

  const enviar = handleSubmit((datos) => {
    if (!parametro) return;
    agregar.mutate(
      {
        id: parametro.id,
        version: parametro.version,
        valor: datos.valor,
        vigenteDesde: datos.vigenteDesde,
        motivo: datos.motivo === '' ? undefined : datos.motivo,
      },
      {
        onSuccess: () => {
          reset({ valor: '', vigenteDesde: hoyLocal(), motivo: '' });
        },
        onError: (error) => {
          const campos = erroresPorCampo(error);
          if (campos.valor) setError('valor', { message: campos.valor });
        },
      },
    );
  });

  const versiones = historial.data ?? [];
  const vigenteDesde = parametro?.valorVigente?.vigenteDesde ?? '';
  const conflicto = agregar.isError && esConflictoVersion(agregar.error);
  const errorGeneral =
    agregar.isError && !conflicto && !erroresPorCampo(agregar.error).valor
      ? mensajeDeError(agregar.error)
      : null;

  return (
    <>
      <Dialog
        open={abierto}
        onClose={agregar.isPending ? undefined : onCerrar}
        aria-labelledby={idTitulo}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={(e) => void enviar(e)} noValidate>
          <DialogTitle id={idTitulo}>Cambiar valor · {parametro?.nombre}</DialogTitle>
          <DialogContent sx={{ pt: '8px !important', display: 'grid', gap: 2 }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Tipo de valor: {parametro?.tipoValor}
              {parametro?.unidad ? ` (${parametro.unidad})` : ''}. La nueva versión empieza a regir
              en la fecha indicada (hoy o posterior); las versiones anteriores no se modifican.
            </Typography>
            <TextField
              label="Nuevo valor"
              required
              autoComplete="off"
              error={Boolean(errors.valor)}
              helperText={errors.valor?.message}
              {...register('valor')}
            />
            <TextField
              label="Vigente desde"
              type="date"
              required
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: hoyLocal() } }}
              error={Boolean(errors.vigenteDesde)}
              helperText={errors.vigenteDesde?.message}
              {...register('vigenteDesde')}
            />
            <TextField
              label="Motivo del cambio (opcional)"
              multiline
              minRows={2}
              error={Boolean(errors.motivo)}
              helperText={errors.motivo?.message}
              {...register('motivo')}
            />
            {agregar.isSuccess && (
              <Alert severity="success">Se agregó la nueva versión del valor.</Alert>
            )}
            {conflicto && (
              <Alert severity="warning">
                Otra persona modificó este parámetro. Cierra el diálogo y vuelve a abrirlo para ver
                los datos vigentes.
              </Alert>
            )}
            {errorGeneral && <Alert severity="error">{errorGeneral}</Alert>}

            <Divider />
            <Typography variant="h6" component="h3" sx={{ fontSize: 14 }}>
              Historial
            </Typography>
            {historial.isPending && (
              <Typography sx={{ fontSize: 13 }}>Cargando historial…</Typography>
            )}
            {historial.isError && <Alert severity="error">{mensajeDeError(historial.error)}</Alert>}
            {versiones.length > 0 && (
              <List dense disablePadding aria-label="Historial de valores">
                {versiones.map((v) => {
                  const programada = vigenteDesde !== '' && v.vigenteDesde > vigenteDesde;
                  const texto = parametro?.unidad
                    ? `${v.valor.replace('.', ',')} ${parametro.unidad}`
                    : v.valor;
                  return (
                    <ListItem
                      key={v.id}
                      divider
                      disableGutters
                      secondaryAction={
                        programada && (
                          <Button
                            size="small"
                            color="error"
                            aria-label={`Eliminar valor programado ${texto}`}
                            onClick={() => setAEliminar({ id: v.id, texto })}
                          >
                            Eliminar
                          </Button>
                        )
                      }
                    >
                      <ListItemText
                        primary={
                          <Box component="span" sx={{ fontWeight: 700 }}>
                            {texto}
                            {programada && (
                              <Box component="span" sx={{ fontWeight: 400, color: 'warning.main' }}>
                                {' '}
                                · programado
                              </Box>
                            )}
                          </Box>
                        }
                        secondary={`Desde ${formatearFecha(v.vigenteDesde)}${v.vigenteHasta ? ` hasta ${formatearFecha(v.vigenteHasta)}` : ' (sin fecha de término)'}${v.motivo ? ` · ${v.motivo}` : ''}`}
                        sx={{ pr: programada ? 9 : 0 }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onCerrar} color="inherit" disabled={agregar.isPending}>
              Cerrar
            </Button>
            <Button type="submit" variant="contained" disabled={agregar.isPending}>
              Guardar nuevo valor
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        abierto={aEliminar !== null}
        titulo="Eliminar valor programado"
        descripcion={`Se eliminará el valor programado ${aEliminar?.texto ?? ''}. Los valores ya vigentes no se pueden eliminar.`}
        textoConfirmar="Eliminar"
        peligro
        pedirMotivo
        cargando={eliminar.isPending}
        error={eliminar.isError ? mensajeDeError(eliminar.error) : null}
        onConfirmar={(motivo) => {
          if (!aEliminar || !parametro) return;
          eliminar.mutate(
            { id: parametro.id, valorId: aEliminar.id, version: parametro.version, motivo },
            { onSuccess: () => setAEliminar(null) },
          );
        }}
        onCancelar={() => {
          eliminar.reset();
          setAEliminar(null);
        }}
      />
    </>
  );
}
