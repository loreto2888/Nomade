# CotizacionesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**actualizarCotizacion**](#actualizarcotizacion) | **PATCH** /api/cotizaciones/{id} | Modifica un borrador (con control de versión)|
|[**aprobarCotizacion**](#aprobarcotizacion) | **POST** /api/cotizaciones/{id}/aprobar | Aprueba un documento en revisión|
|[**crearCotizacion**](#crearcotizacion) | **POST** /api/cotizaciones | Registra una cotización en borrador|
|[**eliminarCotizacion**](#eliminarcotizacion) | **POST** /api/cotizaciones/{id}/eliminar | Elimina un borrador (borrado lógico)|
|[**enviarCotizacionARevision**](#enviarcotizacionarevision) | **POST** /api/cotizaciones/{id}/enviar-revision | Envía un borrador a revisión|
|[**listarCotizaciones**](#listarcotizaciones) | **GET** /api/cotizaciones | Lista cotizaciones (paginado, del folio más reciente al más antiguo)|
|[**obtenerCotizacion**](#obtenercotizacion) | **GET** /api/cotizaciones/{id} | Obtiene la cotización|
|[**rechazarCotizacion**](#rechazarcotizacion) | **POST** /api/cotizaciones/{id}/rechazar | Rechaza un documento en revisión (con motivo)|

# **actualizarCotizacion**
> CotizacionDto actualizarCotizacion(actualizarCotizacionDto)

Datos de la cotización mientras es un borrador.

### Example

```typescript
import {
    CotizacionesApi,
    Configuration,
    ActualizarCotizacionDto
} from './api';

const configuration = new Configuration();
const apiInstance = new CotizacionesApi(configuration);

let id: number; //Identificador de la cotización. (default to undefined)
let actualizarCotizacionDto: ActualizarCotizacionDto; //

const { status, data } = await apiInstance.actualizarCotizacion(
    id,
    actualizarCotizacionDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarCotizacionDto** | **ActualizarCotizacionDto**|  | |
| **id** | [**number**] | Identificador de la cotización. | defaults to undefined|


### Return type

**CotizacionDto**

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
|**409** |  |  -  |
|**422** | No es un borrador (&#x60;DOCUMENTO_NO_EDITABLE&#x60;) u otra regla de negocio. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **aprobarCotizacion**
> CotizacionDto aprobarCotizacion(aprobarDocumentoCompraDto)

Una cotización aprobada habilita crear una OT. El `usuario` no puede aprobar lo que él mismo creó; el `admin` sí (D-10).

### Example

```typescript
import {
    CotizacionesApi,
    Configuration,
    AprobarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new CotizacionesApi(configuration);

let id: number; //Identificador de la cotización. (default to undefined)
let aprobarDocumentoCompraDto: AprobarDocumentoCompraDto; //

const { status, data } = await apiInstance.aprobarCotizacion(
    id,
    aprobarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **aprobarDocumentoCompraDto** | **AprobarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la cotización. | defaults to undefined|


### Return type

**CotizacionDto**

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
|**403** | Autoaprobación (&#x60;AUTOAPROBACION_NO_PERMITIDA&#x60;). |  -  |
|**404** |  |  -  |
|**409** |  |  -  |
|**422** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **crearCotizacion**
> CotizacionDto crearCotizacion(crearCotizacionDto)

Cotización de un proveedor para una obra (monto neto en CLP). Recibe su folio COT- correlativo.

### Example

```typescript
import {
    CotizacionesApi,
    Configuration,
    CrearCotizacionDto
} from './api';

const configuration = new Configuration();
const apiInstance = new CotizacionesApi(configuration);

let crearCotizacionDto: CrearCotizacionDto; //

const { status, data } = await apiInstance.crearCotizacion(
    crearCotizacionDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearCotizacionDto** | **CrearCotizacionDto**|  | |


### Return type

**CotizacionDto**

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
|**409** |  |  -  |
|**422** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **eliminarCotizacion**
> eliminarCotizacion(eliminarDocumentoCompraDto)

Solo borradores: lo enviado a revisión queda en el historial.

### Example

```typescript
import {
    CotizacionesApi,
    Configuration,
    EliminarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new CotizacionesApi(configuration);

let id: number; //Identificador de la cotización. (default to undefined)
let eliminarDocumentoCompraDto: EliminarDocumentoCompraDto; //

const { status, data } = await apiInstance.eliminarCotizacion(
    id,
    eliminarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarDocumentoCompraDto** | **EliminarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la cotización. | defaults to undefined|


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
|**204** | Borrador eliminado. |  -  |
|**401** | Sin sesión válida. |  -  |
|**404** |  |  -  |
|**409** |  |  -  |
|**422** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **enviarCotizacionARevision**
> CotizacionDto enviarCotizacionARevision(enviarDocumentoCompraDto)

borrador → en revisión. Desde ahí la cotización queda congelada.

### Example

```typescript
import {
    CotizacionesApi,
    Configuration,
    EnviarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new CotizacionesApi(configuration);

let id: number; //Identificador de la cotización. (default to undefined)
let enviarDocumentoCompraDto: EnviarDocumentoCompraDto; //

const { status, data } = await apiInstance.enviarCotizacionARevision(
    id,
    enviarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **enviarDocumentoCompraDto** | **EnviarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la cotización. | defaults to undefined|


### Return type

**CotizacionDto**

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
|**404** |  |  -  |
|**409** |  |  -  |
|**422** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarCotizaciones**
> PaginaCotizacionesDto listarCotizaciones()

Todos los usuarios ven todos los documentos (D-03).

### Example

```typescript
import {
    CotizacionesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CotizacionesApi(configuration);

let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let q: string; //Búsqueda por folio (número), descripción o proveedor. (optional) (default to undefined)
let obraId: number; //Filtra por obra. (optional) (default to undefined)
let proveedorId: number; //Filtra por proveedor. (optional) (default to undefined)
let estado: EstadoDocumentoCompra; // (optional) (default to undefined)
let disponiblesParaOt: boolean; //Solo cotizaciones aprobadas sin OT vigente (las que pueden originar una OT). (optional) (default to undefined)

const { status, data } = await apiInstance.listarCotizaciones(
    pagina,
    tamanio,
    q,
    obraId,
    proveedorId,
    estado,
    disponiblesParaOt
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **pagina** | [**number**] | Número de página (desde 1). | (optional) defaults to 1|
| **tamanio** | [**number**] | Registros por página. | (optional) defaults to 25|
| **q** | [**string**] | Búsqueda por folio (número), descripción o proveedor. | (optional) defaults to undefined|
| **obraId** | [**number**] | Filtra por obra. | (optional) defaults to undefined|
| **proveedorId** | [**number**] | Filtra por proveedor. | (optional) defaults to undefined|
| **estado** | **EstadoDocumentoCompra** |  | (optional) defaults to undefined|
| **disponiblesParaOt** | [**boolean**] | Solo cotizaciones aprobadas sin OT vigente (las que pueden originar una OT). | (optional) defaults to undefined|


### Return type

**PaginaCotizacionesDto**

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

# **obtenerCotizacion**
> CotizacionDto obtenerCotizacion()


### Example

```typescript
import {
    CotizacionesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CotizacionesApi(configuration);

let id: number; //Identificador de la cotización. (default to undefined)

const { status, data } = await apiInstance.obtenerCotizacion(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador de la cotización. | defaults to undefined|


### Return type

**CotizacionDto**

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

# **rechazarCotizacion**
> CotizacionDto rechazarCotizacion(rechazarDocumentoCompraDto)

El rechazo es final: para corregirlo se crea un documento nuevo.

### Example

```typescript
import {
    CotizacionesApi,
    Configuration,
    RechazarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new CotizacionesApi(configuration);

let id: number; //Identificador de la cotización. (default to undefined)
let rechazarDocumentoCompraDto: RechazarDocumentoCompraDto; //

const { status, data } = await apiInstance.rechazarCotizacion(
    id,
    rechazarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rechazarDocumentoCompraDto** | **RechazarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la cotización. | defaults to undefined|


### Return type

**CotizacionDto**

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
|**409** |  |  -  |
|**422** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

