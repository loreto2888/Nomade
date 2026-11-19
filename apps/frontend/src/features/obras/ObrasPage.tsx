import AddOutlined from '@mui/icons-material/AddOutlined';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
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
import { Link as EnlaceRouter, useNavigate } from 'react-router';
import { useCatalogo } from '@/api/catalogos';
import { mensajeDeError } from '@/api/errores';
import { useEliminarObra, useObras, type ObraDto } from '@/api/obras';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusChip } from '@/components/StatusChip';
import { formatCLP, formatearFecha, formatearMonto } from '@/lib/formato';
import { useTablaServidor } from '@/lib/useTablaServidor';

const CAMPOS_ORDEN = ['codigoCentroCosto', 'nombre', 'cliente', 'estado', 'fechaInicio'] as const;
const TAMANIOS_PAGINA = [10, 25, 50];

/** P03 — Obras y centros de costo. Todos los usuarios ven todas las obras (D-03). */
export function ObrasPage() {
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });
  const navegar = useNavigate();
  const tabla = useTablaServidor(CAMPOS_ORDEN);
  const [estadoId, setEstadoId] = useState<number | ''>('');

  const [menu, setMenu] = useState<{ ancla: HTMLElement; obra: ObraDto } | null>(null);
  const [aEliminar, setAEliminar] = useState<ObraDto | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const estados = useCatalogo('estado_obra');
  const consulta = useObras({
    ...tabla.parametros,
    estadoId: estadoId === '' ? undefined : estadoId,
  });
  const eliminar = useEliminarObra();

  const columnas = useMemo<GridColDef<ObraDto>[]>(
    () => [
      {
        field: 'codigoCentroCosto',
        headerName: 'Centro de costo',
        width: 140,
        renderCell: ({ row }) => (
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.codigoCentroCosto}</Typography>
        ),
      },
      {
        field: 'nombre',
        headerName: 'Obra',
        flex: 1.3,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Box sx={{ py: 0.75, minWidth: 0 }}>
            <Link
              component={EnlaceRouter}
              to={`/obras/${row.id}`}
              underline="hover"
              sx={{ fontSize: 13, fontWeight: 700, display: 'block', whiteSpace: 'normal' }}
            >
              {row.nombre}
            </Link>
            <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
              {esMovil
                ? `${row.codigoCentroCosto} · ${row.cliente.razonSocial}`
                : (row.responsable ?? 'Sin responsable')}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'cliente',
        headerName: 'Cliente',
        flex: 1,
        minWidth: 180,
        valueGetter: (_valor, row) => row.cliente.razonSocial,
      },
      {
        field: 'estado',
        headerName: 'Estado',
        width: 150,
        renderCell: ({ row }) => (
          <StatusChip estado={row.estado.codigo} etiqueta={row.estado.nombre} />
        ),
      },
      {
        field: 'fechaInicio',
        headerName: 'Inicio',
        width: 130,
        valueGetter: (_valor, row) => formatearFecha(row.fechaInicio),
      },
      {
        field: 'montoContrato',
        headerName: 'Contrato',
        width: 170,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <Box sx={{ py: 0.75, textAlign: 'right' }}>
            <Typography sx={{ fontSize: 13 }}>
              {formatearMonto(row.montoContrato, row.monedaContrato)}
            </Typography>
            {row.monedaContrato === 'UF' && row.montoContratoClp !== null && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                ≈ {formatCLP(row.montoContratoClp)}
              </Typography>
            )}
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
            aria-label={`Acciones de ${row.nombre}`}
            aria-haspopup="menu"
            onClick={(e) => setMenu({ ancla: e.currentTarget, obra: row })}
          >
            <MoreVertOutlined fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [esMovil],
  );

  const cerrarEliminar = () => {
    eliminar.reset();
    setAEliminar(null);
  };

  return (
    <>
      <CabeceraPagina
        eyebrow="Obras"
        titulo="Obras y centros de costo"
        descripcion="Consulta y administra tus obras y centros de costo en un solo lugar."
        acciones={
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            component={EnlaceRouter}
            to="/obras/nueva"
          >
            Nueva obra
          </Button>
        }
      />

      <Card component="section" aria-label="Obras registradas">
        <Box
          sx={{
            p: { xs: 1.5, md: 2.25 },
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
          }}
        >
          <TextField
            size="small"
            label="Buscar por obra, centro de costo, responsable o cliente"
            value={tabla.busqueda}
            onChange={(e) => tabla.buscar(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            select
            size="small"
            label="Estado"
            value={estadoId}
            onChange={(e) => {
              setEstadoId(e.target.value === '' ? '' : Number(e.target.value));
              tabla.primeraPagina();
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            {(estados.data ?? []).map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.nombre}
              </MenuItem>
            ))}
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
            codigoCentroCosto: !esMovil,
            cliente: !esMovil,
            fechaInicio: !esMovil,
            montoContrato: !esMovil,
          }}
          disableRowSelectionOnClick
          disableColumnMenu
          disableVirtualization={import.meta.env.MODE === 'test'}
          autoHeight
          getRowHeight={() => 'auto'}
          localeText={{
            ...esES.components.MuiDataGrid.defaultProps.localeText,
            noRowsLabel: 'No hay obras que coincidan con la búsqueda.',
          }}
          sx={{ border: 0, '& .MuiDataGrid-cell': { alignItems: 'center', display: 'flex' } }}
        />
      </Card>

      <Menu open={menu !== null} anchorEl={menu?.ancla} onClose={() => setMenu(null)}>
        {menu && (
          <MenuItem
            onClick={() => {
              void navegar(`/obras/${menu.obra.id}`);
              setMenu(null);
            }}
          >
            <ListItemText>Ver ficha</ListItemText>
          </MenuItem>
        )}
        {menu && (
          <MenuItem
            disabled={menu.obra.estado.codigo === 'cerrada'}
            onClick={() => {
              void navegar(`/obras/${menu.obra.id}/editar`);
              setMenu(null);
            }}
          >
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        {menu && (
          <MenuItem
            disabled={menu.obra.estado.codigo !== 'en_preparacion'}
            onClick={() => {
              setAEliminar(menu.obra);
              setMenu(null);
            }}
          >
            <ListItemText
              secondary={
                menu.obra.estado.codigo !== 'en_preparacion'
                  ? 'Solo obras en preparación'
                  : undefined
              }
            >
              Eliminar
            </ListItemText>
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        abierto={aEliminar !== null}
        titulo="Eliminar obra"
        descripcion={`Se eliminará la obra ${aEliminar?.nombre ?? ''} (${aEliminar?.codigoCentroCosto ?? ''}). El registro se conserva para el historial.`}
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
                setAviso(`Se eliminó la obra ${aEliminar.nombre}.`);
                cerrarEliminar();
              },
            },
          );
        }}
        onCancelar={cerrarEliminar}
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
