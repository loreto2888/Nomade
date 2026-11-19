import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as EnlaceRouter, useNavigate, useParams, useSearchParams } from 'react-router';
import { mensajeDeError, normalizarError } from '@/api/errores';
import { useEliminarObra, useResumenObra } from '@/api/obras';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusChip } from '@/components/StatusChip';
import { PESTANAS_OBRA, pestanaValida } from './pestanas';
import { PresupuestoTab } from '@/features/presupuestos/PresupuestoTab';
import { ResumenObra } from './ResumenObra';

/** P05 — Ficha de la obra con pestañas. Implementadas: «Resumen» (fase 2) y «Presupuesto» (fase 3). */
export function FichaObraPage() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const obraId = Number(id);
  const idValido = Number.isInteger(obraId) && obraId > 0;
  const consulta = useResumenObra(idValido ? obraId : undefined);
  const eliminar = useEliminarObra();
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const pestana = pestanaValida(parametros.get('pestana'));
  const definicion = PESTANAS_OBRA.find((p) => p.id === pestana)!;

  if (!idValido || (consulta.isError && normalizarError(consulta.error).estado === 404)) {
    return (
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" component={EnlaceRouter} to="/obras">
            Volver a obras
          </Button>
        }
      >
        La obra no existe o fue eliminada.
      </Alert>
    );
  }
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
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress aria-label="Cargando ficha de la obra" />
      </Box>
    );
  }

  const { obra } = consulta.data;
  const cerrada = obra.estado.codigo === 'cerrada';

  return (
    <>
      <CabeceraPagina
        eyebrow="Obras"
        titulo={obra.nombre}
        descripcion={`${obra.codigoCentroCosto} · ${obra.cliente.razonSocial}`}
        acciones={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <StatusChip estado={obra.estado.codigo} etiqueta={obra.estado.nombre} />
            <Button
              variant="outlined"
              startIcon={<EditOutlined />}
              component={EnlaceRouter}
              to={`/obras/${obra.id}/editar`}
              disabled={cerrada}
            >
              Editar
            </Button>
            {obra.estado.codigo === 'en_preparacion' && (
              <Button color="error" onClick={() => setConfirmarEliminar(true)}>
                Eliminar
              </Button>
            )}
          </Box>
        }
      />

      <Tabs
        value={pestana}
        onChange={(_e, valor: string) =>
          setParametros(valor === 'resumen' ? {} : { pestana: valor })
        }
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Secciones de la obra"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {PESTANAS_OBRA.map((p) => (
          <Tab
            key={p.id}
            value={p.id}
            id={`pestana-${p.id}`}
            aria-controls={`panel-${p.id}`}
            label={
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                {p.etiqueta}
                {p.pendiente && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label="Pendiente"
                    sx={{ height: 18, fontSize: 10 }}
                  />
                )}
              </Box>
            }
          />
        ))}
      </Tabs>

      <Box role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`pestana-${pestana}`}>
        {pestana === 'resumen' ? (
          <ResumenObra resumen={consulta.data} />
        ) : pestana === 'presupuesto' ? (
          <PresupuestoTab obra={obra} />
        ) : (
          <Card>
            <CardContent sx={{ py: 6, textAlign: 'center' }}>
              <Box
                sx={{
                  mx: 'auto',
                  mb: 2,
                  width: 48,
                  height: 48,
                  borderRadius: '10px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'apoyo.vacioFondo',
                  color: 'apoyo.vacioIcono',
                }}
              >
                <ConstructionOutlined />
              </Box>
              <Typography variant="h6" component="h2">
                {definicion.etiqueta}: pendiente
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>
                {definicion.pendiente}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 12, color: 'text.secondary' }}>
                Esta sección se habilitará en una próxima fase del plan.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      <ConfirmDialog
        abierto={confirmarEliminar}
        titulo="Eliminar obra"
        descripcion={`Se eliminará la obra ${obra.nombre} (${obra.codigoCentroCosto}). El registro se conserva para el historial.`}
        textoConfirmar="Eliminar"
        peligro
        pedirMotivo
        cargando={eliminar.isPending}
        error={eliminar.isError ? mensajeDeError(eliminar.error) : null}
        onConfirmar={(motivo) =>
          eliminar.mutate(
            { id: obra.id, version: obra.version, motivo },
            { onSuccess: () => void navegar('/obras') },
          )
        }
        onCancelar={() => {
          eliminar.reset();
          setConfirmarEliminar(false);
        }}
      />
    </>
  );
}
