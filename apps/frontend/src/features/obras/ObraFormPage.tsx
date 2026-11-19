import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate, useParams } from 'react-router';
import { normalizarError } from '@/api/errores';
import { useObra } from '@/api/obras';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { FormularioObra } from './FormularioObra';

/** P04 — Alta (`/obras/nueva`) y edición (`/obras/:id/editar`) de una obra. */
export function ObraFormPage() {
  const { id } = useParams();
  const navegar = useNavigate();
  const obraId = id === undefined ? undefined : Number(id);
  const editando = obraId !== undefined;
  const idValido = !editando || (Number.isInteger(obraId) && obraId > 0);
  const consulta = useObra(editando && idValido ? obraId : undefined);

  const volver = () => void navegar(editando && idValido ? `/obras/${obraId}` : '/obras');

  return (
    <>
      <CabeceraPagina
        eyebrow="Obras"
        titulo={editando ? 'Editar obra' : 'Nueva obra'}
        descripcion="Define los datos principales, el cliente, las fechas y el contrato de la obra."
      />

      {!idValido || (consulta.isError && normalizarError(consulta.error).estado === 404) ? (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => void navegar('/obras')}>
              Volver a obras
            </Button>
          }
        >
          La obra no existe o fue eliminada.
        </Alert>
      ) : consulta.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void consulta.refetch()}>
              Reintentar
            </Button>
          }
        >
          No se pudo cargar la obra.
        </Alert>
      ) : editando && !consulta.data ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress aria-label="Cargando obra" />
        </Box>
      ) : (
        <FormularioObra
          // Si el servidor entrega otra obra (cambio de ruta), el formulario parte de cero.
          key={consulta.data?.id ?? 'nueva'}
          obra={consulta.data}
          onCancelar={volver}
          onGuardada={(obra) => void navegar(`/obras/${obra.id}`)}
        />
      )}
    </>
  );
}
