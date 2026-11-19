import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useCatalogo } from '@/api/catalogos';
import { erroresPorCampo, esConflictoVersion, mensajeDeError } from '@/api/errores';
import type { PartidaDto, PresupuestoVersionDto } from '@/api/generated';
import { useActualizarPartida, useCrearPartida } from '@/api/presupuestos';
import { ConflictDialog } from '@/components/ConflictDialog';
import { MoneyField } from '@/components/MoneyField';
import { formatearMonto } from '@/lib/formato';
import { parsearCantidad, totalEstimado } from '@/lib/presupuesto';
import {
  PARTIDA_VACIA,
  aCuerpoPartida,
  dePartida,
  esquemaPartida,
  type DatosPartidaFormulario,
} from './esquemas';

interface PartidaDialogProps {
  abierto: boolean;
  version: Pick<PresupuestoVersionDto, 'id' | 'moneda'>;
  /** Partida a modificar; sin ella, se agrega una nueva. */
  partida?: PartidaDto;
  onCerrar: () => void;
  onGuardada: (partida: PartidaDto, creada: boolean) => void;
  /** Otra persona modificó la partida (409): el padre recarga los datos. */
  onConflicto: () => void;
}

/** Alta y edición de una partida de un borrador (formulario en diálogo; apto para celular). */
export function PartidaDialog({
  abierto,
  version,
  partida,
  onCerrar,
  onGuardada,
  onConflicto,
}: PartidaDialogProps) {
  const idTitulo = useId();
  const editando = partida !== undefined;
  const familias = useCatalogo('familia_partida');
  const crear = useCrearPartida(version.id);
  const actualizar = useActualizarPartida(version.id);
  const mutacion = editando ? actualizar : crear;
  const [conflicto, setConflicto] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DatosPartidaFormulario>({
    resolver: zodResolver(esquemaPartida),
    defaultValues: partida ? dePartida(partida) : PARTIDA_VACIA,
  });

  useEffect(() => {
    if (abierto) {
      reset(partida ? dePartida(partida) : PARTIDA_VACIA);
      crear.reset();
      actualizar.reset();
    }
    // Se reinicia solo al abrir o al cambiar de partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, partida?.id]);

  const opcionesFamilia = useMemo(() => {
    const items = (familias.data ?? []).map((f) => ({ id: f.id, nombre: f.nombre }));
    // Una partida antigua puede tener una familia que ya no está activa: se conserva para editarla.
    if (partida && !items.some((f) => f.id === partida.familia.id)) {
      items.push({ id: partida.familia.id, nombre: `${partida.familia.nombre} (inactiva)` });
    }
    return items;
  }, [familias.data, partida]);

  const [cantidadTexto, precio] = useWatch({ control, name: ['cantidad', 'precioUnitario'] });
  const total = totalEstimado(parsearCantidad(cantidadTexto), precio, version.moneda);

  const alFallar = (error: unknown) => {
    if (esConflictoVersion(error)) {
      setConflicto(true);
      return;
    }
    const campos = erroresPorCampo(error);
    for (const campo of Object.keys(PARTIDA_VACIA) as (keyof DatosPartidaFormulario)[]) {
      if (campos[campo]) setError(campo, { message: campos[campo] });
    }
  };

  const enviar = handleSubmit((datos) => {
    const cuerpo = aCuerpoPartida(datos);
    if (partida) {
      actualizar.mutate(
        { partidaId: partida.id, version: partida.version, ...cuerpo },
        { onSuccess: (p) => onGuardada(p, false), onError: alFallar },
      );
    } else {
      crear.mutate(cuerpo, { onSuccess: (p) => onGuardada(p, true), onError: alFallar });
    }
  });

  const errorEnCampo = mutacion.isError && Object.keys(erroresPorCampo(mutacion.error)).length > 0;
  const errorGeneral =
    mutacion.isError && !conflicto && !errorEnCampo ? mensajeDeError(mutacion.error) : null;

  return (
    <>
      <Dialog
        open={abierto}
        onClose={mutacion.isPending ? undefined : onCerrar}
        aria-labelledby={idTitulo}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={(e) => void enviar(e)} noValidate>
          <DialogTitle id={idTitulo}>{editando ? 'Editar partida' : 'Agregar partida'}</DialogTitle>
          <DialogContent sx={{ pt: '8px !important' }}>
            <Box
              sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
            >
              <TextField
                label="Código"
                {...register('codigo')}
                error={!!errors.codigo}
                helperText={errors.codigo?.message ?? 'Por ejemplo 1.2.3 (único en la versión).'}
                slotProps={{ htmlInput: { maxLength: 30 } }}
                autoFocus
                required
              />
              <Controller
                control={control}
                name="familiaId"
                render={({ field }) => (
                  <TextField
                    select
                    label="Familia"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value))
                    }
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={!!errors.familiaId}
                    helperText={errors.familiaId?.message}
                    required
                  >
                    {opcionesFamilia.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        {f.nombre}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <TextField
                label="Descripción"
                {...register('descripcion')}
                error={!!errors.descripcion}
                helperText={errors.descripcion?.message}
                slotProps={{ htmlInput: { maxLength: 300 } }}
                sx={{ gridColumn: { sm: '1 / -1' } }}
                required
              />
              <TextField
                label="Unidad"
                {...register('unidad')}
                error={!!errors.unidad}
                helperText={errors.unidad?.message ?? 'm2, m3, ml, kg, gl, un…'}
                slotProps={{ htmlInput: { maxLength: 20 } }}
                required
              />
              <TextField
                label="Cantidad"
                {...register('cantidad')}
                error={!!errors.cantidad}
                helperText={errors.cantidad?.message ?? 'Hasta 4 decimales (coma decimal).'}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                required
              />
              <Controller
                control={control}
                name="precioUnitario"
                render={({ field }) => (
                  <MoneyField
                    label={`Precio unitario (${version.moneda})`}
                    moneda={version.moneda}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={!!errors.precioUnitario}
                    helperText={
                      errors.precioUnitario?.message ??
                      (version.moneda === 'UF' ? 'Hasta 4 decimales.' : 'Pesos enteros.')
                    }
                    required
                  />
                )}
              />
              <Box sx={{ alignSelf: 'center' }}>
                <Typography
                  sx={{ fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}
                >
                  Total estimado
                </Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 700 }} aria-live="polite">
                  {total === null ? '—' : formatearMonto(total, version.moneda)}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  El total definitivo lo calcula el servidor.
                </Typography>
              </Box>
            </Box>
            {errorGeneral && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorGeneral}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onCerrar} color="inherit" disabled={mutacion.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={mutacion.isPending}>
              {editando ? 'Guardar cambios' : 'Agregar partida'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConflictDialog
        abierto={abierto && conflicto}
        entidad="la partida"
        onUsarActual={() => {
          setConflicto(false);
          onConflicto();
        }}
        onCerrar={() => setConflicto(false)}
      />
    </>
  );
}
