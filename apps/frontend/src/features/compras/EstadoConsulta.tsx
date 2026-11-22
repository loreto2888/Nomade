import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link as EnlaceRouter } from 'react-router';
import { mensajeDeError, normalizarError } from '@/api/errores';

/**
 * Estados de carga de una ficha: no existe (404), error con reintento o cargando. Si hay datos,
 * renderiza `children(datos)`.
 */
export function EstadoConsulta<T>({
  id,
  consulta,
  noExiste,
  volver,
  children,
}: {
  id: number | undefined;
  consulta: UseQueryResult<T>;
  noExiste: string;
  volver: { ruta: string; texto: string };
  children: (datos: T) => ReactNode;
}) {
  if (id === undefined || (consulta.isError && normalizarError(consulta.error).estado === 404)) {
    return (
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" component={EnlaceRouter} to={volver.ruta}>
            {volver.texto}
          </Button>
        }
      >
        {noExiste}
      </Alert>
    );
  }
  if (consulta.isError) {
    return (
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
    );
  }
  if (consulta.data === undefined) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress aria-label="Cargando" />
      </Box>
    );
  }
  return <>{children(consulta.data)}</>;
}
