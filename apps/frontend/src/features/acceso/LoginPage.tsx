import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useIniciarSesion, useSesionQuery } from '@/api/auth';
import { mensajeDeError } from '@/api/errores';
import { ESTADO_DESDE, RUTA_CAMBIAR_CLAVE, rutaDestinoSegura } from '@/app/rutasAcceso';
import { PanelAcceso } from './PanelAcceso';

const esquema = z.object({
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Ingresa tu correo.')
    .pipe(z.email('Ingresa un correo válido.')),
  clave: z.string().min(1, 'Ingresa tu contraseña.'),
});

type DatosLogin = z.infer<typeof esquema>;

/** P01 — Acceso: inicio de sesión con correo y contraseña. */
export function LoginPage() {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const { data: sesion } = useSesionQuery();
  const iniciarSesion = useIniciarSesion();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosLogin>({ resolver: zodResolver(esquema) });

  const destino = rutaDestinoSegura(
    (ubicacion.state as Record<string, unknown> | null)?.[ESTADO_DESDE],
  );

  if (sesion && !iniciarSesion.isPending) {
    return <Navigate to={sesion.usuario.debeCambiarClave ? RUTA_CAMBIAR_CLAVE : destino} replace />;
  }

  const enviar = handleSubmit((datos) => {
    iniciarSesion.mutate(datos, {
      onSuccess: (nueva) => {
        void navegar(nueva.usuario.debeCambiarClave ? RUTA_CAMBIAR_CLAVE : destino, {
          replace: true,
        });
      },
    });
  });

  return (
    <PanelAcceso eyebrow="P01 / Acceso">
      <Typography variant="h2" component="h1">
        Bienvenido de nuevo
      </Typography>
      <Typography sx={{ mt: 1, mb: 3, fontSize: 14, color: 'text.secondary' }}>
        Ingresa con la cuenta asignada por el administrador.
      </Typography>

      <Box
        component="form"
        onSubmit={(e) => void enviar(e)}
        noValidate
        sx={{ display: 'grid', gap: 2 }}
      >
        <TextField
          label="Correo"
          type="email"
          autoComplete="username"
          autoFocus
          fullWidth
          error={Boolean(errors.correo)}
          helperText={errors.correo?.message}
          {...register('correo')}
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          fullWidth
          error={Boolean(errors.clave)}
          helperText={errors.clave?.message}
          {...register('clave')}
        />
        {iniciarSesion.isError && (
          <Alert severity="error">{mensajeDeError(iniciarSesion.error)}</Alert>
        )}
        <Button type="submit" variant="contained" size="large" disabled={iniciarSesion.isPending}>
          {iniciarSesion.isPending ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </Box>

      <Alert severity="info" variant="outlined" role="note" sx={{ mt: 3 }}>
        Si no puedes acceder, contacta al administrador. La recuperación automática aún no está
        disponible.
      </Alert>
    </PanelAcceso>
  );
}
