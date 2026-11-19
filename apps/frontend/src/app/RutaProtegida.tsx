import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { establecerSesion, useSesionQuery } from '@/api/auth';
import { registrarManejadorSesionPerdida } from '@/api/http';
import { ESTADO_DESDE, RUTA_CAMBIAR_CLAVE, RUTA_INGRESAR } from './rutasAcceso';
import { aSesion, ContextoSesion } from './sesion';
import { SincronizarTemaUsuario } from './tema/SincronizarTemaUsuario';

/**
 * Ruta padre de todo lo que exige sesión: sin sesión redirige al login y, si la cuenta tiene una
 * contraseña temporal, bloquea el resto hasta que la cambie.
 */
export function RutaProtegida() {
  const { data: sesion, isPending, isError, refetch, isFetching } = useSesionQuery();
  const queryClient = useQueryClient();
  const ubicacion = useLocation();
  const sesionActual = useMemo(() => (sesion ? aSesion(sesion) : null), [sesion]);

  useEffect(() => {
    registrarManejadorSesionPerdida(() => establecerSesion(queryClient, null));
    return () => registrarManejadorSesionPerdida(undefined);
  }, [queryClient]);

  if (isPending) {
    return (
      <Box
        role="status"
        aria-label="Verificando sesión"
        sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 3, maxWidth: 560, mx: 'auto', mt: 8 }}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              Reintentar
            </Button>
          }
        >
          No fue posible verificar tu sesión. Revisa tu conexión e inténtalo nuevamente.
        </Alert>
      </Box>
    );
  }

  if (!sesion) {
    return (
      <Navigate
        to={RUTA_INGRESAR}
        replace
        state={{ [ESTADO_DESDE]: ubicacion.pathname + ubicacion.search }}
      />
    );
  }

  if (sesion.usuario.debeCambiarClave && ubicacion.pathname !== RUTA_CAMBIAR_CLAVE) {
    return <Navigate to={RUTA_CAMBIAR_CLAVE} replace />;
  }

  return (
    <ContextoSesion.Provider value={sesionActual}>
      <SincronizarTemaUsuario usuarioId={sesion.usuario.id} tema={sesion.usuario.tema} />
      <Outlet />
    </ContextoSesion.Provider>
  );
}
