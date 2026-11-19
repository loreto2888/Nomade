import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { useState, type FormEvent } from 'react';
import { mensajeDeError } from '@/api/errores';
import { useGuardarValorUf, useValoresUf, type ValorUfDto } from '@/api/parametros';
import { MoneyField } from '@/components/MoneyField';
import { formatCLP, formatearFecha } from '@/lib/formato';

const formatoCLPConDecimales = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const columnas: GridColDef<ValorUfDto>[] = [
  {
    field: 'fecha',
    headerName: 'Fecha',
    flex: 1,
    minWidth: 140,
    valueGetter: (_v, row) => formatearFecha(row.fecha),
  },
  {
    field: 'valor',
    headerName: 'Valor de la UF',
    flex: 1,
    minWidth: 160,
    align: 'right',
    headerAlign: 'right',
    valueGetter: (_v, row) => `$ ${formatoCLPConDecimales.format(row.valor)}`,
  },
];

/** Valores diarios de la UF (se cargan manualmente; sirven para convertir UF ↔ CLP). */
export function UfTab() {
  const [paginacion, setPaginacion] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const consulta = useValoresUf({ pagina: paginacion.page + 1, tamanio: paginacion.pageSize });
  const guardar = useGuardarValorUf();
  const [fecha, setFecha] = useState(hoyLocal);
  const [valor, setValor] = useState<number | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (valor === null || !fecha) return;
    guardar.mutate(
      { fecha, valor },
      {
        onSuccess: (r) => {
          setGuardado(`Se guardó la UF del ${formatearFecha(r.fecha)}: ${formatCLP(r.valor)}.`);
          setValor(null);
        },
      },
    );
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Card component="section" aria-label="Cargar valor de la UF">
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ fontSize: 15, mb: 0.5 }}>
            Cargar o corregir el valor de un día
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            Se usa para convertir los contratos en UF a pesos. Si un día no tiene valor, se usa el
            último de los 7 días anteriores. Cada cambio queda en la bitácora.
          </Typography>
          <Box
            component="form"
            onSubmit={enviar}
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' },
              alignItems: 'start',
            }}
          >
            <TextField
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setGuardado(null);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              required
            />
            <MoneyField
              label="Valor de la UF"
              moneda="UF"
              simbolo="$"
              value={valor}
              onChange={(v) => {
                setValor(v);
                setGuardado(null);
              }}
              required
              helperText="Pesos por UF, con coma decimal (hasta 4 decimales)."
            />
            <Button
              type="submit"
              variant="contained"
              disabled={guardar.isPending || valor === null || !fecha}
              sx={{ height: 40 }}
            >
              Guardar valor
            </Button>
          </Box>
          {guardado && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {guardado}
            </Alert>
          )}
          {guardar.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {mensajeDeError(guardar.error)}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card component="section" aria-label="Valores de la UF cargados">
        {consulta.isError && (
          <Alert
            severity="error"
            sx={{ m: 2 }}
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
          getRowId={(r) => r.fecha}
          columns={columnas}
          loading={consulta.isFetching}
          rowCount={consulta.data?.total ?? 0}
          paginationMode="server"
          paginationModel={paginacion}
          onPaginationModelChange={setPaginacion}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          disableVirtualization={import.meta.env.MODE === 'test'}
          autoHeight
          localeText={{
            ...esES.components.MuiDataGrid.defaultProps.localeText,
            noRowsLabel: 'Aún no hay valores de la UF cargados.',
          }}
          sx={{ border: 0 }}
        />
      </Card>
    </Box>
  );
}
