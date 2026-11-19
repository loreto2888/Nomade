import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface CabeceraPaginaProps {
  eyebrow: string;
  titulo: string;
  descripcion?: string;
  /** Acciones a la derecha (p. ej. botón primario). */
  acciones?: ReactNode;
}

/** Cabecera de página del prototipo: eyebrow, título, descripción y acciones. */
export function CabeceraPagina({ eyebrow, titulo, descripcion, acciones }: CabeceraPaginaProps) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'flex-end' },
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2.5,
        mb: 3.25,
      }}
    >
      <Box>
        <Typography variant="eyebrow" sx={{ mb: 1.125 }}>
          {eyebrow} &nbsp;/&nbsp; Gestión de obras
        </Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '1.4375rem', md: '1.6875rem' } }}>
          {titulo}
        </Typography>
        {descripcion && (
          <Typography sx={{ fontSize: 13, color: 'apoyo.textoSuave', mt: 1.125, lineHeight: 1.5 }}>
            {descripcion}
          </Typography>
        )}
      </Box>
      {acciones}
    </Box>
  );
}
