import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useActualizarTemaUsuario, useCambiarClave, useCerrarSesion } from '@/api/auth';
import { erroresPorCampo, mensajeDeError } from '@/api/errores';
import { RUTA_INGRESAR } from '@/app/rutasAcceso';
import { useSesion } from '@/app/sesion';
import { PanelAcceso } from './PanelAcceso';
import { esquemaCambioClave, LARGO_MINIMO_CLAVE, type DatosCambioClave } from './esquemas';

/**
 * P01 — Cambio de contraseña. Si la cuenta tiene una contraseña temporal es obligatorio y bloquea
 * el resto de la aplicación; si no, es voluntario y permite volver.
 */
export function CambiarClavePage() {
  const sesion = useSesion();
  const navegar = useNavigate();
  const cambiarClave = useCambiarClave();
  const cerrarSesion = useCerrarSesion();
  const actualizarTema = useActualizarTemaUsuario();
  const obligatorio = sesion.debeCambiarClave;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DatosCambioClave>({ resolver: zodResolver(esquemaCambioClave) });

  const enviar = handleSubmit((datos) => {
    cambiarClave.mutate(
      { claveActual: datos.claveActual, claveNueva: datos.claveNueva },
      {
        onSuccess: () => void navegar('/', { replace: true }),
        onError: (error) => {
          const campos = erroresPorCampo(error);
          if (campos.claveNueva) setError('claveNueva', { message: campos.claveNueva });
        },
      },
    );
  });

  const salir = () => {
    cerrarSesion.mutate(undefined, {
      onSettled: () => void navegar(RUTA_INGRESAR, { replace: true }),
    });
  };

  return (
    <PanelAcceso eyebrow="P01 / Acceso" onCambioTema={(modo) => actualizarTema.mutate(modo)}>
      <Typography variant="h2" component="h1">
        Cambia tu contraseña
      </Typography>
      <Typography sx={{ mt: 1, mb: 3, fontSize: 14, color: 'text.secondary' }}>
        {obligatorio
          ? 'Antes de continuar, reemplaza la contraseña temporal entregada por tu administrador.'
          : 'Ingresa tu contraseña actual y una nueva contraseña.'}
      </Typography>

      <Box
        component="form"
        onSubmit={(e) => void enviar(e)}
        noValidate
        sx={{ display: 'grid', gap: 2 }}
      >
        <TextField
          label="Contraseña actual"
          type="password"
          autoComplete="current-password"
          autoFocus
          fullWidth
          error={Boolean(errors.claveActual)}
          helperText={errors.claveActual?.message}
          {...register('claveActual')}
        />
        <TextField
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          fullWidth
          error={Boolean(errors.claveNueva)}
          helperText={
            errors.claveNueva?.message ?? `Debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`
          }
          {...register('claveNueva')}
        />
        <TextField
          label="Repite la nueva contraseña"
          type="password"
          autoComplete="new-password"
          fullWidth
          error={Boolean(errors.confirmacion)}
          helperText={errors.confirmacion?.message}
          {...register('confirmacion')}
        />
        {cambiarClave.isError && (
          <Alert severity="error">{mensajeDeError(cambiarClave.error)}</Alert>
        )}
        <Button type="submit" variant="contained" size="large" disabled={cambiarClave.isPending}>
          {cambiarClave.isPending ? 'Actualizando…' : 'Actualizar contraseña'}
        </Button>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {!obligatorio && (
          <Button variant="text" onClick={() => void navegar('/')}>
            Volver
          </Button>
        )}
        <Button variant="text" color="inherit" onClick={salir} disabled={cerrarSesion.isPending}>
          Cerrar sesión
        </Button>
      </Box>
    </PanelAcceso>
  );
}
