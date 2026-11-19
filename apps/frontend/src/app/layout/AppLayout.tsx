import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { useState } from 'react';
import { Outlet, useMatches } from 'react-router';
import { ANCHO_BARRA_LATERAL } from '@/app/theme';
import { BarraSuperior } from './BarraSuperior';
import { MenuLateral } from './MenuLateral';

/** Metadatos de ruta usados por el layout (breadcrumbs). */
export interface HandleRuta {
  etiqueta: string;
}

function useEtiquetaRutaActual(): string {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i].handle as HandleRuta | undefined;
    if (handle?.etiqueta) return handle.etiqueta;
  }
  return 'Inicio';
}

const estiloPapel: SxProps<Theme> = (tema) => ({
  width: ANCHO_BARRA_LATERAL,
  maxWidth: '85vw',
  boxSizing: 'border-box',
  bgcolor: tema.palette.barraLateral.fondo,
  color: '#dbe9df',
  border: 0,
  backgroundImage: 'none',
});

export function AppLayout() {
  const theme = useTheme();
  const escritorio = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const etiqueta = useEtiquetaRutaActual();
  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="aside" sx={{ width: { md: ANCHO_BARRA_LATERAL }, flexShrink: { md: 0 } }}>
        {escritorio ? (
          <Drawer
            variant="permanent"
            open
            slotProps={{ paper: { id: 'menu-lateral', sx: estiloPapel } }}
          >
            <MenuLateral />
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={menuAbierto}
            onClose={cerrarMenu}
            keepMounted
            slotProps={{ paper: { id: 'menu-lateral', sx: estiloPapel } }}
          >
            <MenuLateral onNavegar={cerrarMenu} />
          </Drawer>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <BarraSuperior
          titulo={etiqueta}
          mostrarBotonMenu={!escritorio}
          menuAbierto={menuAbierto}
          onAbrirMenu={() => setMenuAbierto(true)}
        />
        <Box
          component="main"
          sx={{
            width: '100%',
            maxWidth: 1600,
            mx: 'auto',
            px: { xs: 2.25, md: 5.25 },
            pt: { xs: 3, md: 4.25 },
            pb: 7,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
