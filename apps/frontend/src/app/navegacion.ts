import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import AssessmentOutlined from '@mui/icons-material/AssessmentOutlined';
import CalendarViewMonthOutlined from '@mui/icons-material/CalendarViewMonthOutlined';
import CompareArrowsOutlined from '@mui/icons-material/CompareArrowsOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EngineeringOutlined from '@mui/icons-material/EngineeringOutlined';
import GridViewOutlined from '@mui/icons-material/GridViewOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import PieChartOutlineOutlined from '@mui/icons-material/PieChartOutlineOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import SouthWestOutlined from '@mui/icons-material/SouthWestOutlined';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import SyncAltOutlined from '@mui/icons-material/SyncAltOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

/** Pantalla navegable. Títulos y descripciones tomados del prototipo (`screens/*.js`). */
export interface Pantalla {
  ruta: string;
  /** Texto corto del menú y de los breadcrumbs. */
  etiqueta: string;
  titulo: string;
  descripcion: string;
  /** Pantalla sin reglas definidas todavía: se muestra en el menú como «pendiente» (D-09). */
  pendiente?: boolean;
  /** Solo la ven (y entran) los administradores, aunque el resto de su sección sea de todos. */
  soloAdmin?: boolean;
}

export interface ItemMenu extends Pantalla {
  icono: SvgIconComponent;
}

export interface SeccionMenu {
  titulo: string;
  soloAdmin?: boolean;
  items: ItemMenu[];
}

/** Menú principal (plan §10.3). */
export const MENU: SeccionMenu[] = [
  {
    titulo: 'Inicio',
    items: [
      {
        ruta: '/',
        etiqueta: 'Dashboard',
        titulo: 'Dashboard',
        descripcion: 'Aquí tienes un resumen de lo que sucede en tus obras.',
        icono: GridViewOutlined,
      },
      {
        ruta: '/alertas',
        etiqueta: 'Alertas y tareas',
        titulo: 'Centro de alertas y tareas',
        descripcion: 'Revisa vencimientos, aprobaciones e inconsistencias pendientes.',
        icono: NotificationsNoneOutlined,
      },
    ],
  },
  {
    titulo: 'Obras',
    items: [
      {
        ruta: '/obras',
        etiqueta: 'Obras',
        titulo: 'Obras y centros de costo',
        descripcion: 'Consulta y administra tus obras y centros de costo en un solo lugar.',
        icono: ApartmentOutlined,
      },
      {
        ruta: '/clientes',
        etiqueta: 'Clientes',
        titulo: 'Clientes',
        descripcion: 'Administra los clientes (mandantes) a los que pertenecen las obras.',
        icono: BusinessOutlined,
      },
    ],
  },
  {
    titulo: 'Ingresos',
    items: [
      {
        ruta: '/eepp',
        etiqueta: 'Estados de pago',
        titulo: 'Estados de pago',
        descripcion: 'Haz seguimiento de los avances presentados y sus aprobaciones.',
        icono: ReceiptLongOutlined,
      },
      {
        ruta: '/cobranza',
        etiqueta: 'Cobranza',
        titulo: 'Cobranza y pagos de clientes',
        descripcion: 'Revisa ingresos, abonos y saldos pendientes de clientes.',
        icono: SouthWestOutlined,
      },
    ],
  },
  {
    titulo: 'Compras y gastos',
    items: [
      {
        ruta: '/ordenes-compra',
        etiqueta: 'Órdenes de compra',
        titulo: 'Órdenes de compra',
        descripcion: 'Gestiona compras de materiales y órdenes para pagos parciales.',
        icono: ListAltOutlined,
      },
      {
        ruta: '/ordenes-trabajo',
        etiqueta: 'Órdenes de trabajo',
        titulo: 'Órdenes de trabajo y subcontratos',
        descripcion: 'Controla subcontratos, hitos y órdenes de compra parciales.',
        icono: EngineeringOutlined,
      },
      {
        ruta: '/facturas',
        etiqueta: 'Facturas',
        titulo: 'Facturas y documentos de egreso',
        descripcion: 'Consulta documentos, vencimientos y su asociación a órdenes.',
        icono: DescriptionOutlined,
      },
      {
        ruta: '/rendiciones',
        etiqueta: 'Rendiciones',
        titulo: 'Rendiciones y caja chica',
        descripcion: 'Revisa gastos menores, respaldos y rendiciones por obra.',
        icono: AccountBalanceWalletOutlined,
      },
      {
        ruta: '/mano-obra',
        etiqueta: 'Mano de obra',
        titulo: 'Mano de obra y cuadrillas',
        descripcion: 'Distribuye costos quincenales entre obras y partidas.',
        icono: GroupsOutlined,
      },
      {
        ruta: '/proveedores',
        etiqueta: 'Proveedores',
        titulo: 'Proveedores y contratistas',
        descripcion: 'Administra el directorio de proveedores y contratistas.',
        icono: PersonOutlineOutlined,
      },
      {
        ruta: '/pagos',
        etiqueta: 'Pagos masivos',
        titulo: 'Aprobación y pagos masivos',
        descripcion: 'Prepara lotes de pago y revisa documentos sujetos a aprobación.',
        icono: PaymentsOutlined,
      },
    ],
  },
  {
    titulo: 'Finanzas',
    items: [
      {
        ruta: '/movimientos',
        etiqueta: 'Movimientos',
        titulo: 'Libro de movimientos',
        descripcion: 'Consulta ingresos, egresos y ajustes con su documento de origen.',
        icono: SwapHorizOutlined,
      },
      {
        ruta: '/conciliacion',
        etiqueta: 'Conciliación',
        titulo: 'Conciliación y excepciones',
        descripcion: 'Detecta diferencias entre órdenes, facturas y pagos.',
        icono: CompareArrowsOutlined,
      },
      {
        ruta: '/gastos-administrativos',
        etiqueta: 'Gastos administrativos',
        titulo: 'Gastos administrativos y prorrateos',
        descripcion: 'Registra gastos generales y revisa su distribución entre obras.',
        icono: PieChartOutlineOutlined,
      },
      {
        ruta: '/cierre-anual',
        etiqueta: 'Cierre anual',
        titulo: 'Cierre y consolidado anual',
        descripcion: 'Consolida los resultados financieros por ejercicio.',
        icono: CalendarViewMonthOutlined,
      },
    ],
  },
  {
    titulo: 'Reportes',
    items: [
      {
        ruta: '/reportes',
        etiqueta: 'Reportes',
        titulo: 'Centro de reportes',
        descripcion: 'Explora informes de gestión, compras, pagos y rentabilidad.',
        icono: AssessmentOutlined,
      },
    ],
  },
  {
    titulo: 'Herramientas',
    items: [
      {
        ruta: '/importaciones',
        etiqueta: 'Importación masiva',
        titulo: 'Importación masiva',
        descripcion:
          'Carga presupuestos desde Excel o CSV: valida fila a fila, previsualiza los errores y crea la versión al confirmar.',
        icono: UploadFileOutlined,
        soloAdmin: true,
      },
      {
        ruta: '/herramientas/asistencia-ia',
        etiqueta: 'Asistencia con IA',
        titulo: 'Asistencia documental con IA',
        descripcion: 'Explora la extracción asistida de documentos para preparar borradores.',
        icono: AutoAwesomeOutlined,
        pendiente: true,
      },
    ],
  },
  {
    titulo: 'Administración',
    soloAdmin: true,
    items: [
      {
        ruta: '/admin/usuarios',
        etiqueta: 'Usuarios',
        titulo: 'Usuarios y permisos',
        descripcion: 'Administra las cuentas de usuario, sus roles y su estado.',
        icono: ManageAccountsOutlined,
      },
      {
        ruta: '/admin/auditoria',
        etiqueta: 'Auditoría',
        titulo: 'Auditoría y bitácora',
        descripcion: 'Consulta la trazabilidad de cambios, aprobaciones y movimientos.',
        icono: HistoryOutlined,
      },
      {
        ruta: '/admin/parametros',
        etiqueta: 'Parámetros',
        titulo: 'Parámetros financieros',
        descripcion: 'Configura el IVA, los plazos, el valor de la UF y los catálogos del sistema.',
        icono: SettingsOutlined,
      },
      {
        ruta: '/admin/migracion',
        etiqueta: 'Migración e integraciones',
        titulo: 'Migración e integraciones',
        descripcion: 'Coordina las fuentes de datos y conectores autorizados.',
        icono: SyncAltOutlined,
        pendiente: true,
      },
    ],
  },
];

/** Pantallas del plan §10.3 que no aparecen en el menú (se llega desde otra pantalla). */
export const PANTALLAS_INTERNAS: (Pantalla & { seccion: string; soloAdmin?: boolean })[] = [
  {
    ruta: '/obras/nueva',
    etiqueta: 'Nueva obra',
    titulo: 'Alta y edición de obra',
    descripcion: 'Define los datos principales, responsables y fechas de una obra.',
    seccion: 'Obras',
  },
  {
    ruta: '/obras/:id/editar',
    etiqueta: 'Editar obra',
    titulo: 'Edición de obra',
    descripcion: 'Modifica los datos principales, responsables, fechas y contrato de una obra.',
    seccion: 'Obras',
  },
  {
    ruta: '/obras/:id',
    etiqueta: 'Ficha de obra',
    titulo: 'Ficha 360° de la obra',
    descripcion: 'Una vista integral de la operación y la situación financiera del proyecto.',
    seccion: 'Obras',
  },
  {
    ruta: '/eepp/:id',
    etiqueta: 'Estado de pago',
    titulo: 'Detalle del estado de pago',
    descripcion: 'Prepara un estado de pago para su posterior revisión.',
    seccion: 'Ingresos',
  },
];

/** Un ítem del menú queda activo en su ruta exacta y en sus subrutas (salvo Inicio, solo exacta). */
export function rutaActiva(rutaItem: string, pathname: string): boolean {
  if (rutaItem === '/') return pathname === '/';
  return pathname === rutaItem || pathname.startsWith(`${rutaItem}/`);
}
