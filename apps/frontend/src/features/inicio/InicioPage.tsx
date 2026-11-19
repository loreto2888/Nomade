import Box from '@mui/material/Box';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { EstadoSistemaCard } from './EstadoSistemaCard';

export function InicioPage() {
  return (
    <>
      <CabeceraPagina
        eyebrow="Inicio"
        titulo="Buenos días, equipo"
        descripcion="Aquí tienes un resumen de lo que sucede en tus obras."
      />
      <Box sx={{ maxWidth: 480 }}>
        <EstadoSistemaCard />
      </Box>
    </>
  );
}
