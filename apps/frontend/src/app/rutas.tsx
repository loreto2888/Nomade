import type { ReactElement } from 'react';
import type { RouteObject } from 'react-router';
import { EnConstruccionPage } from '@/features/sistema/EnConstruccionPage';
import { ErrorRutaPage } from '@/features/sistema/ErrorRutaPage';
import { NoEncontradoPage } from '@/features/sistema/NoEncontradoPage';
import { InicioPage } from '@/features/inicio/InicioPage';
import { CambiarClavePage } from '@/features/acceso/CambiarClavePage';
import { LoginPage } from '@/features/acceso/LoginPage';
import { AuditoriaPage } from '@/features/auditoria/AuditoriaPage';
import { UsuariosPage } from '@/features/usuarios/UsuariosPage';
import { AppLayout, type HandleRuta } from './layout/AppLayout';
import { MENU, PANTALLAS_INTERNAS, type Pantalla } from './navegacion';
import { RutaProtegida } from './RutaProtegida';
import { RUTA_CAMBIAR_CLAVE, RUTA_INGRESAR } from './rutasAcceso';
import { SoloAdmin } from './SoloAdmin';

/** Pantallas ya implementadas: reemplazan al placeholder «En construcción». */
const PAGINAS_IMPLEMENTADAS: Record<string, ReactElement> = {
  '/admin/usuarios': <UsuariosPage />,
  '/admin/auditoria': <AuditoriaPage />,
};

function rutaEnConstruccion(pantalla: Pantalla, seccion: string, soloAdmin?: boolean): RouteObject {
  const pagina = PAGINAS_IMPLEMENTADAS[pantalla.ruta] ?? (
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
  { path: RUTA_INGRESAR, element: <LoginPage />, errorElement: <ErrorRutaPage /> },
  {
    element: <RutaProtegida />,
    errorElement: <ErrorRutaPage />,
    children: [
      // Cambio de contraseña a pantalla completa: si es obligatorio, bloquea el resto.
      { path: RUTA_CAMBIAR_CLAVE, element: <CambiarClavePage /> },
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
    ],
  },
];
