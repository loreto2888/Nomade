# ObrasApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**actualizarObra**](#actualizarobra) | **PATCH** /api/obras/{id} | Modifica una obra (con control de versión)|
|[**crearObra**](#crearobra) | **POST** /api/obras | Crea una obra / centro de costo|
|[**eliminarObra**](#eliminarobra) | **POST** /api/obras/{id}/eliminar | Elimina una obra (borrado lógico)|
|[**listarObras**](#listarobras) | **GET** /api/obras | Lista obras (paginado, con búsqueda, filtros y orden)|
|[**obtenerObra**](#obtenerobra) | **GET** /api/obras/{id} | Obtiene una obra (datos para editarla)|
|[**obtenerResumenObra**](#obtenerresumenobra) | **GET** /api/obras/{id}/resumen | Ficha de la obra: resumen|

# **actualizarObra**
> ObraDto actualizarObra(actualizarObraDto)


### Example

```typescript
import {
    ObrasApi,
    Configuration,
    ActualizarObraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ObrasApi(configuration);

let id: number; //Identificador de la obra. (default to undefined)
let actualizarObraDto: ActualizarObraDto; //

const { status, data } = await apiInstance.actualizarObra(
    id,
    actualizarObraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarObraDto** | **ActualizarObraDto**|  | |
| **id** | [**number**] | Identificador de la obra. | defaults to undefined|


### Return type

**ObraDto**

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
|**409** | Versión desactualizada (&#x60;CONFLICTO_VERSION&#x60;) o centro de costo duplicado. |  -  |
|**422** | Obra cerrada, estado/cliente inválido o UF no disponible. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **crearObra**
> ObraDto crearObra(crearObraDto)


### Example

```typescript
import {
    ObrasApi,
    Configuration,
    CrearObraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ObrasApi(configuration);

let crearObraDto: CrearObraDto; //

const { status, data } = await apiInstance.crearObra(
    crearObraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearObraDto** | **CrearObraDto**|  | |


### Return type

**ObraDto**

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
|**409** | El centro de costo ya existe (&#x60;CENTRO_COSTO_DUPLICADO&#x60;). |  -  |
|**422** | Cliente o estado inválido, o contrato en UF sin valor de UF cargado (&#x60;UF_NO_DISPONIBLE&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **eliminarObra**
> eliminarObra(eliminarObraDto)

Solo obras \"en preparación\".

### Example

```typescript
import {
    ObrasApi,
    Configuration,
    EliminarObraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ObrasApi(configuration);

let id: number; //Identificador de la obra. (default to undefined)
let eliminarObraDto: EliminarObraDto; //

const { status, data } = await apiInstance.eliminarObra(
    id,
    eliminarObraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarObraDto** | **EliminarObraDto**|  | |
| **id** | [**number**] | Identificador de la obra. | defaults to undefined|


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
|**204** | Obra eliminada. |  -  |
|**401** | Sin sesión válida. |  -  |
|**404** |  |  -  |
|**409** |  |  -  |
|**422** | La obra no está en preparación (&#x60;OBRA_NO_ELIMINABLE&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarObras**
> PaginaObrasDto listarObras()

Todos los usuarios ven todas las obras (D-03).

### Example

```typescript
import {
    ObrasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ObrasApi(configuration);

let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let direccion: DireccionOrden; // (optional) (default to undefined)
let q: string; //Búsqueda por nombre, centro de costo, responsable o cliente. (optional) (default to undefined)
let estadoId: number; //Filtra por estado de obra (id del catálogo). (optional) (default to undefined)
let clienteId: number; //Filtra por cliente. (optional) (default to undefined)
let ordenarPor: 'codigoCentroCosto' | 'nombre' | 'cliente' | 'estado' | 'fechaInicio' | 'creadoEn'; // (optional) (default to 'codigoCentroCosto')

const { status, data } = await apiInstance.listarObras(
    pagina,
    tamanio,
    direccion,
    q,
    estadoId,
    clienteId,
    ordenarPor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **pagina** | [**number**] | Número de página (desde 1). | (optional) defaults to 1|
| **tamanio** | [**number**] | Registros por página. | (optional) defaults to 25|
| **direccion** | **DireccionOrden** |  | (optional) defaults to undefined|
| **q** | [**string**] | Búsqueda por nombre, centro de costo, responsable o cliente. | (optional) defaults to undefined|
| **estadoId** | [**number**] | Filtra por estado de obra (id del catálogo). | (optional) defaults to undefined|
| **clienteId** | [**number**] | Filtra por cliente. | (optional) defaults to undefined|
| **ordenarPor** | [**&#39;codigoCentroCosto&#39; | &#39;nombre&#39; | &#39;cliente&#39; | &#39;estado&#39; | &#39;fechaInicio&#39; | &#39;creadoEn&#39;**]**Array<&#39;codigoCentroCosto&#39; &#124; &#39;nombre&#39; &#124; &#39;cliente&#39; &#124; &#39;estado&#39; &#124; &#39;fechaInicio&#39; &#124; &#39;creadoEn&#39;>** |  | (optional) defaults to 'codigoCentroCosto'|


### Return type

**PaginaObrasDto**

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

# **obtenerObra**
> ObraDto obtenerObra()


### Example

```typescript
import {
    ObrasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ObrasApi(configuration);

let id: number; //Identificador de la obra. (default to undefined)

const { status, data } = await apiInstance.obtenerObra(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador de la obra. | defaults to undefined|


### Return type

**ObraDto**

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

# **obtenerResumenObra**
> ResumenObraDto obtenerResumenObra()

Datos de la obra, adjuntos y, en contratos en UF, el equivalente en CLP al valor de la UF de hoy.

### Example

```typescript
import {
    ObrasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ObrasApi(configuration);

let id: number; //Identificador de la obra. (default to undefined)

const { status, data } = await apiInstance.obtenerResumenObra(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador de la obra. | defaults to undefined|


### Return type

**ResumenObraDto**

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

