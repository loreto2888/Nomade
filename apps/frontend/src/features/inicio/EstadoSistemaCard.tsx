import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EstadoSalud, useSalud } from '@/api/salud';

const formatoFecha = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'medium' });

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso : formatoFecha.format(fecha);
}

function ChipEstado({ etiqueta, estado }: { etiqueta: string; estado: EstadoSalud }) {
  const ok = estado === EstadoSalud.Ok;
  return (
    <Chip
      size="small"
      color={ok ? 'success' : 'error'}
      label={`${etiqueta}: ${ok ? 'OK' : 'Error'}`}
    />
  );
}

/** Tarjeta «Estado del sistema»: consulta `/api/health`. */
export function EstadoSistemaCard() {
  const { data, isPending, isError, refetch, isFetching } = useSalud();

  return (
    <Card component="section" aria-labelledby="estado-sistema-titulo">
      <CardContent sx={{ p: { xs: 2.125, md: 2.625 } }}>
        <Box sx={{ mb: 2.375 }}>
          <Typography id="estado-sistema-titulo" variant="h6" component="h2">
            Estado del sistema
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'apoyo.textoTenue', mt: 0.75 }}>
            Conexión con la API y la base de datos
          </Typography>
        </Box>

        {isPending && (
          <Stack direction="row" spacing={1} aria-label="Consultando estado">
            <Skeleton variant="rounded" width={90} height={24} />
            <Skeleton variant="rounded" width={90} height={24} />
          </Stack>
        )}

        {isError && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                Reintentar
              </Button>
            }
          >
            No fue posible conectar con el servidor. Verifica que el backend esté en ejecución e
            inténtalo nuevamente.
          </Alert>
        )}

        {data && (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <ChipEstado etiqueta="API" estado={EstadoSalud.Ok} />
              <ChipEstado etiqueta="Base de datos" estado={data.baseDatos} />
            </Stack>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              Versión <strong>{data.version}</strong> · {formatearFecha(data.fecha)}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
