import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { useMemo, useState } from 'react';
import { useAuditoria } from '@/api/auditoria';
import { mensajeDeError } from '@/api/errores';
import type { EventoAuditoriaDto } from '@/api/generated';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { formatearFechaHora } from '@/lib/formato';
import { useValorDiferido } from '@/lib/useValorDiferido';

const TAMANIOS_PAGINA = [10, 25, 50, 100];

const TIPOS_EVENTO = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'usuario.', etiqueta: 'Usuarios' },
  { valor: 'auth.', etiqueta: 'Accesos y sesiones' },
];

const textoActor = (e: EventoAuditoriaDto) => e.usuarioNombre ?? e.usuarioCorreo ?? 'Sin sesión';

/** P26 — Consulta de la bitácora de auditoría (solo admin, solo lectura). */
export function AuditoriaPage() {
  const tema = useTheme();
  const esMovil = useMediaQuery(tema.breakpoints.down('md'), { noSsr: true });

  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [paginacion, setPaginacion] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const [detalle, setDetalle] = useState<EventoAuditoriaDto | null>(null);
  const q = useValorDiferido(busqueda.trim());

  const consulta = useAuditoria({
    pagina: paginacion.page + 1,
    tamanio: paginacion.pageSize,
    q: q || undefined,
    accion: tipo || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  });

  const volverAPrimeraPagina = () => setPaginacion((p) => ({ ...p, page: 0 }));

  const columnas = useMemo<GridColDef<EventoAuditoriaDto>[]>(
    () => [
      {
        field: 'ocurridoEn',
        headerName: 'Fecha',
        width: 170,
        sortable: false,
        valueGetter: (_valor, fila) => formatearFechaHora(fila.ocurridoEn),
      },
      {
        field: 'accion',
        headerName: 'Acción',
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ py: 0.75, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
              {row.accion}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
              {row.entidad}
              {row.entidadId ? ` #${row.entidadId}` : ''}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'usuarioNombre',
        headerName: 'Responsable',
        width: 190,
        sortable: false,
        valueGetter: (_valor, fila) => textoActor(fila),
      },
      { field: 'ip', headerName: 'IP', width: 140, sortable: false },
      {
        field: 'detalle',
        headerName: 'Detalle',
        width: 100,
        sortable: false,
        renderCell: ({ row }) => (
          <Button
            size="small"
            aria-label={`Ver detalle del evento ${row.id}`}
            onClick={() => setDetalle(row)}
          >
            Ver
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <CabeceraPagina
        eyebrow="Administración"
        titulo="Auditoría y bitácora"
        descripcion="Consulta la trazabilidad de cambios, aprobaciones y movimientos."
      />

      <Card component="section" aria-label="Bitácora de auditoría">
        <Box
          sx={{
            p: { xs: 1.5, md: 2.25 },
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '2fr 1.2fr 1fr 1fr' },
          }}
        >
          <TextField
            size="small"
            label="Buscar (acción, responsable, motivo)"
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
            label="Tipo de evento"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              volverAPrimeraPagina();
            }}
          >
            {TIPOS_EVENTO.map((t) => (
              <MenuItem key={t.valor} value={t.valor}>
                {t.etiqueta}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="Desde"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              volverAPrimeraPagina();
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label="Hasta"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              volverAPrimeraPagina();
            }}
            slotProps={{ inputLabel: { shrink: true } }}
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
          paginationModel={paginacion}
          onPaginationModelChange={setPaginacion}
          pageSizeOptions={TAMANIOS_PAGINA}
          columnVisibilityModel={{ ip: !esMovil, usuarioNombre: !esMovil }}
          disableRowSelectionOnClick
          disableColumnMenu
          disableVirtualization={import.meta.env.MODE === 'test'}
          autoHeight
          getRowHeight={() => 'auto'}
          localeText={esES.components.MuiDataGrid.defaultProps.localeText}
          sx={{ border: 0, '& .MuiDataGrid-cell': { alignItems: 'center', display: 'flex' } }}
        />
      </Card>

      <Dialog open={detalle !== null} onClose={() => setDetalle(null)} fullWidth maxWidth="md">
        <DialogTitle>Detalle del evento {detalle?.id}</DialogTitle>
        <DialogContent dividers>
          {detalle && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Typography sx={{ fontSize: 13 }}>
                <strong>{detalle.accion}</strong> · {formatearFechaHora(detalle.ocurridoEn)} ·{' '}
                {textoActor(detalle)}
                {detalle.ip ? ` · ${detalle.ip}` : ''}
              </Typography>
              {detalle.motivo && (
                <Typography sx={{ fontSize: 13 }}>Motivo: {detalle.motivo}</Typography>
              )}
              <BloqueJson titulo="Antes" valor={detalle.antes} />
              <BloqueJson titulo="Después" valor={detalle.despues} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalle(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function BloqueJson({ titulo, valor }: { titulo: string; valor: Record<string, unknown> | null }) {
  return (
    <Box>
      <Typography variant="eyebrow" sx={{ mb: 0.75 }}>
        {titulo}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          fontSize: 12,
          overflow: 'auto',
          maxHeight: 260,
          borderRadius: 1,
          bgcolor: 'action.hover',
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
        }}
      >
        {valor ? JSON.stringify(valor, null, 2) : '—'}
      </Box>
    </Box>
  );
}
