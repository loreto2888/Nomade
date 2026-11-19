# UsuariosApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**activarUsuario**](#activarusuario) | **POST** /api/usuarios/{id}/activar | Reactiva un usuario desactivado|
|[**actualizarUsuario**](#actualizarusuario) | **PATCH** /api/usuarios/{id} | Modifica nombre, correo o rol (con control de versión)|
|[**crearUsuario**](#crearusuario) | **POST** /api/usuarios | Crea un usuario con contraseña temporal|
|[**desactivarUsuario**](#desactivarusuario) | **POST** /api/usuarios/{id}/desactivar | Desactiva un usuario|
|[**listarUsuarios**](#listarusuarios) | **GET** /api/usuarios | Lista usuarios (paginado y filtrable)|
|[**obtenerUsuario**](#obtenerusuario) | **GET** /api/usuarios/{id} | Obtiene un usuario|
|[**restablecerClaveUsuario**](#restablecerclaveusuario) | **POST** /api/usuarios/{id}/restablecer-clave | Restablece la contraseña con una temporal|

# **activarUsuario**
> UsuarioDto activarUsuario(accionUsuarioDto)


### Example

```typescript
import {
    UsuariosApi,
    Configuration,
    AccionUsuarioDto
} from './api';

const configuration = new Configuration();
const apiInstance = new UsuariosApi(configuration);

let id: number; //Identificador del usuario. (default to undefined)
let accionUsuarioDto: AccionUsuarioDto; //

const { status, data } = await apiInstance.activarUsuario(
    id,
    accionUsuarioDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **accionUsuarioDto** | **AccionUsuarioDto**|  | |
| **id** | [**number**] | Identificador del usuario. | defaults to undefined|


### Return type

**UsuarioDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**401** | Sin sesión válida. |  -  |
|**403** | Solo administradores. |  -  |
|**404** |  |  -  |
|**409** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **actualizarUsuario**
> UsuarioDto actualizarUsuario(actualizarUsuarioDto)


### Example

```typescript
import {
    UsuariosApi,
    Configuration,
    ActualizarUsuarioDto
} from './api';

const configuration = new Configuration();
const apiInstance = new UsuariosApi(configuration);

let id: number; //Identificador del usuario. (default to undefined)
let actualizarUsuarioDto: ActualizarUsuarioDto; //

const { status, data } = await apiInstance.actualizarUsuario(
    id,
    actualizarUsuarioDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarUsuarioDto** | **ActualizarUsuarioDto**|  | |
| **id** | [**number**] | Identificador del usuario. | defaults to undefined|


### Return type

**UsuarioDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** |  |  -  |
|**401** | Sin sesión válida. |  -  |
|**403** | Solo administradores. |  -  |
|**404** |  |  -  |
|**409** | Versión desactualizada (&#x60;CONFLICTO_VERSION&#x60;) o correo duplicado (&#x60;CORREO_DUPLICADO&#x60;). |  -  |
|**422** | Viola una regla: un admin no puede quitarse el rol; debe quedar un admin activo. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **crearUsuario**
> UsuarioClaveTemporalDto crearUsuario(crearUsuarioDto)

La contraseña temporal se genera en el servidor y se devuelve una sola vez; el usuario deberá cambiarla al ingresar.

### Example

```typescript
import {
    UsuariosApi,
    Configuration,
    CrearUsuarioDto
} from './api';

const configuration = new Configuration();
const apiInstance = new UsuariosApi(configuration);

let crearUsuarioDto: CrearUsuarioDto; //

const { status, data } = await apiInstance.crearUsuario(
    crearUsuarioDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearUsuarioDto** | **CrearUsuarioDto**|  | |


### Return type

**UsuarioClaveTemporalDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** |  |  -  |
|**400** |  |  -  |
|**401** | Sin sesión válida. |  -  |
|**403** | Solo administradores. |  -  |
|**409** | El correo ya existe. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **desactivarUsuario**
> UsuarioDto desactivarUsuario(accionUsuarioDto)

Los usuarios nunca se eliminan. Se revocan sus sesiones.

### Example

```typescript
import {
    UsuariosApi,
    Configuration,
    AccionUsuarioDto
} from './api';

const configuration = new Configuration();
const apiInstance = new UsuariosApi(configuration);

let id: number; //Identificador del usuario. (default to undefined)
let accionUsuarioDto: AccionUsuarioDto; //

const { status, data } = await apiInstance.desactivarUsuario(
    id,
    accionUsuarioDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **accionUsuarioDto** | **AccionUsuarioDto**|  | |
| **id** | [**number**] | Identificador del usuario. | defaults to undefined|


### Return type

**UsuarioDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**401** | Sin sesión válida. |  -  |
|**403** | Solo administradores. |  -  |
|**404** |  |  -  |
|**409** |  |  -  |
|**422** | Un admin no puede desactivarse; debe quedar al menos un admin activo. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarUsuarios**
> PaginaUsuariosDto listarUsuarios()


### Example

```typescript
import {
    UsuariosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UsuariosApi(configuration);

let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let q: string; //Búsqueda por nombre o correo. (optional) (default to undefined)
let rol: Rol; // (optional) (default to undefined)
let activo: boolean; //Filtra por cuentas activas o desactivadas. (optional) (default to undefined)

const { status, data } = await apiInstance.listarUsuarios(
    pagina,
    tamanio,
    q,
    rol,
    activo
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **pagina** | [**number**] | Número de página (desde 1). | (optional) defaults to 1|
| **tamanio** | [**number**] | Registros por página. | (optional) defaults to 25|
| **q** | [**string**] | Búsqueda por nombre o correo. | (optional) defaults to undefined|
| **rol** | **Rol** |  | (optional) defaults to undefined|
| **activo** | [**boolean**] | Filtra por cuentas activas o desactivadas. | (optional) defaults to undefined|


### Return type

**PaginaUsuariosDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** |  |  -  |
|**401** | Sin sesión válida. |  -  |
|**403** | Solo administradores. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **obtenerUsuario**
> UsuarioDto obtenerUsuario()


### Example

```typescript
import {
    UsuariosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UsuariosApi(configuration);

let id: number; //Identificador del usuario. (default to undefined)

const { status, data } = await apiInstance.obtenerUsuario(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador del usuario. | defaults to undefined|


### Return type

**UsuarioDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**401** | Sin sesión válida. |  -  |
|**403** | Solo administradores. |  -  |
|**404** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **restablecerClaveUsuario**
> UsuarioClaveTemporalDto restablecerClaveUsuario(accionUsuarioDto)

Genera una contraseña temporal (se devuelve una sola vez), obliga a cambiarla y cierra las sesiones del usuario.

### Example

```typescript
import {
    UsuariosApi,
    Configuration,
    AccionUsuarioDto
} from './api';

const configuration = new Configuration();
const apiInstance = new UsuariosApi(configuration);

let id: number; //Identificador del usuario. (default to undefined)
let accionUsuarioDto: AccionUsuarioDto; //

const { status, data } = await apiInstance.restablecerClaveUsuario(
    id,
    accionUsuarioDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **accionUsuarioDto** | **AccionUsuarioDto**|  | |
| **id** | [**number**] | Identificador del usuario. | defaults to undefined|


### Return type

**UsuarioClaveTemporalDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**401** | Sin sesión válida. |  -  |
|**403** | Solo administradores. |  -  |
|**404** |  |  -  |
|**409** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

