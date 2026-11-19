import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useEffect, useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { esConflictoVersion, erroresPorCampo, mensajeDeError } from '@/api/errores';
import type { UsuarioClaveTemporalDto, UsuarioDto } from '@/api/generated';
import { useActualizarUsuario, useCrearUsuario } from '@/api/usuarios';
import { esquemaUsuario, type DatosUsuario } from './esquemas';

interface FormularioUsuarioProps {
  abierto: boolean;
  /** Usuario a editar; sin él, el formulario crea uno nuevo. */
  usuario?: UsuarioDto;
  /** Id del usuario autenticado: un admin no puede quitarse su propio rol. */
  usuarioActualId: number;
  onCerrar: () => void;
  onCreado: (resultado: UsuarioClaveTemporalDto) => void;
  onActualizado: (usuario: UsuarioDto) => void;
  /** Otra persona modificó el usuario (409): recargar los datos y cerrar. */
  onConflicto: () => void;
}

const VACIO: DatosUsuario = { correo: '', nombre: '', rol: 'usuario' };

/** Alta y edición de usuarios (P25). El rol sale de la cuenta, no del login. */
export function FormularioUsuario({
  abierto,
  usuario,
  usuarioActualId,
  onCerrar,
  onCreado,
  onActualizado,
  onConflicto,
}: FormularioUsuarioProps) {
  const idTitulo = useId();
  const crear = useCrearUsuario();
  const actualizar = useActualizarUsuario();
  const editando = usuario !== undefined;
  const esUnoMismo = usuario?.id === usuarioActualId;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DatosUsuario>({
    resolver: zodResolver(esquemaUsuario),
    defaultValues: VACIO,
  });

  useEffect(() => {
    if (abierto) {
      reset(usuario ? { correo: usuario.correo, nombre: usuario.nombre, rol: usuario.rol } : VACIO);
      crear.reset();
      actualizar.reset();
    }
    // Se reinicia solo al abrir o al cambiar de usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, usuario?.id]);

  const mutacion = editando ? actualizar : crear;
  const conflicto = actualizar.isError && esConflictoVersion(actualizar.error);

  const alFallar = (error: unknown) => {
    const campos = erroresPorCampo(error);
    for (const campo of ['correo', 'nombre', 'rol'] as const) {
      if (campos[campo]) setError(campo, { message: campos[campo] });
    }
  };

  const enviar = handleSubmit((datos) => {
    if (usuario) {
      actualizar.mutate(
        { id: usuario.id, version: usuario.version, ...datos },
        { onSuccess: (actualizado) => onActualizado(actualizado), onError: alFallar },
      );
    } else {
      crear.mutate(datos, { onSuccess: (resultado) => onCreado(resultado), onError: alFallar });
    }
  });

  return (
    <Dialog
      open={abierto}
      onClose={mutacion.isPending ? undefined : onCerrar}
      aria-labelledby={idTitulo}
      fullWidth
      maxWidth="xs"
    >
      <form onSubmit={(e) => void enviar(e)} noValidate>
        <DialogTitle id={idTitulo}>{editando ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {!editando && (
            <Alert severity="info" variant="outlined">
              Se generará una contraseña temporal. El usuario deberá cambiarla al ingresar.
            </Alert>
          )}
          <TextField
            label="Correo"
            type="email"
            autoComplete="off"
            fullWidth
            error={Boolean(errors.correo)}
            helperText={errors.correo?.message}
            {...register('correo')}
          />
          <TextField
            label="Nombre"
            autoComplete="off"
            fullWidth
            error={Boolean(errors.nombre)}
            helperText={errors.nombre?.message}
            {...register('nombre')}
          />
          <Controller
            name="rol"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Rol"
                fullWidth
                disabled={editando && esUnoMismo}
                error={Boolean(errors.rol)}
                helperText={
                  editando && esUnoMismo
                    ? 'No puedes quitarte a ti mismo el rol de administrador.'
                    : errors.rol?.message
                }
                {...field}
              >
                <MenuItem value="usuario">Usuario</MenuItem>
                <MenuItem value="admin">Administrador</MenuItem>
              </TextField>
            )}
          />
          {conflicto ? (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={onConflicto}>
                  Recargar datos
                </Button>
              }
            >
              Otra persona modificó este usuario mientras lo editabas. Recarga los datos para ver la
              versión vigente.
            </Alert>
          ) : (
            mutacion.isError && <Alert severity="error">{mensajeDeError(mutacion.error)}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onCerrar} color="inherit" disabled={mutacion.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutacion.isPending}>
            {editando ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
