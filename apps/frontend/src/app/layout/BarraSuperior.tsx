import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import LockResetOutlined from '@mui/icons-material/LockResetOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useNavigate } from 'react-router';
import { useActualizarTemaUsuario, useCerrarSesion } from '@/api/auth';
import { RUTA_CAMBIAR_CLAVE, RUTA_INGRESAR } from '@/app/rutasAcceso';
import { ETIQUETA_ROL, useSesion } from '@/app/sesion';
import { ALTO_BARRA_SUPERIOR } from '@/app/theme';
import { SelectorTema } from '@/components/SelectorTema';
import { iniciales } from '@/lib/formato';

interface BarraSuperiorProps {
  titulo: string;
  /** Muestra el botón de menú (Drawer temporal, bajo `md`). */
  mostrarBotonMenu: boolean;
  menuAbierto: boolean;
  onAbrirMenu: () => void;
}

export function BarraSuperior({
  titulo,
  mostrarBotonMenu,
  menuAbierto,
  onAbrirMenu,
}: BarraSuperiorProps) {
  const sesion = useSesion();
  const navegar = useNavigate();
  const cerrarSesion = useCerrarSesion();
  const actualizarTema = useActualizarTemaUsuario();

  const salir = () => {
    cerrarSesion.mutate(undefined, {
      onSettled: () => void navegar(RUTA_INGRESAR, { replace: true }),
    });
  };

  return (
    <AppBar
      position="sticky"
      aria-label="Barra superior"
      sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
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
              sx={{ mr: 1, color: 'primary.main' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Breadcrumbs
            aria-label="Ubicación"
            sx={{
              fontSize: 12,
              color: 'apoyo.migas',
              minWidth: 0,
              '& ol': { flexWrap: 'nowrap' },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            <Typography sx={{ fontSize: 12, color: 'inherit', whiteSpace: 'nowrap' }}>
              Espacio de trabajo
            </Typography>
            <Typography
              component="strong"
              aria-current="page"
              noWrap
              sx={{ fontSize: 12, fontWeight: 600, color: 'apoyo.migaActual' }}
            >
              {titulo}
            </Typography>
          </Breadcrumbs>
          {/* En pantallas pequeñas solo se muestra la ubicación actual. */}
          <Typography
            noWrap
            sx={{
              display: { xs: 'block', sm: 'none' },
              fontSize: 13,
              fontWeight: 700,
              color: 'apoyo.migaActual',
            }}
          >
            {titulo}
          </Typography>
        </Box>

        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1.5 }, flexShrink: 0 }}
        >
          <IconButton
            component={RouterLink}
            to="/alertas"
            aria-label="Ver alertas"
            sx={{ color: 'apoyo.iconoBarra' }}
          >
            <NotificationsNoneOutlined fontSize="small" />
          </IconButton>
          <SelectorTema onCambio={(modo) => actualizarTema.mutate(modo)} />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              borderLeft: 1,
              borderColor: 'divider',
              pl: { xs: 1, md: 2 },
            }}
          >
            <Avatar
              aria-hidden
              sx={{
                width: 34,
                height: 34,
                bgcolor: 'apoyo.avatarFondo',
                color: 'apoyo.avatarTexto',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {iniciales(sesion.nombre)}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 160 }}>
              <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>
                {sesion.nombre}
              </Typography>
              <Typography
                sx={{ fontSize: 10, color: 'apoyo.textoTenue', mt: '3px', lineHeight: 1.2 }}
              >
                {ETIQUETA_ROL[sesion.rol]}
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to={RUTA_CAMBIAR_CLAVE}
              aria-label="Cambiar contraseña"
              size="small"
              color="inherit"
              startIcon={<LockResetOutlined fontSize="small" />}
              sx={{
                minWidth: 0,
                minHeight: 34,
                color: 'apoyo.iconoBarra',
                '& .MuiButton-startIcon': { mr: { xs: 0, md: 0.75 }, ml: { xs: 0, md: -0.25 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                Clave
              </Box>
            </Button>
            <Button
              size="small"
              color="inherit"
              aria-label="Salir"
              onClick={salir}
              disabled={cerrarSesion.isPending}
              startIcon={<LogoutOutlined fontSize="small" />}
              sx={{
                minWidth: 0,
                minHeight: 34,
                color: 'apoyo.iconoBarra',
                '& .MuiButton-startIcon': { mr: { xs: 0, md: 0.75 }, ml: { xs: 0, md: -0.25 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                Salir
              </Box>
            </Button>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
