import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import type { ResumenObraDto } from '@/api/obras';
import { AttachmentUploader } from '@/components/AttachmentUploader';
import { formatCLP, formatUF, formatearFecha, formatearFechaHora } from '@/lib/formato';
import { formatearRut } from '@/lib/rut';

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

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card component="section" aria-label={titulo}>
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ fontSize: 15, mb: 2 }}>
          {titulo}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

const rejilla = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };

/** Pestaña «Resumen» de la ficha: datos generales, contrato, observaciones y adjuntos. */
export function ResumenObra({ resumen }: { resumen: ResumenObraDto }) {
  const { obra } = resumen;
  const enUf = obra.monedaContrato === 'UF';

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Seccion titulo="Datos generales">
        <Box sx={rejilla}>
          <Dato etiqueta="Centro de costo">{obra.codigoCentroCosto}</Dato>
          <Dato etiqueta="Cliente">
            {obra.cliente.razonSocial}
            <Typography
              component="span"
              sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
            >
              RUT {formatearRut(obra.cliente.rut)}
            </Typography>
          </Dato>
          <Dato etiqueta="Responsable">{obra.responsable ?? '—'}</Dato>
          <Dato etiqueta="Dirección">{obra.direccion ?? '—'}</Dato>
          <Dato etiqueta="Inicio">{formatearFecha(obra.fechaInicio)}</Dato>
          <Dato etiqueta="Término">{formatearFecha(obra.fechaTermino)}</Dato>
        </Box>
      </Seccion>

      <Seccion titulo="Contrato">
        {obra.montoContrato === null ? (
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            Aún no se registra el monto del contrato.
          </Typography>
        ) : (
          <Box sx={rejilla}>
            <Dato etiqueta={enUf ? 'Monto del contrato (UF)' : 'Monto del contrato (CLP)'}>
              {enUf ? formatUF(obra.montoContrato) : formatCLP(obra.montoContrato)}
            </Dato>
            <Dato etiqueta="Equivalente en pesos">
              {formatCLP(obra.montoContratoClp)}
              {enUf && obra.valorUf !== null && (
                <Typography
                  component="span"
                  sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
                >
                  Al valor de la UF del {formatearFecha(obra.fechaValorUf)} (
                  {formatCLP(obra.valorUf)})
                </Typography>
              )}
            </Dato>
            {enUf && (
              <Dato etiqueta="Equivalente hoy">
                {resumen.montoContratoClpHoy !== null && resumen.valorUfHoy ? (
                  <>
                    {formatCLP(resumen.montoContratoClpHoy)}
                    <Typography
                      component="span"
                      sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
                    >
                      UF de hoy: {formatCLP(resumen.valorUfHoy.valor)} (
                      {formatearFecha(resumen.valorUfHoy.fecha)})
                    </Typography>
                  </>
                ) : (
                  <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>
                    No hay valor de la UF cargado para hoy.
                  </Typography>
                )}
              </Dato>
            )}
          </Box>
        )}
      </Seccion>

      {obra.observaciones && (
        <Seccion titulo="Observaciones">
          <Typography sx={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>
            {obra.observaciones}
          </Typography>
        </Seccion>
      )}

      <Card component="section" aria-label="Archivos adjuntos de la obra">
        <CardContent>
          <AttachmentUploader
            entidadTipo="obra"
            entidadId={obra.id}
            titulo="Adjuntos"
            soloLectura={obra.estado.codigo === 'cerrada'}
          />
        </CardContent>
      </Card>

      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
        Creada el {formatearFechaHora(obra.creadoEn)} · Última modificación{' '}
        {formatearFechaHora(obra.actualizadoEn)}
        {' · '}Versión {obra.version}
      </Typography>
    </Box>
  );
}
