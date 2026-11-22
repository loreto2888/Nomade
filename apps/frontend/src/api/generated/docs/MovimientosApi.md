# MovimientosApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**resumenCompromisos**](#resumencompromisos) | **GET** /api/obras/{obraId}/compromisos | Compromisos vigentes de una obra, por categoría de gasto|

# **resumenCompromisos**
> ResumenCompromisosDto resumenCompromisos()

Suma del libro de movimientos: OC aprobadas (o recibidas) menos sus anulaciones, en CLP neto.

### Example

```typescript
import {
    MovimientosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new MovimientosApi(configuration);

let obraId: number; //Identificador de la obra. (default to undefined)

const { status, data } = await apiInstance.resumenCompromisos(
    obraId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **obraId** | [**number**] | Identificador de la obra. | defaults to undefined|


### Return type

**ResumenCompromisosDto**

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

