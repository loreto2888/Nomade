import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { useSesion } from '@/app/sesion';
import { ALTO_BARRA_SUPERIOR, tokens } from '@/app/theme';

interface BarraSuperiorProps {
  titulo: string;
  /** Muestra el botón de menú (Drawer temporal, bajo `md`). */
  mostrarBotonMenu: boolean;
  menuAbierto: boolean;
  onAbrirMenu: () => void;
}

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase();

export function BarraSuperior({
  titulo,
  mostrarBotonMenu,
  menuAbierto,
  onAbrirMenu,
}: BarraSuperiorProps) {
  const sesion = useSesion();

  return (
    <AppBar
      position="sticky"
      sx={{ bgcolor: 'background.paper', borderBottom: `1px solid ${tokens.divisor}` }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: { xs: 64, md: ALTO_BARRA_SUPERIOR },
          px: { xs: 2.25, md: 5.25 },
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {mostrarBotonMenu && (
            <IconButton
              edge="start"
              aria-label="Abrir menú"
              aria-controls="menu-lateral"
              aria-expanded={menuAbierto}
              onClick={onAbrirMenu}
              sx={{ mr: 1, color: '#315444' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Breadcrumbs
            aria-label="Ubicación"
            sx={{ fontSize: 12, color: '#99a69d', minWidth: 0, '& ol': { flexWrap: 'nowrap' } }}
          >
            <Typography sx={{ fontSize: 12, color: 'inherit', whiteSpace: 'nowrap' }}>
              Espacio de trabajo
            </Typography>
            <Typography
              component="strong"
              aria-current="page"
              noWrap
              sx={{ fontSize: 12, fontWeight: 600, color: '#40554a' }}
            >
              {titulo}
            </Typography>
          </Breadcrumbs>
        </Box>

        {/* Espacio para alertas y perfil (sin autenticación todavía). */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2.75 }, flexShrink: 0 }}
        >
          <IconButton
            component={RouterLink}
            to="/alertas"
            aria-label="Ver alertas"
            sx={{ color: '#718378' }}
          >
            <NotificationsNoneOutlined fontSize="small" />
          </IconButton>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              borderLeft: `1px solid ${tokens.divisor}`,
              pl: { xs: 1.25, md: 2.75 },
            }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: '#e8ede2',
                color: '#42634e',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {iniciales(sesion.nombre)}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>
                {sesion.nombre}
              </Typography>
              <Typography sx={{ fontSize: 10, color: '#9daaa1', mt: '3px', lineHeight: 1.2 }}>
                {sesion.rol === 'admin' ? 'Administrador' : 'Usuario'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
