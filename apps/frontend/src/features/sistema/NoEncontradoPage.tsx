import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { CabeceraPagina } from '@/components/CabeceraPagina';

export function NoEncontradoPage() {
  return (
    <>
      <CabeceraPagina
        eyebrow="Error 404"
        titulo="Página no encontrada"
        descripcion="La dirección que buscas no existe o fue movida."
      />
      <Card>
        <CardContent sx={{ py: 5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2.5 }}>
            Revisa la dirección o vuelve al inicio para continuar.
          </Typography>
          <Button variant="contained" component={RouterLink} to="/">
            Volver al inicio
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
