import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { mensajeDeError } from '@/api/errores';
import {
  URL_PLANTILLA_PRESUPUESTO,
  useImportaciones,
  useSubirImportacionPresupuesto,
  type ImportacionLoteDto,
} from '@/api/importaciones';
import { useObra, useObras, type ObraDto } from '@/api/obras';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { StatusChip } from '@/components/StatusChip';
import { formatearFechaHora } from '@/lib/formato';
import { useValorDiferido } from '@/lib/useValorDiferido';
import {
  ESTADO_CHIP,
  ETIQUETA_ESTADO,
  EXTENSIONES_IMPORTACION,
  validarArchivoImportacion,
} from './estados';
import { PrevisualizacionImportacion } from './PrevisualizacionImportacion';

const etiquetaObra = (o: Pick<ObraDto, 'codigoCentroCosto' | 'nombre'>) =>
  `${o.codigoCentroCosto} · ${o.nombre}`;

/**
 * P24 — Importación masiva (solo administradores, D-11). Hoy importa presupuestos: se descarga la
 * plantilla, se sube la planilla, se previsualizan los errores fila a fila y, sin errores, se
 * confirma para crear una versión de presupuesto en borrador.
 */
export function ImportacionesPage() {
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });
  const [parametros, setParametros] = useSearchParams();
  const entradaArchivo = useRef<HTMLInputElement>(null);
  const subir = useSubirImportacionPresupuesto();

  const obraPedida = Number(parametros.get('obra'));
  const lotePedido = Number(parametros.get('lote'));
  const loteId = Number.isInteger(lotePedido) && lotePedido > 0 ? lotePedido : undefined;

  const [obra, setObra] = useState<Pick<ObraDto, 'id' | 'codigoCentroCosto' | 'nombre'> | null>(
    null,
  );
  const [busqueda, setBusqueda] = useState('');
  const q = useValorDiferido(busqueda.trim());
  const obras = useObras({ pagina: 1, tamanio: 50, q: q || undefined });
  const obraDeUrl = useObra(
    Number.isInteger(obraPedida) && obraPedida > 0 ? obraPedida : undefined,
  );
  // La obra elegida a mano manda; si no, la de `?obra=` (enlace desde la pestaña Presupuesto).
  const obraEfectiva = obra ?? obraDeUrl.data ?? null;

  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [paginacion, setPaginacion] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const historial = useImportaciones({ pagina: paginacion.page + 1, tamanio: paginacion.pageSize });

  const columnas = useMemo<GridColDef<ImportacionLoteDto>[]>(
    () => [
      {
        field: 'nombreArchivo',
        headerName: 'Archivo',
        flex: 1,
        minWidth: 180,
        renderCell: ({ row }) => (
          <Button
            size="small"
            onClick={() => setParametros({ lote: String(row.id) })}
            sx={{ textAlign: 'left' }}
          >
            {row.nombreArchivo}
          </Button>
        ),
      },
      {
        field: 'obra',
        headerName: 'Obra',
        width: 200,
        valueGetter: (_v, row) => (row.obra ? etiquetaObra(row.obra) : '—'),
      },
      {
        field: 'estado',
        headerName: 'Estado',
        width: 190,
        renderCell: ({ row }) => (
          <StatusChip estado={ESTADO_CHIP[row.estado]} etiqueta={ETIQUETA_ESTADO[row.estado]} />
        ),
      },
      {
        field: 'filas',
        headerName: 'Filas',
        width: 140,
        valueGetter: (_v, row) =>
          row.filasConError > 0
            ? `${row.totalFilas} (${row.filasConError} con errores)`
            : `${row.totalFilas}`,
      },
      {
        field: 'creadoEn',
        headerName: 'Subida',
        width: 170,
        valueGetter: (_v, row) => formatearFechaHora(row.creadoEn),
      },
    ],
    [setParametros],
  );

  const alElegirArchivo = (elegido: File | undefined) => {
    if (!elegido) return;
    const problema = validarArchivoImportacion(elegido);
    setErrorArchivo(problema);
    setArchivo(problema ? null : elegido);
  };

  const enviar = () => {
    if (!archivo || !obraEfectiva) return;
    subir.mutate(
      { archivo, obraId: obraEfectiva.id },
      {
        onSuccess: (lote) => {
          setParametros({ lote: String(lote.id) });
          setArchivo(null);
          if (entradaArchivo.current) entradaArchivo.current.value = '';
        },
      },
    );
  };

  return (
    <>
      <CabeceraPagina
        eyebrow="Herramientas"
        titulo="Importación masiva"
        descripcion="Carga presupuestos desde Excel o CSV: se validan fila a fila y nada se crea hasta que confirmes."
      />

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Card component="section" aria-label="Importar un presupuesto">
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ fontSize: 15, mb: 0.5 }}>
              Importar un presupuesto
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
              Usa la plantilla genérica (columnas: código, familia, descripción, unidad, cantidad y
              precio unitario). Es provisoria: la plantilla definitiva del cliente aún no existe.
            </Typography>

            <Box sx={{ display: 'grid', gap: 2, maxWidth: 640 }}>
              <Box>
                <Button
                  variant="outlined"
                  component="a"
                  href={URL_PLANTILLA_PRESUPUESTO}
                  startIcon={<FileDownloadOutlined />}
                >
                  Descargar plantilla
                </Button>
              </Box>

              <Autocomplete
                options={obras.data?.items ?? []}
                value={obraEfectiva as ObraDto | null}
                loading={obras.isFetching}
                getOptionLabel={etiquetaObra}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                filterOptions={(opciones) => opciones}
                onChange={(_e, valor) => setObra(valor)}
                onInputChange={(_e, texto, motivo) => {
                  if (motivo === 'input') setBusqueda(texto);
                }}
                noOptionsText="No hay obras que coincidan."
                loadingText="Buscando obras…"
                renderInput={(params) => <TextField {...params} label="Obra de destino" required />}
              />

              <Box>
                <input
                  ref={entradaArchivo}
                  type="file"
                  hidden
                  accept={EXTENSIONES_IMPORTACION.join(',')}
                  aria-label="Planilla a importar"
                  data-testid="archivo-importacion"
                  onChange={(e) => alElegirArchivo(e.target.files?.[0])}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<UploadFileOutlined />}
                    onClick={() => entradaArchivo.current?.click()}
                  >
                    Elegir archivo
                  </Button>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {archivo ? archivo.name : 'Ningún archivo (.xlsx o .csv, hasta 20 MB)'}
                  </Typography>
                </Box>
              </Box>

              {(errorArchivo || subir.isError) && (
                <Alert severity="error">{errorArchivo ?? mensajeDeError(subir.error)}</Alert>
              )}

              <Box>
                <Button
                  variant="contained"
                  disabled={!archivo || !obraEfectiva || subir.isPending}
                  onClick={enviar}
                >
                  {subir.isPending ? 'Subiendo…' : 'Subir y previsualizar'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {loteId !== undefined && <PrevisualizacionImportacion key={loteId} loteId={loteId} />}

        <Card component="section" aria-label="Historial de importaciones">
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ fontSize: 15, mb: 1.5 }}>
              Importaciones recientes
            </Typography>
            {historial.isError && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                {mensajeDeError(historial.error)}
              </Alert>
            )}
            <DataGrid
              rows={historial.data?.items ?? []}
              columns={columnas}
              loading={historial.isFetching}
              rowCount={historial.data?.total ?? 0}
              paginationMode="server"
              paginationModel={paginacion}
              onPaginationModelChange={setPaginacion}
              pageSizeOptions={[10, 25, 50]}
              columnVisibilityModel={{ obra: !esMovil, creadoEn: !esMovil, filas: !esMovil }}
              disableRowSelectionOnClick
              disableColumnMenu
              disableVirtualization={import.meta.env.MODE === 'test'}
              autoHeight
              localeText={{
                ...esES.components.MuiDataGrid.defaultProps.localeText,
                noRowsLabel: 'Todavía no hay importaciones.',
              }}
              sx={{ border: 1, borderColor: 'divider' }}
            />
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
