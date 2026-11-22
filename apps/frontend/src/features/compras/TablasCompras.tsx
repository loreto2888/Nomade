import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { Link as EnlaceRouter } from 'react-router';
import {
  useCotizaciones,
  useOrdenesCompra,
  useOrdenesTrabajo,
  type CotizacionDto,
  type EstadoDocumentoCompra,
  type OrdenCompraDto,
  type OrdenTrabajoDto,
  type TipoOrdenCompra,
} from '@/api/compras';
import { mensajeDeError } from '@/api/errores';
import { StatusChip } from '@/components/StatusChip';
import { ETIQUETA_ESTADO_COMPRA, ETIQUETA_TIPO_OC, formatearPorcentaje } from '@/lib/compras';
import { formatCLP, formatearFecha } from '@/lib/formato';
import { useValorDiferido } from '@/lib/useValorDiferido';
import { rutaCotizacion, rutaOrdenCompra, rutaOrdenTrabajo } from './rutas';

interface FiltrosTabla {
  obraId?: number;
  estado?: EstadoDocumentoCompra;
  ordenTrabajoId?: number;
}

interface TablaProps {
  /** Filtros fijos (p. ej. la obra de la ficha o «en revisión» en la bandeja). */
  filtros?: FiltrosTabla;
  /** Muestra búsqueda y filtro de estado. */
  conFiltros?: boolean;
  /** Oculta la columna de obra (dentro de la ficha de una obra). */
  sinObra?: boolean;
  etiqueta: string;
  vacio: string;
  /** Columna extra de acciones. */
  acciones?: (fila: { id: number }) => ReactNode;
}

const ESTADOS: EstadoDocumentoCompra[] = [
  'borrador',
  'en_revision',
  'aprobada',
  'rechazada',
  'recibida',
  'anulada',
];

function useFiltros(fijos: FiltrosTabla) {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<EstadoDocumentoCompra | ''>('');
  const [paginacion, setPaginacion] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const q = useValorDiferido(busqueda.trim());
  return {
    busqueda,
    setBusqueda: (t: string) => {
      setBusqueda(t);
      setPaginacion((p) => ({ ...p, page: 0 }));
    },
    estado,
    setEstado: (e: EstadoDocumentoCompra | '') => {
      setEstado(e);
      setPaginacion((p) => ({ ...p, page: 0 }));
    },
    paginacion,
    setPaginacion,
    filtro: {
      pagina: paginacion.page + 1,
      tamanio: paginacion.pageSize,
      q: q || undefined,
      ...fijos,
      estado: fijos.estado ?? (estado === '' ? undefined : estado),
    },
  };
}

function Folio({ ruta, folio, detalle }: { ruta: string; folio: string; detalle?: string }) {
  return (
    <Box sx={{ py: 0.75, minWidth: 0 }}>
      <Link
        component={EnlaceRouter}
        to={ruta}
        underline="hover"
        sx={{ fontSize: 13, fontWeight: 700 }}
      >
        {folio}
      </Link>
      {detalle && (
        <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
          {detalle}
        </Typography>
      )}
    </Box>
  );
}

function Tabla<T extends { id: number }>({
  props,
  estado,
  columnas,
  consulta,
  esMovil,
  ocultasMovil,
}: {
  props: TablaProps;
  estado: ReturnType<typeof useFiltros>;
  columnas: GridColDef<T>[];
  consulta: UseQueryResult<{ items: T[]; total: number }>;
  esMovil: boolean;
  ocultasMovil: string[];
}) {
  const visibles = Object.fromEntries([
    ...ocultasMovil.map((c) => [c, !esMovil]),
    ['obra', !props.sinObra && !esMovil],
  ]);
  const todas: GridColDef<T>[] = props.acciones
    ? [
        ...columnas,
        {
          field: 'acciones',
          headerName: '',
          sortable: false,
          minWidth: 200,
          align: 'right',
          headerAlign: 'right',
          renderCell: ({ row }) => props.acciones!(row),
        },
      ]
    : columnas;
  return (
    <Box component="section" aria-label={props.etiqueta}>
      {props.conFiltros && (
        <Box
          sx={{
            p: { xs: 1.5, md: 2 },
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
          }}
        >
          <TextField
            size="small"
            label="Buscar por folio, descripción o proveedor"
            value={estado.busqueda}
            onChange={(e) => estado.setBusqueda(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            select
            size="small"
            label="Estado"
            value={estado.estado}
            onChange={(e) => estado.setEstado(e.target.value as EstadoDocumentoCompra | '')}
          >
            <MenuItem value="">Todos</MenuItem>
            {ESTADOS.map((e) => (
              <MenuItem key={e} value={e}>
                {ETIQUETA_ESTADO_COMPRA[e]}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}
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
        columns={todas}
        loading={consulta.isFetching}
        rowCount={consulta.data?.total ?? 0}
        paginationMode="server"
        paginationModel={estado.paginacion}
        onPaginationModelChange={estado.setPaginacion}
        pageSizeOptions={[10, 25, 50]}
        columnVisibilityModel={visibles}
        disableRowSelectionOnClick
        disableColumnMenu
        disableColumnSorting
        disableVirtualization={import.meta.env.MODE === 'test'}
        autoHeight
        getRowHeight={() => 'auto'}
        localeText={{
          ...esES.components.MuiDataGrid.defaultProps.localeText,
          noRowsLabel: props.vacio,
        }}
        sx={{ border: 0, '& .MuiDataGrid-cell': { alignItems: 'center', display: 'flex' } }}
      />
    </Box>
  );
}

const columnaEstado = <T extends { estado: EstadoDocumentoCompra }>(): GridColDef<T> => ({
  field: 'estado',
  headerName: 'Estado',
  width: 130,
  renderCell: ({ row }) => (
    <StatusChip estado={row.estado} etiqueta={ETIQUETA_ESTADO_COMPRA[row.estado]} />
  ),
});

const columnaObra = <
  T extends { obra: { nombre: string; codigoCentroCosto: string } },
>(): GridColDef<T> => ({
  field: 'obra',
  headerName: 'Obra',
  flex: 1,
  minWidth: 160,
  valueGetter: (_v, row) => `${row.obra.codigoCentroCosto} · ${row.obra.nombre}`,
});

const monto = <T extends GridValidRowModel>(
  campo: string,
  titulo: string,
  valor: (row: T) => number,
): GridColDef<T> => ({
  field: campo,
  headerName: titulo,
  width: 150,
  align: 'right',
  headerAlign: 'right',
  valueGetter: (_v, row) => formatCLP(valor(row)),
});

export function TablaCotizaciones(props: TablaProps) {
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });
  const estado = useFiltros(props.filtros ?? {});
  const consulta = useCotizaciones(estado.filtro);
  const columnas = useMemo<GridColDef<CotizacionDto>[]>(
    () => [
      {
        field: 'folio',
        headerName: 'Cotización',
        flex: 1.2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Folio
            ruta={rutaCotizacion(row.id)}
            folio={row.folio}
            detalle={`${row.proveedor.razonSocial} · ${row.descripcion}`}
          />
        ),
      },
      columnaObra<CotizacionDto>(),
      {
        field: 'fecha',
        headerName: 'Fecha',
        width: 120,
        valueGetter: (_v, row) => formatearFecha(row.fecha),
      },
      monto<CotizacionDto>('montoNeto', 'Monto neto', (r) => r.montoNeto),
      columnaEstado<CotizacionDto>(),
      {
        field: 'ordenTrabajo',
        headerName: 'OT',
        width: 120,
        renderCell: ({ row }) =>
          row.ordenTrabajo ? (
            <Link
              component={EnlaceRouter}
              to={rutaOrdenTrabajo(row.ordenTrabajo.id)}
              sx={{ fontSize: 13 }}
            >
              {row.ordenTrabajo.folio}
            </Link>
          ) : (
            '—'
          ),
      },
    ],
    [],
  );
  return (
    <Tabla
      props={props}
      estado={estado}
      columnas={columnas}
      consulta={consulta}
      esMovil={esMovil}
      ocultasMovil={['fecha', 'ordenTrabajo', 'montoNeto']}
    />
  );
}

export function TablaOrdenesTrabajo(props: TablaProps) {
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });
  const estado = useFiltros(props.filtros ?? {});
  const consulta = useOrdenesTrabajo(estado.filtro);
  const columnas = useMemo<GridColDef<OrdenTrabajoDto>[]>(
    () => [
      {
        field: 'folio',
        headerName: 'Orden de trabajo',
        flex: 1.2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Folio
            ruta={rutaOrdenTrabajo(row.id)}
            folio={row.folio}
            detalle={`${row.proveedor.razonSocial} · ${row.descripcion}`}
          />
        ),
      },
      columnaObra<OrdenTrabajoDto>(),
      monto<OrdenTrabajoDto>('montoNeto', 'Contratado', (r) => r.montoNeto),
      {
        field: 'ordenado',
        headerName: 'Ordenado',
        width: 120,
        align: 'right',
        headerAlign: 'right',
        valueGetter: (_v, row) => formatearPorcentaje(row.porcentajeOrdenado),
      },
      monto<OrdenTrabajoDto>('saldo', 'Saldo', (r) => r.saldo),
      columnaEstado<OrdenTrabajoDto>(),
    ],
    [],
  );
  return (
    <Tabla
      props={props}
      estado={estado}
      columnas={columnas}
      consulta={consulta}
      esMovil={esMovil}
      ocultasMovil={['montoNeto', 'ordenado']}
    />
  );
}

export function TablaOrdenesCompra(props: TablaProps & { tipo?: TipoOrdenCompra }) {
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });
  const estado = useFiltros(props.filtros ?? {});
  const consulta = useOrdenesCompra({ ...estado.filtro, tipo: props.tipo });
  const columnas = useMemo<GridColDef<OrdenCompraDto>[]>(
    () => [
      {
        field: 'folio',
        headerName: 'Orden de compra',
        flex: 1.2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Folio
            ruta={rutaOrdenCompra(row.id)}
            folio={row.folio}
            detalle={`${row.proveedor.razonSocial} · ${row.descripcion}`}
          />
        ),
      },
      columnaObra<OrdenCompraDto>(),
      {
        field: 'tipo',
        headerName: 'Tipo',
        width: 140,
        renderCell: ({ row }) => (
          <Box sx={{ py: 0.75 }}>
            <Typography sx={{ fontSize: 13 }}>{ETIQUETA_TIPO_OC[row.tipo]}</Typography>
            {row.ordenTrabajo && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {row.ordenTrabajo.folio} · {formatearPorcentaje(row.porcentaje ?? 0)}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'fecha',
        headerName: 'Fecha',
        width: 120,
        valueGetter: (_v, row) => formatearFecha(row.fecha),
      },
      monto<OrdenCompraDto>('montoTotal', 'Total', (r) => r.montoTotal),
      columnaEstado<OrdenCompraDto>(),
    ],
    [],
  );
  return (
    <Tabla
      props={props}
      estado={estado}
      columnas={columnas}
      consulta={consulta}
      esMovil={esMovil}
      ocultasMovil={['tipo', 'fecha']}
    />
  );
}
