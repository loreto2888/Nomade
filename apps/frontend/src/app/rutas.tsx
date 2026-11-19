import type { RouteObject } from 'react-router';
import { EnConstruccionPage } from '@/features/sistema/EnConstruccionPage';
import { ErrorRutaPage } from '@/features/sistema/ErrorRutaPage';
import { NoEncontradoPage } from '@/features/sistema/NoEncontradoPage';
import { InicioPage } from '@/features/inicio/InicioPage';
import { AppLayout, type HandleRuta } from './layout/AppLayout';
import { MENU, PANTALLAS_INTERNAS, type Pantalla } from './navegacion';
import { SoloAdmin } from './SoloAdmin';

function rutaEnConstruccion(pantalla: Pantalla, seccion: string, soloAdmin?: boolean): RouteObject {
  const pagina = (
    <EnConstruccionPage
      seccion={seccion}
      titulo={pantalla.titulo}
      descripcion={pantalla.descripcion}
    />
  );
  const handle: HandleRuta = { etiqueta: pantalla.etiqueta };
  return {
    path: pantalla.ruta,
    handle,
    element: soloAdmin ? <SoloAdmin>{pagina}</SoloAdmin> : pagina,
  };
}

const rutasMenu = MENU.flatMap((seccion) =>
  seccion.items
    .filter((item) => item.ruta !== '/')
    .map((item) => rutaEnConstruccion(item, seccion.titulo, seccion.soloAdmin)),
);

const rutasInternas = PANTALLAS_INTERNAS.map((p) => rutaEnConstruccion(p, p.seccion, p.soloAdmin));

const handleInicio: HandleRuta = { etiqueta: 'Dashboard' };
const handle404: HandleRuta = { etiqueta: 'Página no encontrada' };

/** Rutas de la aplicación (React Router en modo datos). */
export const rutas: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <ErrorRutaPage />,
    children: [
      { index: true, handle: handleInicio, element: <InicioPage /> },
      ...rutasMenu,
      ...rutasInternas,
      { path: '*', handle: handle404, element: <NoEncontradoPage /> },
    ],
  },
];
