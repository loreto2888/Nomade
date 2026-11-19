# AuthApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**actualizarTema**](#actualizartema) | **PATCH** /api/auth/tema | Guarda la preferencia de tema (claro u oscuro) del usuario|
|[**cambiarClave**](#cambiarclave) | **POST** /api/auth/cambiar-clave | Cambia la contraseña propia|
|[**cerrarSesion**](#cerrarsesion) | **POST** /api/auth/logout | Cierra la sesión actual|
|[**iniciarSesion**](#iniciarsesion) | **POST** /api/auth/login | Inicia sesión con correo y contraseña|
|[**obtenerSesion**](#obtenersesion) | **GET** /api/auth/sesion | Sesión actual: usuario, rol y permisos|

# **actualizarTema**
> SesionActualDto actualizarTema(actualizarTemaDto)


### Example

```typescript
import {
    AuthApi,
    Configuration,
    ActualizarTemaDto
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let actualizarTemaDto: ActualizarTemaDto; //

const { status, data } = await apiInstance.actualizarTema(
    actualizarTemaDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarTemaDto** | **ActualizarTemaDto**|  | |


### Return type

**SesionActualDto**

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
|**401** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cambiarClave**
> SesionActualDto cambiarClave(cambiarClaveDto)

Mínimo 12 caracteres. Si la cuenta tenía una contraseña temporal, desbloquea el resto de la aplicación. Cierra las demás sesiones del usuario.

### Example

```typescript
import {
    AuthApi,
    Configuration,
    CambiarClaveDto
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let cambiarClaveDto: CambiarClaveDto; //

const { status, data } = await apiInstance.cambiarClave(
    cambiarClaveDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **cambiarClaveDto** | **CambiarClaveDto**|  | |


### Return type

**SesionActualDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Contraseña actual incorrecta o nueva inválida. |  -  |
|**401** |  |  -  |
|**429** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cerrarSesion**
> cerrarSesion()


### Example

```typescript
import {
    AuthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.cerrarSesion();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Sesión cerrada. |  -  |
|**401** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **iniciarSesion**
> SesionActualDto iniciarSesion(iniciarSesionDto)

Crea una sesión opaca y la entrega en la cookie `httpOnly` `nomade_session` (8 h máximo, 30 min de inactividad). Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.

### Example

```typescript
import {
    AuthApi,
    Configuration,
    IniciarSesionDto
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let iniciarSesionDto: IniciarSesionDto; //

const { status, data } = await apiInstance.iniciarSesion(
    iniciarSesionDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **iniciarSesionDto** | **IniciarSesionDto**|  | |


### Return type

**SesionActualDto**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** |  |  -  |
|**401** | Correo o contraseña incorrectos. |  -  |
|**403** | Cuenta desactivada u origen no permitido. |  -  |
|**423** | Cuenta bloqueada temporalmente. |  -  |
|**429** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **obtenerSesion**
> SesionActualDto obtenerSesion()


### Example

```typescript
import {
    AuthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.obtenerSesion();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SesionActualDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**401** | Sin sesión o sesión vencida. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

