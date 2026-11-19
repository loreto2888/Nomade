import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { RutField } from '@/components/RutField';
import type { DatosContraparte } from './esquemas';

interface CamposContraparteProps {
  control: Control<DatosContraparte>;
  register: UseFormRegister<DatosContraparte>;
  errors: FieldErrors<DatosContraparte>;
}

/** Campos comunes de los formularios de cliente y proveedor. */
export function CamposContraparte({ control, register, errors }: CamposContraparteProps) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      <Controller
        name="rut"
        control={control}
        render={({ field }) => (
          <RutField
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            inputRef={field.ref}
            errorMensaje={errors.rut?.message}
            required
            fullWidth
          />
        )}
      />
      <TextField
        label="Razón social"
        required
        fullWidth
        autoComplete="off"
        error={Boolean(errors.razonSocial)}
        helperText={errors.razonSocial?.message}
        {...register('razonSocial')}
      />
      <TextField
        label="Nombre de fantasía"
        fullWidth
        autoComplete="off"
        error={Boolean(errors.nombreFantasia)}
        helperText={errors.nombreFantasia?.message}
        {...register('nombreFantasia')}
      />
      <TextField
        label="Giro"
        fullWidth
        autoComplete="off"
        error={Boolean(errors.giro)}
        helperText={errors.giro?.message}
        {...register('giro')}
      />
      <TextField
        label="Contacto"
        fullWidth
        autoComplete="off"
        error={Boolean(errors.contactoNombre)}
        helperText={errors.contactoNombre?.message}
        {...register('contactoNombre')}
      />
      <TextField
        label="Correo"
        type="email"
        fullWidth
        autoComplete="off"
        error={Boolean(errors.correo)}
        helperText={errors.correo?.message}
        {...register('correo')}
      />
      <TextField
        label="Teléfono"
        type="tel"
        fullWidth
        autoComplete="off"
        error={Boolean(errors.telefono)}
        helperText={errors.telefono?.message}
        {...register('telefono')}
      />
      <TextField
        label="Dirección"
        fullWidth
        autoComplete="off"
        error={Boolean(errors.direccion)}
        helperText={errors.direccion?.message}
        {...register('direccion')}
      />
    </Box>
  );
}
