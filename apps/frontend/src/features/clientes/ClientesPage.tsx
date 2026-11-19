import AddOutlined from '@mui/icons-material/AddOutlined';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
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
import { useClientes, useEliminarCliente, type ClienteDto } from '@/api/clientes';
import { mensajeDeError } from '@/api/errores';
import { AdjuntosDialog } from '@/components/AdjuntosDialog';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatearRut } from '@/lib/rut';
import { useTablaServidor } from '@/lib/useTablaServidor';
import { FormularioCliente } from './FormularioCliente';

const CAMPOS_ORDEN = ['razonSocial', 'rut', 'creadoEn'] as const;
const TAMANIOS_PAGINA = [10, 25, 50];

type EstadoFormulario = { cliente?: ClienteDto } | null;

/** Clientes (mandantes de las obras). */
export function ClientesPage() {
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });
  const tabla = useTablaServidor(CAMPOS_ORDEN);

  const [formulario, setFormulario] = useState<EstadoFormulario>(null);
  const [menu, setMenu] = useState<{ ancla: HTMLElement; cliente: ClienteDto } | null>(null);
  const [aEliminar, setAEliminar] = useState<ClienteDto | null>(null);
  const [adjuntos, setAdjuntos] = useState<ClienteDto | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const consulta = useClientes(tabla.parametros);
  const eliminar = useEliminarCliente();

  const columnas = useMemo<GridColDef<ClienteDto>[]>(
    () => [
      {
        field: 'razonSocial',
        headerName: 'Cliente',
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
            onClick={(e) => setMenu({ ancla: e.currentTarget, cliente: row })}
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
        eyebrow="Obras"
        titulo="Clientes"
        descripcion="Administra los clientes (mandantes) a los que pertenecen las obras."
        acciones={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setFormulario({})}>
            Nuevo cliente
          </Button>
        }
      />

      <Card component="section" aria-label="Clientes registrados">
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
          columnVisibilityModel={{ contacto: !esMovil, rut: !esMovil }}
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
              setFormulario({ cliente: menu.cliente });
              setMenu(null);
            }}
          >
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        {menu && (
          <MenuItem
            onClick={() => {
              setAdjuntos(menu.cliente);
              setMenu(null);
            }}
          >
            <ListItemText>Adjuntos</ListItemText>
          </MenuItem>
        )}
        {menu && (
          <MenuItem
            onClick={() => {
              setAEliminar(menu.cliente);
              setMenu(null);
            }}
          >
            <ListItemText>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <FormularioCliente
        abierto={formulario !== null}
        cliente={formulario?.cliente}
        onCerrar={() => setFormulario(null)}
        onGuardado={(cliente, creado) => {
          setFormulario(null);
          setAviso(
            creado
              ? `Se creó el cliente ${cliente.razonSocial}.`
              : `Se guardaron los cambios de ${cliente.razonSocial}.`,
          );
        }}
        onConflicto={() => {
          setFormulario(null);
          void consulta.refetch();
          setAviso('Se recargó la lista con los datos más recientes.');
        }}
      />

      <ConfirmDialog
        abierto={aEliminar !== null}
        titulo="Eliminar cliente"
        descripcion={`Se eliminará ${aEliminar?.razonSocial ?? ''}. No se puede eliminar un cliente con obras vigentes.`}
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
                setAviso(`Se eliminó el cliente ${aEliminar.razonSocial}.`);
                cerrarEliminar();
              },
            },
          );
        }}
        onCancelar={cerrarEliminar}
      />

      <AdjuntosDialog
        abierto={adjuntos !== null}
        entidadTipo="cliente"
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
