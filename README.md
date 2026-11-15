# Nómade · prototipo navegable

Prototipo de 31 pantallas con acceso mediante cuentas individuales y borradores persistentes. Los registros de ejemplo son ficticios; los borradores no generan operaciones reales.

## Iniciar en Windows

Requiere Node.js 24 o superior. En PowerShell, dentro de la carpeta del proyecto:

```powershell
npm install
$env:ADMIN_USERNAME = Read-Host "Usuario del primer administrador"
$secure = Read-Host "Contraseña inicial (mínimo 12 caracteres)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
npm start
```

Abre `http://127.0.0.1:3000` y selecciona el acceso de administrador. El primer administrador se crea solo si la base de datos está vacía. Las contraseñas no tienen valores predeterminados ni se guardan en el código. Al terminar el servidor con Ctrl+C, ejecuta `Remove-Item Env:\ADMIN_PASSWORD` en la misma terminal. Para inicios posteriores no es necesario proporcionar esas variables.

En **Usuarios y permisos**, el administrador puede crear usuarios con contraseña temporal. Cada usuario debe cambiarla en su primer ingreso y seleccionar el acceso de usuario. Ambos perfiles pueden cerrar sesión y cambiar su contraseña. La recuperación automática, el restablecimiento de contraseñas y las restricciones por obra todavía no están implementados.

La base SQLite y las sesiones se guardan localmente en `data/`, excluida de Git. Respáldala y protégela; perderla implica perder las cuentas. No publiques ese directorio ni las variables de entorno.

## Borradores

Se pueden guardar y revisar borradores de obras, presupuestos, EEPP, ingresos, OC, OT, facturas, rendiciones, distribuciones, prorrateos, ajustes, cierres, proveedores, tareas y lotes de pago. Cada usuario ve sus propios borradores; los administradores ven los de todos. Se guardan con autor y fecha en la base local.

Son documentos de preparación, no transacciones: las referencias se escriben como texto y no se vinculan ni validan contra otros registros. Guardar no aprueba un presupuesto, crea una orden operativa, asigna una tarea, registra un ingreso, ejecuta un pago ni cierra una obra. No se hacen cálculos, conciliaciones, comprobaciones de duplicidad ni notificaciones. Todavía no hay edición, eliminación o aprobación de borradores.

La importación de archivos, extracción con IA, integraciones, conciliación, exportación y reportes definitivos siguen pendientes. Los formularios y reglas deben validarse antes de utilizar información real.

## Estructura

Las definiciones de pantallas se agrupan en `screens/` por acceso, dashboard, obras, pagos y compras, control y administración. `app.js` contiene la navegación y componentes compartidos; `server.js` sirve la aplicación y gestiona las cuentas. Usa el menú o «Continuar en» para recorrer las pantallas. La ficha de ejemplo corresponde solo a Local Parque Norte.

## Antes de publicar en internet

La configuración predeterminada escucha únicamente en `127.0.0.1`; no publica el sitio en internet. Para una instalación web se requiere infraestructura propia, HTTPS mediante un proxy inverso y `APP_ORIGIN` configurado con el origen HTTPS exacto. En producción, el servidor exige `NODE_ENV=production` y un origen HTTPS. Configura respaldos, monitoreo y controles de acceso en el servidor.

El límite de intentos se mantiene en memoria de un solo proceso y no sustituye protección distribuida. Antes de usar el sistema con datos reales se necesita una revisión de seguridad, recuperación de cuentas, reglas de permisos y una implementación transaccional. El prototipo no reemplaza Laudus ni implementa integraciones o protección por obra.

Ejecuta las pruebas con `npm test`.
