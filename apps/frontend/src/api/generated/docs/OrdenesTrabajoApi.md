# OrdenesTrabajoApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**actualizarOrdenTrabajo**](#actualizarordentrabajo) | **PATCH** /api/ordenes-trabajo/{id} | Modifica un borrador (con control de versión)|
|[**anularOrdenTrabajo**](#anularordentrabajo) | **POST** /api/ordenes-trabajo/{id}/anular | Anula un documento aprobado (con motivo)|
|[**aprobarOrdenTrabajo**](#aprobarordentrabajo) | **POST** /api/ordenes-trabajo/{id}/aprobar | Aprueba un documento en revisión|
|[**crearOrdenTrabajo**](#crearordentrabajo) | **POST** /api/ordenes-trabajo | Crea una OT en borrador desde una cotización aprobada|
|[**eliminarOrdenTrabajo**](#eliminarordentrabajo) | **POST** /api/ordenes-trabajo/{id}/eliminar | Elimina un borrador (borrado lógico)|
|[**enviarOrdenTrabajoARevision**](#enviarordentrabajoarevision) | **POST** /api/ordenes-trabajo/{id}/enviar-revision | Envía un borrador a revisión|
|[**listarOrdenesTrabajo**](#listarordenestrabajo) | **GET** /api/ordenes-trabajo | Lista órdenes de trabajo (paginado, del folio más reciente al más antiguo)|
|[**obtenerOrdenTrabajo**](#obtenerordentrabajo) | **GET** /api/ordenes-trabajo/{id} | Obtiene la orden de trabajo|
|[**rechazarOrdenTrabajo**](#rechazarordentrabajo) | **POST** /api/ordenes-trabajo/{id}/rechazar | Rechaza un documento en revisión (con motivo)|

# **actualizarOrdenTrabajo**
> OrdenTrabajoDto actualizarOrdenTrabajo(actualizarOrdenTrabajoDto)

Alcance, fechas e hitos (reemplazan a los actuales). Supuesto H5: los hitos no cambian después de aprobar la OT.

### Example

```typescript
import {
    OrdenesTrabajoApi,
    Configuration,
    ActualizarOrdenTrabajoDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesTrabajoApi(configuration);

let id: number; //Identificador de la orden de trabajo. (default to undefined)
let actualizarOrdenTrabajoDto: ActualizarOrdenTrabajoDto; //

const { status, data } = await apiInstance.actualizarOrdenTrabajo(
    id,
    actualizarOrdenTrabajoDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarOrdenTrabajoDto** | **ActualizarOrdenTrabajoDto**|  | |
| **id** | [**number**] | Identificador de la orden de trabajo. | defaults to undefined|


### Return type

**OrdenTrabajoDto**

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

# **anularOrdenTrabajo**
> OrdenTrabajoDto anularOrdenTrabajo(anularDocumentoCompraDto)

aprobada → anulada (supuesto H5). Solo sin OC parciales vigentes; libera la cotización para otra OT.

### Example

```typescript
import {
    OrdenesTrabajoApi,
    Configuration,
    AnularDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesTrabajoApi(configuration);

let id: number; //Identificador de la orden de trabajo. (default to undefined)
let anularDocumentoCompraDto: AnularDocumentoCompraDto; //

const { status, data } = await apiInstance.anularOrdenTrabajo(
    id,
    anularDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **anularDocumentoCompraDto** | **AnularDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de trabajo. | defaults to undefined|


### Return type

**OrdenTrabajoDto**

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

# **aprobarOrdenTrabajo**
> OrdenTrabajoDto aprobarOrdenTrabajo(aprobarDocumentoCompraDto)

Una OT aprobada admite OC parciales hasta su saldo. El `usuario` no puede aprobar lo que él mismo creó; el `admin` sí (D-10).

### Example

```typescript
import {
    OrdenesTrabajoApi,
    Configuration,
    AprobarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesTrabajoApi(configuration);

let id: number; //Identificador de la orden de trabajo. (default to undefined)
let aprobarDocumentoCompraDto: AprobarDocumentoCompraDto; //

const { status, data } = await apiInstance.aprobarOrdenTrabajo(
    id,
    aprobarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **aprobarDocumentoCompraDto** | **AprobarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de trabajo. | defaults to undefined|


### Return type

**OrdenTrabajoDto**

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

# **crearOrdenTrabajo**
> OrdenTrabajoDto crearOrdenTrabajo(crearOrdenTrabajoDto)

Toma el proveedor, la obra, la categoría y el monto de la cotización (que no debe tener otra OT vigente). Los hitos pueden sumar menos de 100 % mientras es borrador.

### Example

```typescript
import {
    OrdenesTrabajoApi,
    Configuration,
    CrearOrdenTrabajoDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesTrabajoApi(configuration);

let crearOrdenTrabajoDto: CrearOrdenTrabajoDto; //

const { status, data } = await apiInstance.crearOrdenTrabajo(
    crearOrdenTrabajoDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearOrdenTrabajoDto** | **CrearOrdenTrabajoDto**|  | |


### Return type

**OrdenTrabajoDto**

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

# **eliminarOrdenTrabajo**
> eliminarOrdenTrabajo(eliminarDocumentoCompraDto)

Solo borradores: lo enviado a revisión queda en el historial.

### Example

```typescript
import {
    OrdenesTrabajoApi,
    Configuration,
    EliminarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesTrabajoApi(configuration);

let id: number; //Identificador de la orden de trabajo. (default to undefined)
let eliminarDocumentoCompraDto: EliminarDocumentoCompraDto; //

const { status, data } = await apiInstance.eliminarOrdenTrabajo(
    id,
    eliminarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarDocumentoCompraDto** | **EliminarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de trabajo. | defaults to undefined|


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

# **enviarOrdenTrabajoARevision**
> OrdenTrabajoDto enviarOrdenTrabajoARevision(enviarDocumentoCompraDto)

borrador → en revisión. Los hitos deben sumar exactamente 100 %.

### Example

```typescript
import {
    OrdenesTrabajoApi,
    Configuration,
    EnviarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesTrabajoApi(configuration);

let id: number; //Identificador de la orden de trabajo. (default to undefined)
let enviarDocumentoCompraDto: EnviarDocumentoCompraDto; //

const { status, data } = await apiInstance.enviarOrdenTrabajoARevision(
    id,
    enviarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **enviarDocumentoCompraDto** | **EnviarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de trabajo. | defaults to undefined|


### Return type

**OrdenTrabajoDto**

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

# **listarOrdenesTrabajo**
> PaginaOrdenesTrabajoDto listarOrdenesTrabajo()

Todos los usuarios ven todos los documentos (D-03).

### Example

```typescript
import {
    OrdenesTrabajoApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesTrabajoApi(configuration);

let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let q: string; //Búsqueda por folio (número), descripción o proveedor. (optional) (default to undefined)
let obraId: number; //Filtra por obra. (optional) (default to undefined)
let proveedorId: number; //Filtra por proveedor. (optional) (default to undefined)
let estado: EstadoDocumentoCompra; // (optional) (default to undefined)
let conSaldo: boolean; //Solo OT aprobadas con saldo por ordenar (las que admiten OC parciales). (optional) (default to undefined)

const { status, data } = await apiInstance.listarOrdenesTrabajo(
    pagina,
    tamanio,
    q,
    obraId,
    proveedorId,
    estado,
    conSaldo
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
| **conSaldo** | [**boolean**] | Solo OT aprobadas con saldo por ordenar (las que admiten OC parciales). | (optional) defaults to undefined|


### Return type

**PaginaOrdenesTrabajoDto**

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

# **obtenerOrdenTrabajo**
> OrdenTrabajoDto obtenerOrdenTrabajo()


### Example

```typescript
import {
    OrdenesTrabajoApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesTrabajoApi(configuration);

let id: number; //Identificador de la orden de trabajo. (default to undefined)

const { status, data } = await apiInstance.obtenerOrdenTrabajo(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador de la orden de trabajo. | defaults to undefined|


### Return type

**OrdenTrabajoDto**

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

# **rechazarOrdenTrabajo**
> OrdenTrabajoDto rechazarOrdenTrabajo(rechazarDocumentoCompraDto)

El rechazo es final: para corregirlo se crea un documento nuevo.

### Example

```typescript
import {
    OrdenesTrabajoApi,
    Configuration,
    RechazarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesTrabajoApi(configuration);

let id: number; //Identificador de la orden de trabajo. (default to undefined)
let rechazarDocumentoCompraDto: RechazarDocumentoCompraDto; //

const { status, data } = await apiInstance.rechazarOrdenTrabajo(
    id,
    rechazarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rechazarDocumentoCompraDto** | **RechazarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de trabajo. | defaults to undefined|


### Return type

**OrdenTrabajoDto**

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

