# AdjuntosApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**descargarAdjunto**](#descargaradjunto) | **GET** /api/adjuntos/{id}/descargar | Descarga un adjunto|
|[**eliminarAdjunto**](#eliminaradjunto) | **POST** /api/adjuntos/{id}/eliminar | Elimina un adjunto (borrado lógico)|
|[**listarAdjuntos**](#listaradjuntos) | **GET** /api/adjuntos | Lista los adjuntos de una obra, proveedor o cliente|
|[**subirAdjunto**](#subiradjunto) | **POST** /api/adjuntos | Sube un adjunto|

# **descargarAdjunto**
> File descargarAdjunto()

Solo con sesión válida; el archivo nunca se publica en una ruta estática.

### Example

```typescript
import {
    AdjuntosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdjuntosApi(configuration);

let id: number; //Identificador del adjunto. (default to undefined)

const { status, data } = await apiInstance.descargarAdjunto(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador del adjunto. | defaults to undefined|


### Return type

**File**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/octet-stream, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Contenido del archivo. |  -  |
|**401** | Sin sesión válida. |  -  |
|**404** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **eliminarAdjunto**
> eliminarAdjunto(eliminarAdjuntoDto)


### Example

```typescript
import {
    AdjuntosApi,
    Configuration,
    EliminarAdjuntoDto
} from './api';

const configuration = new Configuration();
const apiInstance = new AdjuntosApi(configuration);

let id: number; //Identificador del adjunto. (default to undefined)
let eliminarAdjuntoDto: EliminarAdjuntoDto; //

const { status, data } = await apiInstance.eliminarAdjunto(
    id,
    eliminarAdjuntoDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarAdjuntoDto** | **EliminarAdjuntoDto**|  | |
| **id** | [**number**] | Identificador del adjunto. | defaults to undefined|


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
|**204** | Adjunto eliminado. |  -  |
|**401** | Sin sesión válida. |  -  |
|**404** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarAdjuntos**
> Array<AdjuntoDto> listarAdjuntos()


### Example

```typescript
import {
    AdjuntosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdjuntosApi(configuration);

let entidadTipo: EntidadAdjuntable; // (default to undefined)
let entidadId: number; // (default to undefined)

const { status, data } = await apiInstance.listarAdjuntos(
    entidadTipo,
    entidadId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **entidadTipo** | **EntidadAdjuntable** |  | defaults to undefined|
| **entidadId** | [**number**] |  | defaults to undefined|


### Return type

**Array<AdjuntoDto>**

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
|**404** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **subirAdjunto**
> AdjuntoDto subirAdjunto()

Formulario multipart con el archivo en `archivo` (PDF, JPG, PNG, XLSX o CSV, hasta 20 MB), `entidadTipo` y `entidadId`. Se valida el contenido real del archivo.

### Example

```typescript
import {
    AdjuntosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdjuntosApi(configuration);

let archivo: File; //PDF, JPG, PNG, XLSX o CSV, hasta 20 MB. (default to undefined)
let entidadTipo: EntidadAdjuntable; // (default to undefined)
let entidadId: number; // (default to undefined)
let descripcion: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.subirAdjunto(
    archivo,
    entidadTipo,
    entidadId,
    descripcion
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **archivo** | [**File**] | PDF, JPG, PNG, XLSX o CSV, hasta 20 MB. | defaults to undefined|
| **entidadTipo** | **EntidadAdjuntable** |  | defaults to undefined|
| **entidadId** | [**number**] |  | defaults to undefined|
| **descripcion** | [**string**] |  | (optional) defaults to undefined|


### Return type

**AdjuntoDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** |  |  -  |
|**400** |  |  -  |
|**401** | Sin sesión válida. |  -  |
|**404** |  |  -  |
|**413** | Supera 20 MB. |  -  |
|**415** | Tipo no permitido. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

