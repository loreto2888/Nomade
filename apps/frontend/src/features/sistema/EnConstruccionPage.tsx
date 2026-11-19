import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { CabeceraPagina } from '@/components/CabeceraPagina';

interface EnConstruccionPageProps {
  seccion: string;
  titulo: string;
  descripcion: string;
}

/** Placeholder para las pantallas que aún no se implementan. */
export function EnConstruccionPage({ seccion, titulo, descripcion }: EnConstruccionPageProps) {
  return (
    <>
      <CabeceraPagina eyebrow={seccion} titulo={titulo} descripcion={descripcion} />
      <Card>
        <CardContent sx={{ py: 6, textAlign: 'center' }}>
          <Box
            sx={{
              mx: 'auto',
              mb: 2,
              width: 48,
              height: 48,
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'apoyo.vacioFondo',
              color: 'apoyo.vacioIcono',
            }}
          >
            <ConstructionOutlined />
          </Box>
          <Typography variant="h6" component="h2">
            En construcción
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 12, color: 'text.secondary' }}>
            Esta pantalla aún no está disponible. Se implementará en una próxima fase.
          </Typography>
        </CardContent>
      </Card>
    </>
  );
}
