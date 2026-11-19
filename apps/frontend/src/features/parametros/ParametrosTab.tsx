import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { mensajeDeError } from '@/api/errores';
import { useParametros } from '@/api/parametros';
import { formatearFecha } from '@/lib/formato';
import { textoValor } from './formato';
import { ValorParametroDialog } from './ValorParametroDialog';

/** Parámetros del sistema con su valor vigente y el próximo (P27). */
export function ParametrosTab() {
  const consulta = useParametros();
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const parametros = consulta.data ?? [];
  const actual = parametros.find((p) => p.id === seleccionado) ?? null;

  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        Valores iniciales provisorios: se ajustarán con las reglas definidas por Constructora
        Nómade. Cada cambio conserva su historial, tiene fecha de vigencia y queda en la bitácora.
      </Alert>

      {consulta.isPending && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress aria-label="Cargando parámetros" />
        </Box>
      )}
      {consulta.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void consulta.refetch()}>
              Reintentar
            </Button>
          }
        >
          {mensajeDeError(consulta.error)}
        </Alert>
      )}

      {consulta.isSuccess && (
        <Card>
          <TableContainer>
            <Table aria-label="Parámetros del sistema">
              <TableHead>
                <TableRow>
                  <TableCell>Parámetro</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Valor vigente</TableCell>
                  <TableCell>Próximo valor</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parametros.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{p.nombre}</Typography>
                      {p.descripcion && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {p.descripcion}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{p.categoria}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>
                        {textoValor(p, p.valorVigente)}
                      </Typography>
                      {p.valorVigente && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          desde {formatearFecha(p.valorVigente.vigenteDesde)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.proximoValor ? (
                        <>
                          <Typography sx={{ fontWeight: 700 }}>
                            {textoValor(p, p.proximoValor)}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            desde {formatearFecha(p.proximoValor.vigenteDesde)}
                          </Typography>
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => setSeleccionado(p.id)}
                        aria-label={`Cambiar valor de ${p.nombre}`}
                      >
                        Cambiar valor
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <ValorParametroDialog parametro={actual} onCerrar={() => setSeleccionado(null)} />
    </>
  );
}
