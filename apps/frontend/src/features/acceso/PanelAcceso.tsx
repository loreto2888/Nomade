import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { SelectorTema } from '@/components/SelectorTema';

interface PanelAccesoProps {
  eyebrow: string;
  children: ReactNode;
  /** Acciones del selector de tema (guardar en la cuenta, si hay sesión). */
  onCambioTema?: Parameters<typeof SelectorTema>[0]['onCambio'];
}

/** Marco de las pantallas de acceso (ingreso y cambio de contraseña), responsive. */
export function PanelAcceso({ eyebrow, children, onCambioTema }: PanelAccesoProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(320px, 5fr) minmax(360px, 6fr)' },
        bgcolor: 'background.default',
      }}
    >
      <Box
        component="section"
        aria-hidden
        sx={(tema) => ({
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          bgcolor: tema.palette.barraLateral.fondo,
          color: '#fff',
        })}
      >
        <Typography
          sx={{
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 800,
            letterSpacing: '0.08em',
            fontSize: 18,
          }}
        >
          NÓMADE
          <Box
            component="small"
            sx={(tema) => ({
              display: 'block',
              mt: 0.5,
              fontFamily: '"DM Sans", sans-serif',
              fontWeight: 500,
              letterSpacing: '0.04em',
              fontSize: 10,
              color: tema.palette.barraLateral.marcaSubtitulo,
            })}
          >
            GESTIÓN DE OBRAS
          </Box>
        </Typography>
        <Box>
          <Typography
            sx={{
              fontFamily: '"Manrope", sans-serif',
              fontWeight: 800,
              fontSize: 38,
              lineHeight: 1.12,
              letterSpacing: '-0.03em',
              maxWidth: 420,
            }}
          >
            Construyamos con más claridad.
          </Typography>
          <Typography sx={{ mt: 2, maxWidth: 420, opacity: 0.8, lineHeight: 1.6 }}>
            Una visión integral para acompañar cada etapa de tus obras, desde el presupuesto hasta
            el resultado.
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 11, letterSpacing: '0.1em', opacity: 0.6 }}>
          CONSTRUCTORA NÓMADE
        </Typography>
      </Box>

      <Box
        component="main"
        sx={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          px: { xs: 2.25, sm: 4 },
          py: 6,
        }}
      >
        <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
          <SelectorTema onCambio={onCambioTema} />
        </Box>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="eyebrow" sx={{ mb: 1.5 }}>
            {eyebrow}
          </Typography>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
