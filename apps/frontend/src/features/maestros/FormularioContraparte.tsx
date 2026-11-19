import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  erroresPorCampo,
  esConflictoVersion,
  mensajeDeError,
  normalizarError,
} from '@/api/errores';
import { ConflictDialog } from '@/components/ConflictDialog';
import { CamposContraparte } from './CamposContraparte';
import {
  CONTRAPARTE_VACIA,
  aCuerpoContraparte,
  deContraparte,
  esquemaContraparte,
  type DatosContraparte,
} from './esquemas';

type Cuerpo = ReturnType<typeof aCuerpoContraparte>;

interface RegistroContraparte {
  id: number;
  version: number;
  rut: string;
  razonSocial: string;
  nombreFantasia: string | null;
  giro: string | null;
  contactoNombre: string | null;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
}

/** Lo que el formulario necesita de una mutación de TanStack Query. */
export interface MutacionGuardado<TVariables, TResultado> {
  mutate: (
    variables: TVariables,
    opciones: { onSuccess: (resultado: TResultado) => void; onError: (error: unknown) => void },
  ) => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  reset: () => void;
}

interface FormularioContraparteProps<R extends RegistroContraparte> {
  abierto: boolean;
  /** Registro a editar; sin él, el formulario crea uno nuevo. */
  registro?: R;
  titulos: { nuevo: string; editar: string };
  /** «el cliente», «el proveedor»: para el aviso de conflicto. */
  entidad: string;
  textoCrear: string;
  crear: MutacionGuardado<Cuerpo, R>;
  actualizar: MutacionGuardado<Cuerpo & { id: number; version: number }, R>;
  onCerrar: () => void;
  onGuardado: (registro: R, creado: boolean) => void;
  /** Otra persona modificó el registro (409): el padre recarga la lista y cierra el formulario. */
  onConflicto: () => void;
}

/** Alta y edición de un cliente o proveedor (campos comunes, RUT con módulo 11). */
export function FormularioContraparte<R extends RegistroContraparte>({
  abierto,
  registro,
  titulos,
  entidad,
  textoCrear,
  crear,
  actualizar,
  onCerrar,
  onGuardado,
  onConflicto,
}: FormularioContraparteProps<R>) {
  const idTitulo = useId();
  const editando = registro !== undefined;
  const [conflicto, setConflicto] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DatosContraparte>({
    resolver: zodResolver(esquemaContraparte),
    defaultValues: registro ? deContraparte(registro) : CONTRAPARTE_VACIA,
  });

  useEffect(() => {
    if (abierto) {
      reset(registro ? deContraparte(registro) : CONTRAPARTE_VACIA);
      crear.reset();
      actualizar.reset();
    }
    // Se reinicia solo al abrir o al cambiar de registro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, registro?.id]);

  const mutacion = editando ? actualizar : crear;

  const alFallar = (error: unknown) => {
    if (esConflictoVersion(error)) {
      setConflicto(true);
      return;
    }
    const campos = erroresPorCampo(error);
    for (const campo of Object.keys(CONTRAPARTE_VACIA) as (keyof DatosContraparte)[]) {
      if (campos[campo]) setError(campo, { message: campos[campo] });
    }
    if (normalizarError(error).codigo === 'RUT_DUPLICADO') {
      setError('rut', { message: normalizarError(error).mensaje });
    }
  };

  const enviar = handleSubmit((datos) => {
    const cuerpo = aCuerpoContraparte(datos);
    if (registro) {
      actualizar.mutate(
        { id: registro.id, version: registro.version, ...cuerpo },
        { onSuccess: (r) => onGuardado(r, false), onError: alFallar },
      );
    } else {
      crear.mutate(cuerpo, { onSuccess: (r) => onGuardado(r, true), onError: alFallar });
    }
  });

  // Los errores que se muestran en un campo (validación y RUT duplicado) no se repiten arriba.
  const errorEnCampo =
    mutacion.isError &&
    (Object.keys(erroresPorCampo(mutacion.error)).length > 0 ||
      normalizarError(mutacion.error).codigo === 'RUT_DUPLICADO');
  const errorGeneral =
    mutacion.isError && !conflicto && !errorEnCampo ? mensajeDeError(mutacion.error) : null;

  return (
    <>
      <Dialog
        open={abierto}
        onClose={mutacion.isPending ? undefined : onCerrar}
        aria-labelledby={idTitulo}
        fullWidth
        maxWidth="md"
      >
        <form onSubmit={(e) => void enviar(e)} noValidate>
          <DialogTitle id={idTitulo}>{editando ? titulos.editar : titulos.nuevo}</DialogTitle>
          <DialogContent sx={{ pt: '8px !important' }}>
            <CamposContraparte control={control} register={register} errors={errors} />
            {errorGeneral && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorGeneral}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onCerrar} color="inherit" disabled={mutacion.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={mutacion.isPending}>
              {editando ? 'Guardar cambios' : textoCrear}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConflictDialog
        abierto={abierto && conflicto}
        entidad={entidad}
        onUsarActual={() => {
          setConflicto(false);
          onConflicto();
        }}
        onCerrar={() => setConflicto(false)}
      />
    </>
  );
}
