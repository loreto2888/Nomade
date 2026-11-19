import type { GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { useState } from 'react';
import { useValorDiferido } from './useValorDiferido';

/**
 * Estado de una tabla con búsqueda, paginación y orden en el servidor. `camposOrden` son los
 * campos que el backend acepta en `ordenarPor`; cualquier otro se ignora.
 */
export function useTablaServidor<C extends string>(camposOrden: readonly C[]) {
  const [busqueda, setBusqueda] = useState('');
  const [paginacion, setPaginacion] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const [orden, setOrden] = useState<GridSortModel>([]);
  const q = useValorDiferido(busqueda.trim());

  const campo = orden[0]?.field;
  const ordenarPor = camposOrden.find((c) => c === campo);
  const direccion = ordenarPor ? (orden[0]?.sort ?? undefined) : undefined;

  const primeraPagina = () => setPaginacion((p) => ({ ...p, page: 0 }));

  return {
    busqueda,
    /** Cambia el texto de búsqueda y vuelve a la primera página. */
    buscar: (texto: string) => {
      setBusqueda(texto);
      primeraPagina();
    },
    q: q || undefined,
    paginacion,
    setPaginacion,
    primeraPagina,
    orden,
    setOrden,
    ordenarPor,
    direccion,
    /** Parámetros comunes para la consulta al servidor. */
    parametros: {
      pagina: paginacion.page + 1,
      tamanio: paginacion.pageSize,
      q: q || undefined,
      ordenarPor,
      direccion,
    },
  };
}
