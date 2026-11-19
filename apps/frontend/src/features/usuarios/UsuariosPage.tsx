import AddOutlined from '@mui/icons-material/AddOutlined';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { useMemo, useState } from 'react';
import { esConflictoVersion, mensajeDeError } from '@/api/errores';
import type { Rol, UsuarioDto } from '@/api/generated';
import {
  useActivarUsuario,
  useDesactivarUsuario,
  useRestablecerClave,
  useUsuarios,
} from '@/api/usuarios';
import { ETIQUETA_ROL, useSesion } from '@/app/sesion';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatearFechaHora } from '@/lib/formato';
import { useValorDiferido } from '@/lib/useValorDiferido';
import { ClaveTemporalDialog } from './ClaveTemporalDialog';
import { FormularioUsuario } from './FormularioUsuario';

type Accion = { tipo: 'desactivar' | 'activar' | 'restablecer'; usuario: UsuarioDto };
type EstadoFormulario = { usuario?: UsuarioDto } | null;

const TAMANIOS_PAGINA = [10, 25, 50];

/** P25 — Gestión de usuarios (solo admin). */
export function UsuariosPage() {
  const sesion = useSesion();
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });

  const [busqueda, setBusqueda] = useState('');
  const [rol, setRol] = useState<'' | Rol>('');
  const [estado, setEstado] = useState<'' | 'activos' | 'inactivos'>('');
  const [paginacion, setPaginacion] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const q = useValorDiferido(busqueda.trim());

  const [formulario, setFormulario] = useState<EstadoFormulario>(null);
  const [menu, setMenu] = useState<{ ancla: HTMLElement; usuario: UsuarioDto } | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [claveTemporal, setClaveTemporal] = useState<{ nombre: string; clave: string } | null>(
    null,
  );
  const [aviso, setAviso] = useState<string | null>(null);

  const consulta = useUsuarios({
    pagina: paginacion.page + 1,
    tamanio: paginacion.pageSize,
    q: q || undefined,
    rol: rol || undefined,
    activo: estado === '' ? undefined : estado === 'activos',
  });
  const desactivar = useDesactivarUsuario();
  const activar = useActivarUsuario();
  const restablecer = useRestablecerClave();

  const volverAPrimeraPagina = () => setPaginacion((p) => ({ ...p, page: 0 }));

  const columnas = useMemo<GridColDef<UsuarioDto>[]>(
    () => [
      {
        field: 'nombre',
        headerName: 'Usuario',
        flex: 1,
        minWidth: 190,
        renderCell: ({ row }) => (
          <Box sx={{ py: 0.75, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
              {row.nombre}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
              {row.correo}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'rol',
        headerName: 'Rol',
        width: 130,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            label={ETIQUETA_ROL[row.rol]}
            color={row.rol === 'admin' ? 'primary' : 'default'}
            variant={row.rol === 'admin' ? 'filled' : 'outlined'}
          />
        ),
      },
      {
        field: 'activo',
        headerName: 'Estado',
        width: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', py: 0.5 }}>
            <Chip
              size="small"
              label={row.activo ? 'Activo' : 'Desactivado'}
              color={row.activo ? 'success' : 'default'}
            />
            {row.activo && row.debeCambiarClave && (
              <Chip
                size="small"
                variant="outlined"
                color="warning"
                label="Cambio de clave pendiente"
              />
            )}
          </Box>
        ),
      },
      {
        field: 'ultimoAccesoEn',
        headerName: 'Último acceso',
        width: 170,
        valueGetter: (_valor, row) => formatearFechaHora(row.ultimoAccesoEn),
      },
      {
        field: 'acciones',
        headerName: 'Acciones',
        width: 90,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <IconButton
            aria-label={`Acciones de ${row.nombre}`}
            aria-haspopup="menu"
            onClick={(e) => setMenu({ ancla: e.currentTarget, usuario: row })}
          >
            <MoreVertOutlined fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [],
  );

  const cerrarAccion = () => {
    desactivar.reset();
    activar.reset();
    restablecer.reset();
    setAccion(null);
  };

  const confirmarAccion = (motivo: string | undefined) => {
    if (!accion) return;
    const { usuario } = accion;
    const datos = { id: usuario.id, version: usuario.version, motivo };
    if (accion.tipo === 'desactivar') {
      desactivar.mutate(datos, {
        onSuccess: () => {
          setAviso(`Se desactivó la cuenta de ${usuario.nombre}.`);
          cerrarAccion();
        },
      });
    } else if (accion.tipo === 'activar') {
      activar.mutate(datos, {
        onSuccess: () => {
          setAviso(`Se reactivó la cuenta de ${usuario.nombre}.`);
          cerrarAccion();
        },
      });
    } else {
      restablecer.mutate(datos, {
        onSuccess: (resultado) => {
          cerrarAccion();
          setClaveTemporal({ nombre: usuario.nombre, clave: resultado.claveTemporal });
        },
      });
    }
  };

  const mutacionActual =
    accion?.tipo === 'desactivar' ? desactivar : accion?.tipo === 'activar' ? activar : restablecer;
  const errorAccion = mutacionActual.isError
    ? esConflictoVersion(mutacionActual.error)
      ? 'Otra persona modificó este usuario. Cierra este diálogo y revisa la lista actualizada.'
      : mensajeDeError(mutacionActual.error)
    : null;

  const textosAccion =
    accion &&
    {
      desactivar: {
        titulo: 'Desactivar usuario',
        texto: `${accion.usuario.nombre} ya no podrá ingresar y se cerrarán sus sesiones. La cuenta no se elimina: puedes reactivarla cuando quieras.`,
        boton: 'Desactivar',
      },
      activar: {
        titulo: 'Reactivar usuario',
        texto: `${accion.usuario.nombre} podrá volver a ingresar con su contraseña actual.`,
        boton: 'Reactivar',
      },
      restablecer: {
        titulo: 'Restablecer contraseña',
        texto: `Se generará una contraseña temporal para ${accion.usuario.nombre}, se cerrarán sus sesiones y deberá cambiarla al ingresar.`,
        boton: 'Restablecer',
      },
    }[accion.tipo];

  const filas = consulta.data?.items ?? [];

  return (
    <>
      <CabeceraPagina
        eyebrow="Administración"
        titulo="Usuarios y permisos"
        descripcion="Administra las cuentas de usuario, sus roles y su estado."
        acciones={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setFormulario({})}>
            Nuevo usuario
          </Button>
        }
      />

      <Card component="section" aria-label="Usuarios registrados">
        <Box
          sx={{
            p: { xs: 1.5, md: 2.25 },
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' },
          }}
        >
          <TextField
            size="small"
            label="Buscar por nombre o correo"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              volverAPrimeraPagina();
            }}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            select
            size="small"
            label="Rol"
            value={rol}
            onChange={(e) => {
              setRol(e.target.value as '' | Rol);
              volverAPrimeraPagina();
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="admin">Administrador</MenuItem>
            <MenuItem value="usuario">Usuario</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as '' | 'activos' | 'inactivos');
              volverAPrimeraPagina();
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="activos">Activos</MenuItem>
            <MenuItem value="inactivos">Desactivados</MenuItem>
          </TextField>
        </Box>

        {consulta.isError && (
          <Alert
            severity="error"
            sx={{ mx: 2, mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => void consulta.refetch()}>
                Reintentar
              </Button>
            }
          >
            {mensajeDeError(consulta.error)}
          </Alert>
        )}

        <DataGrid
          rows={filas}
          columns={columnas}
          loading={consulta.isFetching}
          rowCount={consulta.data?.total ?? 0}
          paginationMode="server"
          paginationModel={paginacion}
          onPaginationModelChange={setPaginacion}
          pageSizeOptions={TAMANIOS_PAGINA}
          columnVisibilityModel={{ ultimoAccesoEn: !esMovil, rol: !esMovil }}
          disableRowSelectionOnClick
          disableColumnMenu
          disableVirtualization={import.meta.env.MODE === 'test'}
          autoHeight
          getRowHeight={() => 'auto'}
          localeText={esES.components.MuiDataGrid.defaultProps.localeText}
          sx={{ border: 0, '& .MuiDataGrid-cell': { alignItems: 'center', display: 'flex' } }}
        />
      </Card>

      <Menu open={menu !== null} anchorEl={menu?.ancla} onClose={() => setMenu(null)}>
        {menu && (
          <MenuItem
            onClick={() => {
              setFormulario({ usuario: menu.usuario });
              setMenu(null);
            }}
          >
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        {menu && (
          <MenuItem
            onClick={() => {
              setAccion({ tipo: 'restablecer', usuario: menu.usuario });
              setMenu(null);
            }}
          >
            <ListItemText>Restablecer contraseña</ListItemText>
          </MenuItem>
        )}
        {menu &&
          (menu.usuario.activo ? (
            <MenuItem
              disabled={menu.usuario.id === sesion.id}
              onClick={() => {
                setAccion({ tipo: 'desactivar', usuario: menu.usuario });
                setMenu(null);
              }}
            >
              <ListItemText
                secondary={
                  menu.usuario.id === sesion.id ? 'No puedes desactivarte a ti mismo' : undefined
                }
              >
                Desactivar
              </ListItemText>
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                setAccion({ tipo: 'activar', usuario: menu.usuario });
                setMenu(null);
              }}
            >
              <ListItemText>Reactivar</ListItemText>
            </MenuItem>
          ))}
      </Menu>

      <FormularioUsuario
        abierto={formulario !== null}
        usuario={formulario?.usuario}
        usuarioActualId={sesion.id}
        onCerrar={() => setFormulario(null)}
        onCreado={(resultado) => {
          setFormulario(null);
          setClaveTemporal({ nombre: resultado.usuario.nombre, clave: resultado.claveTemporal });
        }}
        onActualizado={(usuario) => {
          setFormulario(null);
          setAviso(`Se guardaron los cambios de ${usuario.nombre}.`);
        }}
        onConflicto={() => {
          setFormulario(null);
          void consulta.refetch();
          setAviso('Se recargó la lista con los datos más recientes.');
        }}
      />

      <ConfirmDialog
        abierto={accion !== null}
        titulo={textosAccion?.titulo ?? ''}
        descripcion={textosAccion?.texto}
        textoConfirmar={textosAccion?.boton}
        peligro={accion?.tipo === 'desactivar'}
        pedirMotivo
        cargando={mutacionActual.isPending}
        error={errorAccion}
        onConfirmar={confirmarAccion}
        onCancelar={cerrarAccion}
      />

      <ClaveTemporalDialog
        abierto={claveTemporal !== null}
        nombre={claveTemporal?.nombre ?? ''}
        clave={claveTemporal?.clave ?? ''}
        onCerrar={() => setClaveTemporal(null)}
      />

      <Snackbar
        open={aviso !== null}
        autoHideDuration={6000}
        onClose={() => setAviso(null)}
        message={aviso}
      />
    </>
  );
}
