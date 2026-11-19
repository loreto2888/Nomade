import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { useMemo, useState } from 'react';
import { mensajeDeError } from '@/api/errores';
import type { PartidaDto, PresupuestoVersionDto } from '@/api/generated';
import { useEliminarPartida } from '@/api/presupuestos';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatearMonto } from '@/lib/formato';
import { formatearCantidad } from '@/lib/presupuesto';
import { PartidaDialog } from './PartidaDialog';

interface EditorPartidasProps {
  version: PresupuestoVersionDto;
  partidas: PartidaDto[];
  /** Solo un borrador (de una obra abierta) admite agregar, modificar y quitar partidas. */
  editable: boolean;
  onAviso: (mensaje: string) => void;
  /** Se pide recargar los datos (conflicto de versión). */
  onRecargar: () => void;
}

const coincide = (p: PartidaDto, texto: string): boolean => {
  const t = texto.trim().toLowerCase();
  return (
    t === '' ||
    p.codigo.toLowerCase().includes(t) ||
    p.descripcion.toLowerCase().includes(t) ||
    p.familia.nombre.toLowerCase().includes(t)
  );
};

/**
 * Partidas de una versión. En un borrador permite agregar, editar y quitar (formulario en
 * diálogo, apto para celular); en cualquier otro estado es de solo lectura.
 */
export function EditorPartidas({
  version,
  partidas,
  editable,
  onAviso,
  onRecargar,
}: EditorPartidasProps) {
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });
  const eliminar = useEliminarPartida(version.id);
  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState<{ partida?: PartidaDto } | null>(null);
  const [aEliminar, setAEliminar] = useState<PartidaDto | null>(null);
  const moneda = version.moneda;

  const filas = useMemo(() => partidas.filter((p) => coincide(p, busqueda)), [partidas, busqueda]);

  const columnas = useMemo<GridColDef<PartidaDto>[]>(
    () => [
      {
        field: 'codigo',
        headerName: 'Código',
        width: 100,
        renderCell: ({ row }) => (
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{row.codigo}</Typography>
        ),
      },
      {
        field: 'descripcion',
        headerName: 'Descripción',
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Box sx={{ py: 0.75, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, whiteSpace: 'normal' }}>{row.descripcion}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {row.familia.nombre}
              {esMovil ? ` · ${formatearCantidad(row.cantidad)} ${row.unidad}` : ''}
            </Typography>
          </Box>
        ),
      },
      { field: 'unidad', headerName: 'Unidad', width: 80 },
      {
        field: 'cantidad',
        headerName: 'Cantidad',
        type: 'number',
        width: 110,
        valueFormatter: (valor: number) => formatearCantidad(valor),
      },
      {
        field: 'precioUnitario',
        headerName: `Precio unit. (${moneda})`,
        type: 'number',
        width: 150,
        valueFormatter: (valor: number) => formatearMonto(valor, moneda),
      },
      {
        field: 'total',
        headerName: `Total (${moneda})`,
        type: 'number',
        width: 150,
        valueFormatter: (valor: number) => formatearMonto(valor, moneda),
      },
      ...(editable
        ? [
            {
              field: 'acciones',
              headerName: 'Acciones',
              width: 100,
              sortable: false,
              align: 'right' as const,
              headerAlign: 'right' as const,
              renderCell: ({ row }: { row: PartidaDto }) => (
                <Box sx={{ display: 'flex' }}>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      aria-label={`Editar la partida ${row.codigo}`}
                      onClick={() => setFormulario({ partida: row })}
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Quitar">
                    <IconButton
                      size="small"
                      aria-label={`Quitar la partida ${row.codigo}`}
                      onClick={() => setAEliminar(row)}
                    >
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ),
            } satisfies GridColDef<PartidaDto>,
          ]
        : []),
    ],
    [moneda, editable, esMovil],
  );

  const cerrarEliminar = () => {
    eliminar.reset();
    setAEliminar(null);
  };

  return (
    <Box component="section" aria-label="Partidas de la versión">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Typography variant="h6" component="h3" sx={{ fontSize: 15 }}>
          Partidas ({partidas.length})
        </Typography>
        {editable && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddOutlined />}
            onClick={() => setFormulario({})}
          >
            Agregar partida
          </Button>
        )}
      </Box>

      {partidas.length > 0 && (
        <TextField
          size="small"
          fullWidth
          label="Buscar por código, descripción o familia"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          sx={{ mb: 1.5 }}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
      )}

      {!editable && version.estado === 'borrador' && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          La obra está cerrada: el presupuesto es de solo lectura.
        </Alert>
      )}

      <DataGrid
        rows={filas}
        columns={columnas}
        columnVisibilityModel={{ unidad: !esMovil, precioUnitario: !esMovil, cantidad: !esMovil }}
        initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
        pageSizeOptions={[25, 50, 100]}
        disableRowSelectionOnClick
        disableColumnMenu
        disableVirtualization={import.meta.env.MODE === 'test'}
        autoHeight
        getRowHeight={() => 'auto'}
        localeText={{
          ...esES.components.MuiDataGrid.defaultProps.localeText,
          noRowsLabel:
            partidas.length === 0
              ? editable
                ? 'Esta versión aún no tiene partidas. Agrega la primera.'
                : 'Esta versión no tiene partidas.'
              : 'No hay partidas que coincidan con la búsqueda.',
        }}
        sx={{
          border: 1,
          borderColor: 'divider',
          '& .MuiDataGrid-cell': { alignItems: 'center', display: 'flex' },
        }}
      />

      <PartidaDialog
        abierto={formulario !== null}
        version={version}
        partida={formulario?.partida}
        onCerrar={() => setFormulario(null)}
        onGuardada={(partida, creada) => {
          setFormulario(null);
          onAviso(
            creada
              ? `Se agregó la partida ${partida.codigo}.`
              : `Se guardaron los cambios de la partida ${partida.codigo}.`,
          );
        }}
        onConflicto={() => {
          setFormulario(null);
          onRecargar();
        }}
      />

      <ConfirmDialog
        abierto={aEliminar !== null}
        titulo="Quitar partida"
        descripcion={`Se quitará la partida ${aEliminar?.codigo ?? ''} (${aEliminar?.descripcion ?? ''}) de este borrador.`}
        textoConfirmar="Quitar"
        peligro
        cargando={eliminar.isPending}
        error={eliminar.isError ? mensajeDeError(eliminar.error) : null}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminar.mutate(
            { partidaId: aEliminar.id, version: aEliminar.version },
            {
              onSuccess: () => {
                onAviso(`Se quitó la partida ${aEliminar.codigo}.`);
                cerrarEliminar();
              },
              onError: onRecargar,
            },
          );
        }}
        onCancelar={cerrarEliminar}
      />
    </Box>
  );
}
