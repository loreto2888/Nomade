# ClientesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**actualizarCliente**](#actualizarcliente) | **PATCH** /api/clientes/{id} | Modifica un cliente (con control de versión)|
|[**crearCliente**](#crearcliente) | **POST** /api/clientes | Crea un cliente|
|[**eliminarCliente**](#eliminarcliente) | **POST** /api/clientes/{id}/eliminar | Elimina un cliente (borrado lógico)|
|[**listarClientes**](#listarclientes) | **GET** /api/clientes | Lista clientes (paginado, con búsqueda y orden)|
|[**obtenerCliente**](#obtenercliente) | **GET** /api/clientes/{id} | Obtiene un cliente|

# **actualizarCliente**
> ClienteDto actualizarCliente(actualizarClienteDto)


### Example

```typescript
import {
    ClientesApi,
    Configuration,
    ActualizarClienteDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ClientesApi(configuration);

let id: number; //Identificador del cliente. (default to undefined)
let actualizarClienteDto: ActualizarClienteDto; //

const { status, data } = await apiInstance.actualizarCliente(
    id,
    actualizarClienteDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarClienteDto** | **ActualizarClienteDto**|  | |
| **id** | [**number**] | Identificador del cliente. | defaults to undefined|


### Return type

**ClienteDto**

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
|**404** |  |  -  |
|**409** | Versión desactualizada (&#x60;CONFLICTO_VERSION&#x60;) o RUT duplicado (&#x60;RUT_DUPLICADO&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **crearCliente**
> ClienteDto crearCliente(crearClienteDto)


### Example

```typescript
import {
    ClientesApi,
    Configuration,
    CrearClienteDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ClientesApi(configuration);

let crearClienteDto: CrearClienteDto; //

const { status, data } = await apiInstance.crearCliente(
    crearClienteDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearClienteDto** | **CrearClienteDto**|  | |


### Return type

**ClienteDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** |  |  -  |
|**400** | Datos inválidos (RUT, correo…). |  -  |
|**401** | Sin sesión válida. |  -  |
|**409** | El RUT ya existe (&#x60;RUT_DUPLICADO&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **eliminarCliente**
> eliminarCliente(eliminarClienteDto)

No se puede eliminar un cliente con obras vigentes.

### Example

```typescript
import {
    ClientesApi,
    Configuration,
    EliminarClienteDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ClientesApi(configuration);

let id: number; //Identificador del cliente. (default to undefined)
let eliminarClienteDto: EliminarClienteDto; //

const { status, data } = await apiInstance.eliminarCliente(
    id,
    eliminarClienteDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarClienteDto** | **EliminarClienteDto**|  | |
| **id** | [**number**] | Identificador del cliente. | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Cliente eliminado. |  -  |
|**401** | Sin sesión válida. |  -  |
|**404** |  |  -  |
|**409** |  |  -  |
|**422** | El cliente tiene obras vigentes (&#x60;CLIENTE_CON_OBRAS&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarClientes**
> PaginaClientesDto listarClientes()


### Example

```typescript
import {
    ClientesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ClientesApi(configuration);

let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let direccion: DireccionOrden; // (optional) (default to undefined)
let q: string; //Búsqueda por razón social, nombre de fantasía o RUT. (optional) (default to undefined)
let ordenarPor: 'razonSocial' | 'rut' | 'creadoEn'; // (optional) (default to 'razonSocial')

const { status, data } = await apiInstance.listarClientes(
    pagina,
    tamanio,
    direccion,
    q,
    ordenarPor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **pagina** | [**number**] | Número de página (desde 1). | (optional) defaults to 1|
| **tamanio** | [**number**] | Registros por página. | (optional) defaults to 25|
| **direccion** | **DireccionOrden** |  | (optional) defaults to undefined|
| **q** | [**string**] | Búsqueda por razón social, nombre de fantasía o RUT. | (optional) defaults to undefined|
| **ordenarPor** | [**&#39;razonSocial&#39; | &#39;rut&#39; | &#39;creadoEn&#39;**]**Array<&#39;razonSocial&#39; &#124; &#39;rut&#39; &#124; &#39;creadoEn&#39;>** |  | (optional) defaults to 'razonSocial'|


### Return type

**PaginaClientesDto**

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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **obtenerCliente**
> ClienteDto obtenerCliente()


### Example

```typescript
import {
    ClientesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ClientesApi(configuration);

let id: number; //Identificador del cliente. (default to undefined)

const { status, data } = await apiInstance.obtenerCliente(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador del cliente. | defaults to undefined|


### Return type

**ClienteDto**

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
|**404** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

