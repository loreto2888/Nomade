import AddOutlined from '@mui/icons-material/AddOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as EnlaceRouter, useSearchParams } from 'react-router';
import { mensajeDeError } from '@/api/errores';
import type { ObraDto } from '@/api/obras';
import {
  useCrearPresupuesto,
  usePresupuestos,
  type PresupuestoVersionDto,
} from '@/api/presupuestos';
import { RoleGate } from '@/app/RoleGate';
import { StatusChip } from '@/components/StatusChip';
import { formatCLP, formatearFechaHora } from '@/lib/formato';
import { ETIQUETA_ESTADO_VERSION, formatearTotalVersion } from '@/lib/presupuesto';
import { VersionDetalle } from './VersionDetalle';
import { versionInicial } from './versiones';

function ResumenVigente({
  obra,
  vigente,
}: {
  obra: ObraDto;
  vigente: PresupuestoVersionDto | undefined;
}) {
  if (!vigente) {
    return (
      <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
        Esta obra aún no tiene un presupuesto aprobado. Crea una versión, agrega las partidas,
        envíala a revisión y otra persona deberá aprobarla.
      </Typography>
    );
  }
  const contrato = obra.montoContratoClp;
  const margen = contrato === null ? null : contrato - vigente.totalClp;
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
      <Box>
        <Typography sx={{ fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>
          Presupuesto vigente
        </Typography>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
          {formatCLP(vigente.totalClp)}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          Versión {vigente.numero} · aprobada el {formatearFechaHora(vigente.resueltoEn)}
        </Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>
          Contrato de la obra
        </Typography>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
          {contrato === null ? '—' : formatCLP(contrato)}
        </Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>
          Contrato − presupuesto
        </Typography>
        <Typography
          sx={{
            fontSize: 18,
            fontWeight: 700,
            color: margen !== null && margen < 0 ? 'error.main' : undefined,
          }}
        >
          {margen === null ? '—' : formatCLP(margen)}
        </Typography>
        {margen !== null && contrato !== null && contrato > 0 && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(
              (margen / contrato) * 100,
            )}{' '}
            % del contrato
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/** P06 — Pestaña «Presupuesto» de la ficha de obra: versiones, partidas, totales y flujo de aprobación. */
export function PresupuestoTab({ obra }: { obra: ObraDto }) {
  const [parametros, setParametros] = useSearchParams();
  const consulta = usePresupuestos(obra.id);
  const crear = useCrearPresupuesto(obra.id);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const obraCerrada = obra.estado.codigo === 'cerrada';

  const seleccionar = (id: number | null) =>
    setParametros(
      id === null ? { pestana: 'presupuesto' } : { pestana: 'presupuesto', version: String(id) },
    );

  if (consulta.isError) {
    return (
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
    );
  }
  if (!consulta.data) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress aria-label="Cargando el presupuesto" />
      </Box>
    );
  }

  const versiones = consulta.data;
  const vigente = versiones.find((v) => v.vigente);
  const pedida = Number(parametros.get('version'));
  const seleccionada = versionInicial(
    versiones,
    Number.isInteger(pedida) && pedida > 0 ? pedida : null,
  );

  const nueva = (copiarDeId?: number) => {
    setMenu(null);
    crear.mutate(
      { copiarDeId },
      {
        onSuccess: (v) => {
          setAviso(
            copiarDeId === undefined
              ? `Se creó la versión ${v.numero} en borrador.`
              : `Se creó la versión ${v.numero} en borrador, copiada de la vigente.`,
          );
          seleccionar(v.id);
        },
      },
    );
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Card component="section" aria-label="Resumen del presupuesto">
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              flexWrap: 'wrap',
              mb: 2,
            }}
          >
            <Typography variant="h6" component="h2" sx={{ fontSize: 15 }}>
              Presupuesto de la obra
            </Typography>
            {!obraCerrada && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <RoleGate permiso="importaciones.administrar">
                  <Button
                    variant="outlined"
                    startIcon={<UploadFileOutlined />}
                    component={EnlaceRouter}
                    to={`/importaciones?obra=${obra.id}`}
                  >
                    Importar desde Excel
                  </Button>
                </RoleGate>
                <Button
                  variant="contained"
                  startIcon={<AddOutlined />}
                  disabled={crear.isPending}
                  aria-haspopup="menu"
                  onClick={(e) => setMenu(e.currentTarget)}
                >
                  Nueva versión
                </Button>
                <Menu open={menu !== null} anchorEl={menu} onClose={() => setMenu(null)}>
                  {vigente && (
                    <MenuItem onClick={() => nueva(vigente.id)}>
                      Copiar desde la vigente (versión {vigente.numero})
                    </MenuItem>
                  )}
                  <MenuItem onClick={() => nueva(undefined)}>Versión vacía</MenuItem>
                </Menu>
              </Box>
            )}
          </Box>
          {crear.isError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => crear.reset()}>
              {mensajeDeError(crear.error)}
            </Alert>
          )}
          {obraCerrada && (
            <Alert severity="info" sx={{ mb: 2 }}>
              La obra está cerrada: el presupuesto es de solo lectura.
            </Alert>
          )}
          <ResumenVigente obra={obra} vigente={vigente} />
        </CardContent>
      </Card>

      {versiones.length > 0 && (
        <Card component="section" aria-label="Versiones del presupuesto">
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ fontSize: 15, mb: 1.5 }}>
              Versiones
            </Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
              {versiones.map((v) => {
                const activa = v.id === seleccionada?.id;
                return (
                  <Card
                    key={v.id}
                    variant="outlined"
                    sx={{
                      borderColor: activa ? 'primary.main' : 'divider',
                      borderWidth: activa ? 2 : 1,
                    }}
                  >
                    <CardActionArea
                      onClick={() => seleccionar(v.id)}
                      aria-current={activa ? 'true' : undefined}
                      aria-label={`Ver la versión ${v.numero}`}
                      sx={{ p: 1.5 }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
                        >
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                            Versión {v.numero}
                          </Typography>
                          <StatusChip
                            estado={v.estado}
                            etiqueta={ETIQUETA_ESTADO_VERSION[v.estado]}
                          />
                          {v.vigente && (
                            <Chip size="small" color="success" variant="outlined" label="Vigente" />
                          )}
                          {v.estado === 'aprobado' && !v.vigente && (
                            <Chip size="small" variant="outlined" label="Reemplazada" />
                          )}
                          {v.descripcion && (
                            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                              {v.descripcion}
                            </Typography>
                          )}
                        </Box>
                        <Typography sx={{ fontSize: 13 }}>
                          {v.cantidadPartidas} partida(s) ·{' '}
                          <strong>{formatearTotalVersion(v)}</strong>
                          {v.moneda === 'UF' ? ` (${formatCLP(v.totalClp)})` : ''}
                        </Typography>
                      </Box>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}

      {seleccionada ? (
        <VersionDetalle
          key={seleccionada.id}
          versionId={seleccionada.id}
          obraId={obra.id}
          obraCerrada={obraCerrada}
          vigente={vigente}
          onAviso={setAviso}
          onSeleccionar={seleccionar}
          onEliminada={() => seleccionar(null)}
        />
      ) : (
        <Card>
          <CardContent sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="h6" component="h2">
              Sin versiones de presupuesto
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>
              {obraCerrada
                ? 'Esta obra se cerró sin presupuesto.'
                : 'Crea la primera versión con «Nueva versión»' +
                  ' o, si eres administrador, impórtala desde una planilla Excel.'}
            </Typography>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={aviso !== null}
        autoHideDuration={5000}
        onClose={() => setAviso(null)}
        message={aviso ?? ''}
      />
    </Box>
  );
}
