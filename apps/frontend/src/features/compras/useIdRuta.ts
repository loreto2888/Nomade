import { useParams } from 'react-router';

/** Id numérico de la ruta (`:id`), o `undefined` si no es válido. */
export function useIdRuta(): number | undefined {
  const { id } = useParams();
  const numero = Number(id);
  return Number.isInteger(numero) && numero > 0 ? numero : undefined;
}
