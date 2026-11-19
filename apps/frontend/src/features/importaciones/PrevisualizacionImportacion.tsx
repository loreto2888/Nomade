import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { useMemo, useState } from 'react';
import { Link as EnlaceRouter } from 'react-router';
import { esConflictoVersion, mensajeDeError } from '@/api/errores';
import {
  useConfirmarImportacion,
  useDescartarImportacion,
  useFilasImportacion,
  useImportacion,
  type FilaImportacionDto,
} from '@/api/importaciones';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusChip } from '@/components/StatusChip';
import { formatearMonto, formatearTamanio } from '@/lib/formato';
import { ESTADO_CHIP, ETIQUETA_ESTADO, TITULOS_CAMPO } from './estados';

interface PrevisualizacionImportacionProps {
  loteId: number;
  /** Se confirmó o descartó: el padre puede limpiar el formulario de subida. */
  onResuelto?: () => void;
}

/**
 * Previsualización de una planilla subida: resumen, filas con los errores de cada una y las
 * acciones «Confirmar» (solo sin errores) y «Descartar». Confirmar crea la versión en borrador.
 */
export function PrevisualizacionImportacion({
  loteId,
  onResuelto,
}: PrevisualizacionImportacionProps) {
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });
  const lote = useImportacion(loteId);
  const [soloErrores, setSoloErrores] = useState<boolean | null>(null);
  const [paginacion, setPaginacion] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const [dialogo, setDialogo] = useState<'confirmar' | 'descartar' | null>(null);
  const confirmar = useConfirmarImportacion();
  const descartar = useDescartarImportacion();

  // Por defecto solo se ven las filas con errores (si las hay): es lo que hay que corregir.
  const verSoloErrores = soloErrores ?? (lote.data ? lote.data.filasConError > 0 : false);
  // Las filas se piden cuando se conoce el lote (de él depende el filtro por defecto).
  const filas = useFilasImportacion(lote.data ? loteId : undefined, {
    pagina: paginacion.page + 1,
    tamanio: paginacion.pageSize,
    soloErrores: verSoloErrores,
  });

  const columnas = useMemo<GridColDef<FilaImportacionDto>[]>(
    () => [
      { field: 'numeroFila', headerName: 'Fila', width: 70, sortable: false },
      {
        field: 'estado',
        headerName: 'Validación',
        flex: 1,
        minWidth: 240,
        sortable: false,
        renderCell: ({ row }) =>
          row.valida ? (
            <Chip
              size="small"
              color="success"
              variant="outlined"
              icon={<CheckCircleOutlined />}
              label="Válida"
            />
          ) : (
            <Box sx={{ py: 0.75 }}>
              {row.errores.map((e) => (
                <Typography
                  key={`${e.campo}-${e.mensaje}`}
                  sx={{ fontSize: 12, color: 'error.main', whiteSpace: 'normal' }}
                >
                  <strong>{TITULOS_CAMPO[e.campo] ?? e.campo}:</strong> {e.mensaje}
                </Typography>
              ))}
            </Box>
          ),
      },
      {
        field: 'codigo',
        headerName: 'Código',
        width: 100,
        sortable: false,
        valueGetter: (_v, row) => row.datos.codigo ?? '—',
      },
      {
        field: 'familia',
        headerName: 'Familia',
        width: 160,
        sortable: false,
        valueGetter: (_v, row) => row.datos.familia ?? '—',
      },
      {
        field: 'descripcion',
        headerName: 'Descripción',
        flex: 1,
        minWidth: 180,
        sortable: false,
        valueGetter: (_v, row) => row.datos.descripcion ?? '—',
      },
      {
        field: 'unidad',
        headerName: 'Unidad',
        width: 80,
        sortable: false,
        valueGetter: (_v, row) => row.datos.unidad ?? '—',
      },
      {
        field: 'cantidad',
        headerName: 'Cantidad',
        width: 100,
        sortable: false,
        valueGetter: (_v, row) => row.datos.cantidad ?? '—',
      },
      {
        field: 'precioUnitario',
        headerName: 'Precio unit.',
        width: 120,
        sortable: false,
        valueGetter: (_v, row) => row.datos.precioUnitario ?? '—',
      },
    ],
    [],
  );

  if (lote.isError) {
    return <Alert severity="error">{mensajeDeError(lote.error)}</Alert>;
  }
  if (!lote.data) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
        <CircularProgress aria-label="Cargando la previsualización" />
      </Box>
    );
  }

  const l = lote.data;
  const pendiente = l.estado === 'previsualizado';
  const conErrores = l.filasConError > 0;
  const moneda = l.moneda ?? 'CLP';

  const cerrar = () => {
    confirmar.reset();
    descartar.reset();
    setDialogo(null);
  };
  const errorDe = (m: { isError: boolean; error: unknown }) =>
    m.isError ? mensajeDeError(m.error) : null;

  return (
    <Card component="section" aria-label="Previsualización de la importación">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: 16 }}>
            {l.nombreArchivo}
          </Typography>
          <StatusChip estado={ESTADO_CHIP[l.estado]} etiqueta={ETIQUETA_ESTADO[l.estado]} />
        </Box>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
          {l.obra ? `${l.obra.codigoCentroCosto} · ${l.obra.nombre}` : 'Sin obra'} ·{' '}
          {formatearTamanio(l.tamanioBytes)}
          {l.creadoPor ? ` · subido por ${l.creadoPor.nombre}` : ''}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip label={`${l.totalFilas} fila(s)`} />
          <Chip color="success" variant="outlined" label={`${l.filasValidas} válida(s)`} />
          <Chip
            color={conErrores ? 'error' : 'default'}
            variant={conErrores ? 'filled' : 'outlined'}
            icon={conErrores ? <ErrorOutlineOutlined /> : undefined}
            label={`${l.filasConError} con errores`}
          />
          <Chip label={`Monto de las filas válidas: ${formatearMonto(l.montoTotal, moneda)}`} />
        </Box>

        {pendiente && conErrores && (
          <Alert severity="error" sx={{ mb: 2 }}>
            La planilla tiene {l.filasConError} fila(s) con errores. Corrígelos en el archivo y
            vuelve a subirlo: no se puede confirmar mientras haya errores. No se creó nada en el
            presupuesto.
          </Alert>
        )}
        {pendiente && !conErrores && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Todas las filas son válidas. Al confirmar se creará una nueva versión del presupuesto en
            borrador, que luego se envía a revisión.
          </Alert>
        )}
        {l.estado === 'confirmado' && l.presupuestoVersionId !== null && l.obra && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                component={EnlaceRouter}
                to={`/obras/${l.obra.id}?pestana=presupuesto&version=${l.presupuestoVersionId}`}
              >
                Ver presupuesto
              </Button>
            }
          >
            Importación confirmada: se creó la versión de presupuesto en borrador.
          </Alert>
        )}
        {l.estado === 'descartado' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Esta importación fue descartada: no se creó nada en el presupuesto.
          </Alert>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={verSoloErrores}
              onChange={(e) => {
                setSoloErrores(e.target.checked);
                setPaginacion((p) => ({ ...p, page: 0 }));
              }}
            />
          }
          label="Mostrar solo las filas con errores"
        />

        {filas.isError && (
          <Alert severity="error" sx={{ my: 1 }}>
            {mensajeDeError(filas.error)}
          </Alert>
        )}
        <DataGrid
          rows={filas.data?.items ?? []}
          getRowId={(fila) => fila.numeroFila}
          columns={columnas}
          loading={filas.isFetching}
          rowCount={filas.data?.total ?? 0}
          paginationMode="server"
          paginationModel={paginacion}
          onPaginationModelChange={setPaginacion}
          pageSizeOptions={[25, 50, 100]}
          columnVisibilityModel={{
            unidad: !esMovil,
            cantidad: !esMovil,
            precioUnitario: !esMovil,
            familia: !esMovil,
          }}
          disableRowSelectionOnClick
          disableColumnMenu
          disableVirtualization={import.meta.env.MODE === 'test'}
          autoHeight
          getRowHeight={() => 'auto'}
          localeText={{
            ...esES.components.MuiDataGrid.defaultProps.localeText,
            noRowsLabel: verSoloErrores ? 'No hay filas con errores.' : 'No hay filas.',
          }}
          sx={{
            border: 1,
            borderColor: 'divider',
            '& .MuiDataGrid-cell': { alignItems: 'center', display: 'flex' },
          }}
        />

        {pendiente && (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 2 }}>
            <Button
              variant="contained"
              disabled={conErrores}
              onClick={() => setDialogo('confirmar')}
            >
              Confirmar importación
            </Button>
            <Button color="inherit" onClick={() => setDialogo('descartar')}>
              Descartar
            </Button>
          </Box>
        )}

        <ConfirmDialog
          abierto={dialogo === 'confirmar'}
          titulo="Confirmar importación"
          descripcion={`Se creará una nueva versión en borrador del presupuesto de ${
            l.obra ? `${l.obra.codigoCentroCosto} · ${l.obra.nombre}` : 'la obra'
          } con las ${l.totalFilas} partida(s) del archivo.`}
          textoConfirmar="Confirmar"
          cargando={confirmar.isPending}
          error={errorDe(confirmar)}
          onConfirmar={() =>
            confirmar.mutate(
              { id: l.id, version: l.version },
              {
                onSuccess: () => {
                  cerrar();
                  onResuelto?.();
                },
                onError: (error) => {
                  if (esConflictoVersion(error)) void lote.refetch();
                },
              },
            )
          }
          onCancelar={cerrar}
        />
        <ConfirmDialog
          abierto={dialogo === 'descartar'}
          titulo="Descartar importación"
          descripcion="Se descarta el archivo subido. No se crea nada en el presupuesto."
          textoConfirmar="Descartar"
          peligro
          pedirMotivo
          cargando={descartar.isPending}
          error={errorDe(descartar)}
          onConfirmar={(motivo) =>
            descartar.mutate(
              { id: l.id, version: l.version, motivo },
              {
                onSuccess: () => {
                  cerrar();
                  onResuelto?.();
                },
                onError: (error) => {
                  if (esConflictoVersion(error)) void lote.refetch();
                },
              },
            )
          }
          onCancelar={cerrar}
        />
      </CardContent>
    </Card>
  );
}
