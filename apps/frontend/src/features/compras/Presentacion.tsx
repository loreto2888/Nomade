import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import type { UsuarioResumenDto } from '@/api/generated';
import { formatearFechaHora } from '@/lib/formato';
import { rejilla } from './rutas';

/** Dato etiquetado de una ficha (misma presentación que el resumen de la obra). */
export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
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

export function Seccion({
  titulo,
  acciones,
  children,
}: {
  titulo: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card component="section" aria-label={titulo}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap',
            mb: 2,
          }}
        >
          <Typography variant="h6" component="h2" sx={{ fontSize: 15 }}>
            {titulo}
          </Typography>
          {acciones}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

interface Trazable {
  creadoPor: UsuarioResumenDto | null;
  creadoEn: string;
  enviadoPor: UsuarioResumenDto | null;
  enviadoEn: string | null;
  resueltoPor: UsuarioResumenDto | null;
  resueltoEn: string | null;
  motivoResolucion: string | null;
  estado: string;
  anuladoPor?: UsuarioResumenDto | null;
  anuladoEn?: string | null;
  motivoAnulacion?: string | null;
}

function Paso({
  etiqueta,
  usuario,
  fecha,
  nota,
}: {
  etiqueta: string;
  usuario: UsuarioResumenDto | null | undefined;
  fecha: string | null | undefined;
  nota?: string | null;
}) {
  if (!fecha) return null;
  return (
    <Dato etiqueta={etiqueta}>
      {usuario?.nombre ?? '—'}
      <Typography component="span" sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}>
        {formatearFechaHora(fecha)}
      </Typography>
      {nota && (
        <Typography component="span" sx={{ display: 'block', fontSize: 12, fontStyle: 'italic' }}>
          «{nota}»
        </Typography>
      )}
    </Dato>
  );
}

/** Quién creó, envió, aprobó/rechazó y anuló el documento (trazabilidad, §9.2). */
export function Trazabilidad({ documento }: { documento: Trazable }) {
  const resolucion = documento.estado === 'rechazada' ? 'Rechazada por' : 'Aprobada por';
  return (
    <Seccion titulo="Trazabilidad">
      <Box sx={rejilla}>
        <Paso etiqueta="Creada por" usuario={documento.creadoPor} fecha={documento.creadoEn} />
        <Paso
          etiqueta="Enviada a revisión por"
          usuario={documento.enviadoPor}
          fecha={documento.enviadoEn}
        />
        <Paso
          etiqueta={resolucion}
          usuario={documento.resueltoPor}
          fecha={documento.resueltoEn}
          nota={documento.motivoResolucion}
        />
        <Paso
          etiqueta="Anulada por"
          usuario={documento.anuladoPor}
          fecha={documento.anuladoEn}
          nota={documento.motivoAnulacion}
        />
      </Box>
    </Seccion>
  );
}
