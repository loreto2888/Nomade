import { useEffect } from 'react';
import type { TemaInterfaz } from '@/api/generated';
import { esModoTema, useModoTema } from './contextoTema';

interface Props {
  usuarioId: number;
  tema: TemaInterfaz;
}

/** Al iniciar sesión (o cambiar de usuario) aplica la preferencia de tema guardada en su cuenta. */
export function SincronizarTemaUsuario({ usuarioId, tema }: Props) {
  const { establecerModo } = useModoTema();
  useEffect(() => {
    if (esModoTema(tema)) establecerModo(tema);
    // Solo al cambiar de usuario: los cambios posteriores los origina el propio selector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId]);
  return null;
}
