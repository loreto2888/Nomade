import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

/** Error inesperado al renderizar una ruta. */
export function ErrorRutaPage() {
  return (
    <Box sx={{ p: { xs: 2.25, md: 5.25 }, maxWidth: 640 }}>
      <Alert severity="error">
        <AlertTitle>Ocurrió un error inesperado</AlertTitle>
        Intenta recargar la página. Si el problema continúa, avisa al administrador.
      </Alert>
      <Button sx={{ mt: 2 }} variant="outlined" onClick={() => window.location.assign('/')}>
        Volver al inicio
      </Button>
    </Box>
  );
}
