import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';
import { mensajeDeError, normalizarError } from '@/api/errores';
import type { PresupuestoVersionDto } from '@/api/generated';
import { usePresupuesto } from '@/api/presupuestos';
import { StatusChip } from '@/components/StatusChip';
import { formatCLP, formatearFecha, formatearFechaHora } from '@/lib/formato';
import {
  accionesDeVersion,
  ETIQUETA_ESTADO_VERSION,
  formatearTotalVersion,
} from '@/lib/presupuesto';
import { useSesion } from '@/app/sesion';
import { AccionesFlujo } from './AccionesFlujo';
import { ComparacionVersiones } from './ComparacionVersiones';
import { EditorPartidas } from './EditorPartidas';
import { TotalesPorFamilia } from './TotalesPorFamilia';

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.05em',
          color: 'text.secondary',
        }}
      >
        {etiqueta}
      </Typography>
      <Typography component="div" sx={{ fontSize: 14, mt: 0.25, wordBreak: 'break-word' }}>
        {children}
      </Typography>
    </Box>
  );
}

interface VersionDetalleProps {
  versionId: number;
  obraId: number;
  obraCerrada: boolean;
  /** Versión vigente de la obra (para ofrecer la comparación). */
  vigente: PresupuestoVersionDto | undefined;
  onAviso: (mensaje: string) => void;
  onSeleccionar: (id: number) => void;
  onEliminada: () => void;
}

/** Una versión del presupuesto: datos y trazabilidad, acciones, totales, partidas y comparación. */
export function VersionDetalle({
  versionId,
  obraId,
  obraCerrada,
  vigente,
  onAviso,
  onSeleccionar,
  onEliminada,
}: VersionDetalleProps) {
  const sesion = useSesion();
  const consulta = usePresupuesto(versionId);
  const [comparando, setComparando] = useState(false);

  if (consulta.isError) {
    const sinVersion = normalizarError(consulta.error).estado === 404;
    return (
      <Alert
        severity={sinVersion ? 'warning' : 'error'}
        action={
          sinVersion ? undefined : (
            <Button color="inherit" size="small" onClick={() => void consulta.refetch()}>
              Reintentar
            </Button>
          )
        }
      >
        {sinVersion ? 'La versión ya no existe.' : mensajeDeError(consulta.error)}
      </Alert>
    );
  }
  if (!consulta.data) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress aria-label="Cargando la versión" />
      </Box>
    );
  }

  const { version, partidas, totalesPorFamilia } = consulta.data;
  const enUf = version.moneda === 'UF';
  const acciones = accionesDeVersion(version, sesion, obraCerrada);
  const puedeComparar = vigente !== undefined && vigente.id !== version.id;

  return (
    <Box
      sx={{ display: 'grid', gap: 2.5 }}
      component="section"
      aria-label={`Versión ${version.numero}`}
    >
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="h6" component="h2" sx={{ fontSize: 17 }}>
              Versión {version.numero}
            </Typography>
            <StatusChip
              estado={version.estado}
              etiqueta={ETIQUETA_ESTADO_VERSION[version.estado]}
            />
            {version.vigente && (
              <Chip size="small" color="success" variant="outlined" label="Vigente" />
            )}
            {version.estado === 'aprobado' && !version.vigente && (
              <Chip size="small" variant="outlined" label="Reemplazada" />
            )}
          </Box>
          {version.descripcion && (
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 1.5 }}>
              {version.descripcion}
            </Typography>
          )}

          {version.estado === 'rechazado' && version.motivoResolucion && (
            <Alert severity="error" sx={{ my: 1.5 }}>
              <strong>Rechazada por {version.resueltoPor?.nombre ?? '—'}:</strong>{' '}
              {version.motivoResolucion}
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
              my: 2,
            }}
          >
            <Dato etiqueta="Creada">
              {version.creadoPor?.nombre ?? '—'}
              <Typography
                component="span"
                sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
              >
                {formatearFechaHora(version.creadoEn)}
              </Typography>
            </Dato>
            {version.enviadoEn && (
              <Dato etiqueta="Enviada a revisión">
                {version.enviadoPor?.nombre ?? '—'}
                <Typography
                  component="span"
                  sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
                >
                  {formatearFechaHora(version.enviadoEn)}
                </Typography>
              </Dato>
            )}
            {version.resueltoEn && (
              <Dato etiqueta={version.estado === 'aprobado' ? 'Aprobada' : 'Rechazada'}>
                {version.resueltoPor?.nombre ?? '—'}
                <Typography
                  component="span"
                  sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
                >
                  {formatearFechaHora(version.resueltoEn)}
                  {version.estado === 'aprobado' && version.motivoResolucion
                    ? ` · ${version.motivoResolucion}`
                    : ''}
                </Typography>
              </Dato>
            )}
            {version.copiadaDeNumero !== null && (
              <Dato etiqueta="Copiada de">Versión {version.copiadaDeNumero}</Dato>
            )}
            {version.importacionLoteId !== null && (
              <Dato etiqueta="Origen">Importación masiva (lote {version.importacionLoteId})</Dato>
            )}
            {enUf && version.valorUf !== null && (
              <Dato etiqueta="Valor de la UF usado">
                {formatCLP(version.valorUf)}
                <Typography
                  component="span"
                  sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
                >
                  UF del {formatearFecha(version.fechaValorUf)}
                </Typography>
              </Dato>
            )}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Dato etiqueta={enUf ? 'Total (UF)' : 'Total (CLP)'}>
              <strong>{formatearTotalVersion(version)}</strong>
            </Dato>
            {enUf && (
              <Dato etiqueta="Total en pesos">
                <strong>{formatCLP(version.totalClp)}</strong>
              </Dato>
            )}
            <Dato etiqueta="Partidas">
              <strong>{version.cantidadPartidas}</strong>
            </Dato>
          </Box>

          <AccionesFlujo
            version={version}
            obraId={obraId}
            obraCerrada={obraCerrada}
            onAviso={onAviso}
            onCopiada={(nueva) => onSeleccionar(nueva.id)}
            onEliminada={onEliminada}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" component="h3" sx={{ fontSize: 15, mb: 1.5 }}>
            Totales por familia
          </Typography>
          <TotalesPorFamilia version={version} totales={totalesPorFamilia} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <EditorPartidas
            version={version}
            partidas={partidas}
            editable={acciones.editar}
            onAviso={onAviso}
            onRecargar={() => void consulta.refetch()}
          />
        </CardContent>
      </Card>

      {puedeComparar && (
        <Accordion
          disableGutters
          expanded={comparando}
          onChange={(_e, abierto) => setComparando(abierto)}
          sx={{
            '&::before': { display: 'none' },
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreOutlined />}
            aria-controls="comparacion"
            id="comparacion-cabecera"
          >
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
              Comparar con la versión vigente (versión {vigente.numero})
            </Typography>
          </AccordionSummary>
          <AccordionDetails id="comparacion">
            {comparando && <ComparacionVersiones versionId={version.id} baseId={vigente.id} />}
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}
