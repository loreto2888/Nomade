import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { useEffect, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { erroresPorCampo, esConflictoVersion, mensajeDeError } from '@/api/errores';
import {
  useActualizarCuentaBancaria,
  useCrearCuentaBancaria,
  type CuentaBancariaDto,
} from '@/api/proveedores';
import { ConflictDialog } from '@/components/ConflictDialog';
import { RutField } from '@/components/RutField';
import {
  CUENTA_VACIA,
  TIPOS_CUENTA,
  aCuerpoCuenta,
  deCuenta,
  esquemaCuentaBancaria,
  type DatosCuentaBancaria,
} from './esquemas';

interface FormularioCuentaBancariaProps {
  abierto: boolean;
  proveedorId: number;
  /** Cuenta a editar; sin ella, agrega una nueva. */
  cuenta?: CuentaBancariaDto;
  onCerrar: () => void;
  onGuardada: (cuenta: CuentaBancariaDto, creada: boolean) => void;
  /** Otra persona modificó la cuenta (409): el padre recarga la lista. */
  onConflicto: () => void;
}

/** Alta y edición de una cuenta bancaria de proveedor (solo admin; queda en la bitácora). */
export function FormularioCuentaBancaria({
  abierto,
  proveedorId,
  cuenta,
  onCerrar,
  onGuardada,
  onConflicto,
}: FormularioCuentaBancariaProps) {
  const idTitulo = useId();
  const crear = useCrearCuentaBancaria(proveedorId);
  const actualizar = useActualizarCuentaBancaria(proveedorId);
  const editando = cuenta !== undefined;
  const mutacion = editando ? actualizar : crear;
  const [conflicto, setConflicto] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DatosCuentaBancaria>({
    resolver: zodResolver(esquemaCuentaBancaria),
    defaultValues: cuenta ? deCuenta(cuenta) : CUENTA_VACIA,
  });

  useEffect(() => {
    if (abierto) {
      reset(cuenta ? deCuenta(cuenta) : CUENTA_VACIA);
      crear.reset();
      actualizar.reset();
    }
    // Se reinicia solo al abrir o al cambiar de cuenta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, cuenta?.id]);

  const alFallar = (error: unknown) => {
    if (esConflictoVersion(error)) {
      setConflicto(true);
      return;
    }
    const campos = erroresPorCampo(error);
    for (const campo of Object.keys(CUENTA_VACIA) as (keyof DatosCuentaBancaria)[]) {
      if (campos[campo]) setError(campo, { message: campos[campo] });
    }
  };

  const enviar = handleSubmit((datos) => {
    const cuerpo = aCuerpoCuenta(datos);
    if (cuenta) {
      actualizar.mutate(
        { cuentaId: cuenta.id, version: cuenta.version, ...cuerpo },
        { onSuccess: (c) => onGuardada(c, false), onError: alFallar },
      );
    } else {
      crear.mutate(cuerpo, { onSuccess: (c) => onGuardada(c, true), onError: alFallar });
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
        maxWidth="sm"
      >
        <form onSubmit={(e) => void enviar(e)} noValidate>
          <DialogTitle id={idTitulo}>
            {editando ? 'Editar cuenta bancaria' : 'Nueva cuenta bancaria'}
          </DialogTitle>
          <DialogContent sx={{ pt: '8px !important' }}>
            <Box
              sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
            >
              <TextField
                label="Banco"
                required
                fullWidth
                autoComplete="off"
                error={Boolean(errors.banco)}
                helperText={errors.banco?.message}
                {...register('banco')}
              />
              <Controller
                name="tipoCuenta"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Tipo de cuenta"
                    required
                    fullWidth
                    error={Boolean(errors.tipoCuenta)}
                    helperText={errors.tipoCuenta?.message}
                    {...field}
                  >
                    {TIPOS_CUENTA.map((t) => (
                      <MenuItem key={t.valor} value={t.valor}>
                        {t.etiqueta}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <TextField
                label="Número de cuenta"
                required
                fullWidth
                autoComplete="off"
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                error={Boolean(errors.numeroCuenta)}
                helperText={errors.numeroCuenta?.message}
                {...register('numeroCuenta')}
              />
              <TextField
                label="Titular"
                required
                fullWidth
                autoComplete="off"
                error={Boolean(errors.titular)}
                helperText={errors.titular?.message}
                {...register('titular')}
              />
              <Controller
                name="titularRut"
                control={control}
                render={({ field }) => (
                  <RutField
                    label="RUT del titular"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    errorMensaje={errors.titularRut?.message}
                    required
                    fullWidth
                  />
                )}
              />
              <TextField
                label="Correo de notificación"
                type="email"
                fullWidth
                autoComplete="off"
                error={Boolean(errors.correoNotificacion)}
                helperText={errors.correoNotificacion?.message}
                {...register('correoNotificacion')}
              />
            </Box>
            <Controller
              name="principal"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  sx={{ mt: 1.5 }}
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={editando && cuenta?.principal}
                    />
                  }
                  label="Cuenta principal para los pagos"
                />
              )}
            />
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
              {editando ? 'Guardar cambios' : 'Agregar cuenta'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConflictDialog
        abierto={abierto && conflicto}
        entidad="la cuenta bancaria"
        onUsarActual={() => {
          setConflicto(false);
          onConflicto();
        }}
        onCerrar={() => setConflicto(false)}
      />
    </>
  );
}
