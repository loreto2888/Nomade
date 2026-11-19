import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { mensajeDeError } from '@/api/errores';
import type { TipoCambioPartida } from '@/api/generated';
import { useComparacionPresupuesto } from '@/api/presupuestos';
import { formatCLP } from '@/lib/formato';

const ETIQUETA_CAMBIO: Record<TipoCambioPartida, string> = {
  nueva: 'Nueva',
  eliminada: 'Eliminada',
  modificada: 'Modificada',
  sin_cambios: 'Sin cambios',
};

const COLOR_CAMBIO = {
  nueva: 'success',
  eliminada: 'error',
  modificada: 'warning',
  sin_cambios: 'default',
} as const;

const formatoDiferencia = (clp: number): string =>
  clp === 0 ? '—' : `${clp > 0 ? '+' : '−'}${formatCLP(Math.abs(clp))}`;

interface ComparacionVersionesProps {
  /** Versión que se compara (la «nueva»). */
  versionId: number;
  /** Contra qué versión; por defecto, la vigente de la obra. */
  baseId?: number;
}

/** Comparación simple, por código de partida, entre una versión y la vigente (montos en CLP). */
export function ComparacionVersiones({ versionId, baseId }: ComparacionVersionesProps) {
  const consulta = useComparacionPresupuesto(versionId, baseId, true);
  const [soloCambios, setSoloCambios] = useState(true);

  if (consulta.isError) return <Alert severity="info">{mensajeDeError(consulta.error)}</Alert>;
  if (!consulta.data) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
        <CircularProgress size={24} aria-label="Cargando comparación" />
      </Box>
    );
  }

  const c = consulta.data;
  const filas = soloCambios ? c.filas.filter((f) => f.cambio !== 'sin_cambios') : c.filas;
  const mismaMoneda = c.base.moneda === c.nueva.moneda;

  return (
    <Box>
      <Typography sx={{ fontSize: 13, mb: 1.5 }}>
        Versión {c.nueva.numero} frente a la versión {c.base.numero}: {formatCLP(c.totalNuevoClp)}{' '}
        contra {formatCLP(c.totalBaseClp)} (<strong>{formatoDiferencia(c.diferenciaClp)}</strong>).
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Chip size="small" color="success" label={`${c.nuevas} nuevas`} />
        <Chip size="small" color="warning" label={`${c.modificadas} modificadas`} />
        <Chip size="small" color="error" label={`${c.eliminadas} eliminadas`} />
        <Chip size="small" variant="outlined" label={`${c.sinCambios} sin cambios`} />
      </Box>
      {!mismaMoneda && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Las versiones están en monedas distintas: se comparan los totales en pesos.
        </Alert>
      )}
      <FormControlLabel
        control={
          <Switch checked={soloCambios} onChange={(e) => setSoloCambios(e.target.checked)} />
        }
        label="Mostrar solo las partidas con cambios"
      />
      {filas.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1 }}>
          No hay diferencias entre las dos versiones.
        </Typography>
      ) : (
        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mt: 1 }}>
          <Table size="small" aria-label="Diferencias entre versiones">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Cambio</TableCell>
                <TableCell align="right">Versión {c.base.numero}</TableCell>
                <TableCell align="right">Versión {c.nueva.numero}</TableCell>
                <TableCell align="right">Diferencia</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={f.codigo}>
                  <TableCell sx={{ fontWeight: 700 }}>{f.codigo}</TableCell>
                  <TableCell>{f.descripcion}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={COLOR_CAMBIO[f.cambio]}
                      variant={f.cambio === 'sin_cambios' ? 'outlined' : 'filled'}
                      label={ETIQUETA_CAMBIO[f.cambio]}
                    />
                  </TableCell>
                  <TableCell align="right">{f.base ? formatCLP(f.base.totalClp) : '—'}</TableCell>
                  <TableCell align="right">{f.nueva ? formatCLP(f.nueva.totalClp) : '—'}</TableCell>
                  <TableCell align="right">{formatoDiferencia(f.diferenciaClp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
