# ParametrosApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**agregarValorParametro**](#agregarvalorparametro) | **POST** /api/parametros/{id}/valores | Agrega una versión del valor con su fecha de vigencia|
|[**eliminarValorParametro**](#eliminarvalorparametro) | **POST** /api/parametros/{id}/valores/{valorId}/eliminar | Elimina una versión programada que aún no está vigente|
|[**listarParametros**](#listarparametros) | **GET** /api/parametros | Lista los parámetros con su valor vigente|
|[**listarValoresParametro**](#listarvaloresparametro) | **GET** /api/parametros/{id}/valores | Historial de valores de un parámetro (el más reciente primero)|
|[**obtenerParametro**](#obtenerparametro) | **GET** /api/parametros/{id} | Obtiene un parámetro con su valor vigente y el próximo|

# **agregarValorParametro**
> ParametroDto agregarValorParametro(agregarValorParametroDto)

La vigencia empieza hoy o después y debe ser posterior a la última versión. Las versiones existentes no se modifican.

### Example

```typescript
import {
    ParametrosApi,
    Configuration,
    AgregarValorParametroDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ParametrosApi(configuration);

let id: number; //Identificador del parámetro. (default to undefined)
let agregarValorParametroDto: AgregarValorParametroDto; //

const { status, data } = await apiInstance.agregarValorParametro(
    id,
    agregarValorParametroDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **agregarValorParametroDto** | **AgregarValorParametroDto**|  | |
| **id** | [**number**] | Identificador del parámetro. | defaults to undefined|


### Return type

**ParametroDto**

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
|**409** |  |  -  |
|**422** | Vigencia en el pasado o no posterior a la última versión. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **eliminarValorParametro**
> ParametroDto eliminarValorParametro(eliminarValorParametroDto)


### Example

```typescript
import {
    ParametrosApi,
    Configuration,
    EliminarValorParametroDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ParametrosApi(configuration);

let id: number; //Identificador del parámetro. (default to undefined)
let valorId: number; //Identificador de la versión del valor. (default to undefined)
let eliminarValorParametroDto: EliminarValorParametroDto; //

const { status, data } = await apiInstance.eliminarValorParametro(
    id,
    valorId,
    eliminarValorParametroDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarValorParametroDto** | **EliminarValorParametroDto**|  | |
| **id** | [**number**] | Identificador del parámetro. | defaults to undefined|
| **valorId** | [**number**] | Identificador de la versión del valor. | defaults to undefined|


### Return type

**ParametroDto**

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
|**422** | La versión ya está vigente (&#x60;VALOR_YA_VIGENTE&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarParametros**
> Array<ParametroDto> listarParametros()


### Example

```typescript
import {
    ParametrosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ParametrosApi(configuration);

const { status, data } = await apiInstance.listarParametros();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<ParametroDto>**

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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarValoresParametro**
> Array<ValorParametroDto> listarValoresParametro()


### Example

```typescript
import {
    ParametrosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ParametrosApi(configuration);

let id: number; //Identificador del parámetro. (default to undefined)

const { status, data } = await apiInstance.listarValoresParametro(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador del parámetro. | defaults to undefined|


### Return type

**Array<ValorParametroDto>**

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

# **obtenerParametro**
> ParametroDto obtenerParametro()


### Example

```typescript
import {
    ParametrosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ParametrosApi(configuration);

let id: number; //Identificador del parámetro. (default to undefined)

const { status, data } = await apiInstance.obtenerParametro(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador del parámetro. | defaults to undefined|


### Return type

**ParametroDto**

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

