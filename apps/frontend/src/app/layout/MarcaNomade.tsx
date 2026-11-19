import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

/** Marca «N» + «NÓMADE / GESTIÓN DE OBRAS» del prototipo. */
export function MarcaNomade() {
  const c = useTheme().palette.barraLateral;
  return (
    <Box
      sx={{
        height: 94,
        flexShrink: 0,
        px: 3,
        display: 'flex',
        gap: 1.375,
        alignItems: 'center',
        color: '#fff',
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 35,
          height: 35,
          border: `1px solid ${c.marcaBorde}`,
          borderRadius: '10px',
          display: 'grid',
          placeItems: 'center',
          fontSize: 23,
          fontWeight: 700,
          color: c.marca,
        }}
      >
        N
      </Box>
      <Box
        sx={{
          fontFamily: '"Manrope", sans-serif',
          fontWeight: 800,
          letterSpacing: '0.08em',
          fontSize: 15,
          lineHeight: 1.2,
        }}
      >
        NÓMADE
        <Box
          component="small"
          sx={{
            display: 'block',
            color: c.marcaSubtitulo,
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 500,
            letterSpacing: '0.04em',
            fontSize: 9,
            mt: '3px',
          }}
        >
          GESTIÓN DE OBRAS
        </Box>
      </Box>
    </Box>
  );
}
