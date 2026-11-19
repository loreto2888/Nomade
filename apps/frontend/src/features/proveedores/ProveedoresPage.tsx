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
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { useMemo, useState } from 'react';
import { mensajeDeError } from '@/api/errores';
import { useEliminarProveedor, useProveedores, type ProveedorDto } from '@/api/proveedores';
import { useSesion } from '@/app/sesion';
import { AdjuntosDialog } from '@/components/AdjuntosDialog';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatearRut } from '@/lib/rut';
import { useTablaServidor } from '@/lib/useTablaServidor';
import { CuentasBancariasDialog } from './CuentasBancariasDialog';
import { FormularioProveedor } from './FormularioProveedor';

const CAMPOS_ORDEN = ['razonSocial', 'rut', 'creadoEn'] as const;
const TAMANIOS_PAGINA = [10, 25, 50];

type EstadoFormulario = { proveedor?: ProveedorDto } | null;

/** P22 — Proveedores y contratistas. Los datos bancarios solo los ve y modifica el administrador. */
export function ProveedoresPage() {
  const sesion = useSesion();
  const esAdmin = sesion.rol === 'admin';
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });
  const tabla = useTablaServidor(CAMPOS_ORDEN);

  const [formulario, setFormulario] = useState<EstadoFormulario>(null);
  const [menu, setMenu] = useState<{ ancla: HTMLElement; proveedor: ProveedorDto } | null>(null);
  const [aEliminar, setAEliminar] = useState<ProveedorDto | null>(null);
  const [adjuntos, setAdjuntos] = useState<ProveedorDto | null>(null);
  const [bancarios, setBancarios] = useState<ProveedorDto | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const consulta = useProveedores(tabla.parametros);
  const eliminar = useEliminarProveedor();

  const columnas = useMemo<GridColDef<ProveedorDto>[]>(
    () => [
      {
        field: 'razonSocial',
        headerName: 'Proveedor',
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Box sx={{ py: 0.75, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
              {row.razonSocial}
            </Typography>
            {row.nombreFantasia && (
              <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
                {row.nombreFantasia}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'rut',
        headerName: 'RUT',
        width: 130,
        valueGetter: (_valor, row) => formatearRut(row.rut),
      },
      {
        field: 'contacto',
        headerName: 'Contacto',
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ py: 0.75, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13 }}>
              {row.contactoNombre ?? '—'}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
              {[row.correo, row.telefono].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'tieneDatosBancarios',
        headerName: 'Datos bancarios',
        width: 150,
        sortable: false,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            color={row.tieneDatosBancarios ? 'success' : 'default'}
            variant={row.tieneDatosBancarios ? 'filled' : 'outlined'}
            label={row.tieneDatosBancarios ? 'Registrados' : 'Sin registrar'}
          />
        ),
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
            aria-label={`Acciones de ${row.razonSocial}`}
            aria-haspopup="menu"
            onClick={(e) => setMenu({ ancla: e.currentTarget, proveedor: row })}
          >
            <MoreVertOutlined fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [],
  );

  const cerrarEliminar = () => {
    eliminar.reset();
    setAEliminar(null);
  };

  return (
    <>
      <CabeceraPagina
        eyebrow="Compras y gastos"
        titulo="Proveedores y contratistas"
        descripcion="Administra el directorio de proveedores y contratistas."
        acciones={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setFormulario({})}>
            Nuevo proveedor
          </Button>
        }
      />

      <Card component="section" aria-label="Proveedores registrados">
        <Box sx={{ p: { xs: 1.5, md: 2.25 } }}>
          <TextField
            size="small"
            fullWidth
            label="Buscar por razón social o RUT"
            value={tabla.busqueda}
            onChange={(e) => tabla.buscar(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
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
          rows={consulta.data?.items ?? []}
          columns={columnas}
          loading={consulta.isFetching}
          rowCount={consulta.data?.total ?? 0}
          paginationMode="server"
          paginationModel={tabla.paginacion}
          onPaginationModelChange={tabla.setPaginacion}
          pageSizeOptions={TAMANIOS_PAGINA}
          sortingMode="server"
          sortModel={tabla.orden}
          onSortModelChange={tabla.setOrden}
          columnVisibilityModel={{
            contacto: !esMovil,
            rut: !esMovil,
            tieneDatosBancarios: !esMovil,
          }}
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
              setFormulario({ proveedor: menu.proveedor });
              setMenu(null);
            }}
          >
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        {menu && esAdmin && (
          <MenuItem
            onClick={() => {
              setBancarios(menu.proveedor);
              setMenu(null);
            }}
          >
            <ListItemText>Datos bancarios</ListItemText>
          </MenuItem>
        )}
        {menu && (
          <MenuItem
            onClick={() => {
              setAdjuntos(menu.proveedor);
              setMenu(null);
            }}
          >
            <ListItemText>Adjuntos</ListItemText>
          </MenuItem>
        )}
        {menu && (
          <MenuItem
            onClick={() => {
              setAEliminar(menu.proveedor);
              setMenu(null);
            }}
          >
            <ListItemText>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <FormularioProveedor
        abierto={formulario !== null}
        proveedor={formulario?.proveedor}
        onCerrar={() => setFormulario(null)}
        onGuardado={(proveedor, creado) => {
          setFormulario(null);
          setAviso(
            creado
              ? `Se creó el proveedor ${proveedor.razonSocial}.`
              : `Se guardaron los cambios de ${proveedor.razonSocial}.`,
          );
        }}
        onConflicto={() => {
          setFormulario(null);
          void consulta.refetch();
          setAviso('Se recargó la lista con los datos más recientes.');
        }}
      />

      {esAdmin && (
        <CuentasBancariasDialog
          abierto={bancarios !== null}
          proveedor={bancarios}
          onCerrar={() => setBancarios(null)}
        />
      )}

      <ConfirmDialog
        abierto={aEliminar !== null}
        titulo="Eliminar proveedor"
        descripcion={`Se eliminará ${aEliminar?.razonSocial ?? ''}. El registro se conserva para el historial, pero deja de ofrecerse.`}
        textoConfirmar="Eliminar"
        peligro
        pedirMotivo
        cargando={eliminar.isPending}
        error={eliminar.isError ? mensajeDeError(eliminar.error) : null}
        onConfirmar={(motivo) => {
          if (!aEliminar) return;
          eliminar.mutate(
            { id: aEliminar.id, version: aEliminar.version, motivo },
            {
              onSuccess: () => {
                setAviso(`Se eliminó el proveedor ${aEliminar.razonSocial}.`);
                cerrarEliminar();
              },
            },
          );
        }}
        onCancelar={cerrarEliminar}
      />

      <AdjuntosDialog
        abierto={adjuntos !== null}
        entidadTipo="proveedor"
        entidadId={adjuntos?.id ?? null}
        nombre={adjuntos?.razonSocial ?? ''}
        onCerrar={() => setAdjuntos(null)}
      />

      <Snackbar
        open={aviso !== null}
        autoHideDuration={5000}
        onClose={() => setAviso(null)}
        message={aviso ?? ''}
      />
    </>
  );
}
