import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { PresupuestoVersionDto, TotalFamiliaDto } from '@/api/generated';
import { formatCLP, formatearMonto } from '@/lib/formato';

interface TotalesPorFamiliaProps {
  version: Pick<PresupuestoVersionDto, 'moneda' | 'total' | 'totalClp' | 'cantidadPartidas'>;
  totales: TotalFamiliaDto[];
}

/** Totales del presupuesto por familia de partida (en la moneda de la versión y en pesos). */
export function TotalesPorFamilia({ version, totales }: TotalesPorFamiliaProps) {
  const enUf = version.moneda === 'UF';
  if (totales.length === 0) {
    return (
      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
        Aún no hay partidas: los totales por familia aparecerán al agregarlas.
      </Typography>
    );
  }
  return (
    <TableContainer component={Box} sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Table size="small" aria-label="Totales por familia">
        <TableHead>
          <TableRow>
            <TableCell>Familia</TableCell>
            <TableCell align="right">Partidas</TableCell>
            {enUf && <TableCell align="right">Total (UF)</TableCell>}
            <TableCell align="right">Total (CLP)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {totales.map((t) => (
            <TableRow key={t.familia.id}>
              <TableCell>{t.familia.nombre}</TableCell>
              <TableCell align="right">{t.cantidadPartidas}</TableCell>
              {enUf && <TableCell align="right">{formatearMonto(t.total, 'UF')}</TableCell>}
              <TableCell align="right">{formatCLP(t.totalClp)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              {version.cantidadPartidas}
            </TableCell>
            {enUf && (
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {formatearMonto(version.total, 'UF')}
              </TableCell>
            )}
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              {formatCLP(version.totalClp)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}
