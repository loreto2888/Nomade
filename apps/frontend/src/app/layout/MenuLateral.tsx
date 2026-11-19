import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import { Link as RouterLink, useLocation } from 'react-router';
import { MENU, rutaActiva } from '@/app/navegacion';
import { esAdmin, useSesion } from '@/app/sesion';
import { MarcaNomade } from './MarcaNomade';

interface MenuLateralProps {
  /** Se llama al elegir un ítem (cierra el Drawer temporal en móvil). */
  onNavegar?: () => void;
}

export function MenuLateral({ onNavegar }: MenuLateralProps) {
  const { pathname } = useLocation();
  const sesion = useSesion();
  const c = useTheme().palette.barraLateral;
  const admin = esAdmin(sesion);
  const secciones = MENU.filter((seccion) => !seccion.soloAdmin || admin)
    .map((seccion) => ({
      ...seccion,
      items: seccion.items.filter((item) => !item.soloAdmin || admin),
    }))
    .filter((seccion) => seccion.items.length > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <MarcaNomade />
      <Box
        component="nav"
        aria-label="Navegación principal"
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: 1.5,
          pb: 2.5,
          scrollbarWidth: 'thin',
          scrollbarColor: '#496b5a transparent',
        }}
      >
        {secciones.map((seccion) => {
          const idTitulo = `menu-${seccion.titulo.toLowerCase().replace(/\s+/g, '-')}`;
          return (
            <List
              key={seccion.titulo}
              dense
              disablePadding
              aria-labelledby={idTitulo}
              subheader={
                <ListSubheader
                  id={idTitulo}
                  disableSticky
                  sx={{
                    bgcolor: 'transparent',
                    color: c.tituloSeccion,
                    px: 1.5,
                    pt: 2.25,
                    pb: 1,
                    fontSize: 9,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  {seccion.titulo}
                </ListSubheader>
              }
            >
              {seccion.items.map((item) => {
                const activo = rutaActiva(item.ruta, pathname);
                const Icono = item.icono;
                return (
                  <ListItemButton
                    key={item.ruta}
                    component={RouterLink}
                    to={item.ruta}
                    onClick={onNavegar}
                    selected={activo}
                    aria-current={activo ? 'page' : undefined}
                    sx={{
                      borderRadius: '7px',
                      px: 1.5,
                      py: 1.25,
                      gap: 1.375,
                      color: c.texto,
                      '&:hover': { bgcolor: c.hover, color: '#fff' },
                      '&.Mui-selected, &.Mui-selected:hover': {
                        bgcolor: c.activoFondo,
                        color: c.activoTexto,
                      },
                      '&.Mui-selected .MuiListItemText-primary': { fontWeight: 700 },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                      <Icono sx={{ fontSize: 17 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.etiqueta}
                      sx={{ m: 0 }}
                      slotProps={{ primary: { sx: { fontSize: 12, lineHeight: 1.2 } } }}
                    />
                    {item.pendiente && (
                      <Chip
                        label="Pendiente"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 8.5,
                          letterSpacing: '0.04em',
                          bgcolor: 'transparent',
                          color: 'inherit',
                          border: `1px solid ${c.borde}`,
                          opacity: 0.85,
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          );
        })}
      </Box>
    </Box>
  );
}
