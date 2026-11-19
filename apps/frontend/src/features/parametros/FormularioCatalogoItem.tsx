import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { useEffect, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useActualizarItemCatalogo,
  useCrearItemCatalogo,
  type CatalogoItemDto,
  type TipoCatalogo,
} from '@/api/catalogos';
import { erroresPorCampo, esConflictoVersion, mensajeDeError } from '@/api/errores';
import { ConflictDialog } from '@/components/ConflictDialog';

const esquema = z.object({
  codigo: z.string().trim(),
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(100, 'El nombre debe tener como máximo 100 caracteres.'),
  descripcion: z.string().trim().max(300, 'La descripción debe tener como máximo 300 caracteres.'),
  orden: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^\d{1,4}$/.test(v),
      'El orden debe ser un número entero entre 0 y 9999.',
    ),
  activo: z.boolean(),
});
type Datos = z.infer<typeof esquema>;

const VACIO: Datos = { codigo: '', nombre: '', descripcion: '', orden: '', activo: true };

interface FormularioCatalogoItemProps {
  abierto: boolean;
  tipo: TipoCatalogo;
  /** Ítem a editar; sin él, agrega uno nuevo. */
  item?: CatalogoItemDto;
  onCerrar: () => void;
  onGuardado: (item: CatalogoItemDto) => void;
  onConflicto: () => void;
}

/** Alta y edición de un ítem de catálogo (solo admin). El código no se puede cambiar. */
export function FormularioCatalogoItem({
  abierto,
  tipo,
  item,
  onCerrar,
  onGuardado,
  onConflicto,
}: FormularioCatalogoItemProps) {
  const idTitulo = useId();
  const crear = useCrearItemCatalogo(tipo);
  const actualizar = useActualizarItemCatalogo(tipo);
  const editando = item !== undefined;
  const mutacion = editando ? actualizar : crear;
  const [conflicto, setConflicto] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: VACIO });

  useEffect(() => {
    if (abierto) {
      reset(
        item
          ? {
              codigo: item.codigo,
              nombre: item.nombre,
              descripcion: item.descripcion ?? '',
              orden: String(item.orden),
              activo: item.activo,
            }
          : VACIO,
      );
      crear.reset();
      actualizar.reset();
    }
    // Se reinicia solo al abrir o al cambiar de ítem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, item?.id]);

  const alFallar = (error: unknown) => {
    if (esConflictoVersion(error)) {
      setConflicto(true);
      return;
    }
    const campos = erroresPorCampo(error);
    for (const campo of ['codigo', 'nombre', 'descripcion', 'orden'] as const) {
      if (campos[campo]) setError(campo, { message: campos[campo] });
    }
  };

  const enviar = handleSubmit((datos) => {
    const orden = datos.orden === '' ? undefined : Number(datos.orden);
    const descripcion = datos.descripcion === '' ? null : datos.descripcion;
    if (item) {
      actualizar.mutate(
        {
          id: item.id,
          version: item.version,
          nombre: datos.nombre,
          descripcion,
          orden,
          activo: datos.activo,
        },
        { onSuccess: onGuardado, onError: alFallar },
      );
    } else {
      crear.mutate(
        { codigo: datos.codigo, nombre: datos.nombre, descripcion, orden },
        { onSuccess: onGuardado, onError: alFallar },
      );
    }
  });

  const errorGeneral =
    mutacion.isError && !conflicto && Object.keys(erroresPorCampo(mutacion.error)).length === 0
      ? mensajeDeError(mutacion.error)
      : null;

  return (
    <>
      <Dialog
        open={abierto}
        onClose={mutacion.isPending ? undefined : onCerrar}
        aria-labelledby={idTitulo}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={(e) => void enviar(e)} noValidate>
          <DialogTitle id={idTitulo}>{editando ? 'Editar ítem' : 'Nuevo ítem'}</DialogTitle>
          <DialogContent sx={{ pt: '8px !important', display: 'grid', gap: 2 }}>
            <TextField
              label="Código"
              required
              disabled={editando}
              autoComplete="off"
              placeholder="en_garantia"
              error={Boolean(errors.codigo)}
              helperText={
                errors.codigo?.message ??
                (editando ? 'El código no se puede cambiar.' : 'Minúsculas, dígitos y guion bajo.')
              }
              {...register('codigo')}
            />
            <TextField
              label="Nombre"
              required
              autoComplete="off"
              error={Boolean(errors.nombre)}
              helperText={errors.nombre?.message}
              {...register('nombre')}
            />
            <TextField
              label="Descripción"
              multiline
              minRows={2}
              error={Boolean(errors.descripcion)}
              helperText={errors.descripcion?.message}
              {...register('descripcion')}
            />
            <TextField
              label="Orden"
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              error={Boolean(errors.orden)}
              helperText={errors.orden?.message ?? 'Posición en las listas (menor primero).'}
              {...register('orden')}
            />
            {editando && (
              <Controller
                name="activo"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={item?.protegido}
                      />
                    }
                    label={item?.protegido ? 'Activo (ítem usado por la aplicación)' : 'Activo'}
                  />
                )}
              />
            )}
            {errorGeneral && <Alert severity="error">{errorGeneral}</Alert>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onCerrar} color="inherit" disabled={mutacion.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={mutacion.isPending}>
              {editando ? 'Guardar cambios' : 'Agregar ítem'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConflictDialog
        abierto={abierto && conflicto}
        entidad="el ítem"
        onUsarActual={() => {
          setConflicto(false);
          onConflicto();
        }}
        onCerrar={() => setConflicto(false)}
      />
    </>
  );
}
