# AuditoriaApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**consultarAuditoria**](#consultarauditoria) | **GET** /api/auditoria | Consulta la bitácora de auditoría|

# **consultarAuditoria**
> PaginaAuditoriaDto consultarAuditoria()

Bitácora append-only, paginada y ordenada del más reciente al más antiguo.

### Example

```typescript
import {
    AuditoriaApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuditoriaApi(configuration);

let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let desde: string; //Desde (ISO 8601, inclusivo). (optional) (default to undefined)
let hasta: string; //Hasta (ISO 8601). Si es solo fecha, incluye todo ese día. (optional) (default to undefined)
let usuarioId: number; //Filtra por actor. (optional) (default to undefined)
let accion: string; //Acción exacta o prefijo terminado en punto (`usuario.`). (optional) (default to undefined)
let entidad: string; // (optional) (default to undefined)
let entidadId: string; //Identificador del registro afectado. (optional) (default to undefined)
let q: string; //Búsqueda libre en acción, entidad, actor y motivo. (optional) (default to undefined)

const { status, data } = await apiInstance.consultarAuditoria(
    pagina,
    tamanio,
    desde,
    hasta,
    usuarioId,
    accion,
    entidad,
    entidadId,
    q
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **pagina** | [**number**] | Número de página (desde 1). | (optional) defaults to 1|
| **tamanio** | [**number**] | Registros por página. | (optional) defaults to 25|
| **desde** | [**string**] | Desde (ISO 8601, inclusivo). | (optional) defaults to undefined|
| **hasta** | [**string**] | Hasta (ISO 8601). Si es solo fecha, incluye todo ese día. | (optional) defaults to undefined|
| **usuarioId** | [**number**] | Filtra por actor. | (optional) defaults to undefined|
| **accion** | [**string**] | Acción exacta o prefijo terminado en punto (&#x60;usuario.&#x60;). | (optional) defaults to undefined|
| **entidad** | [**string**] |  | (optional) defaults to undefined|
| **entidadId** | [**string**] | Identificador del registro afectado. | (optional) defaults to undefined|
| **q** | [**string**] | Búsqueda libre en acción, entidad, actor y motivo. | (optional) defaults to undefined|


### Return type

**PaginaAuditoriaDto**

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

