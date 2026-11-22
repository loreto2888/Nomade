# OrdenesCompraApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**actualizarOrdenCompra**](#actualizarordencompra) | **PATCH** /api/ordenes-compra/{id} | Modifica un borrador (con control de versión)|
|[**anularOrdenCompra**](#anularordencompra) | **POST** /api/ordenes-compra/{id}/anular | Anula un documento aprobado (con motivo)|
|[**aprobarOrdenCompra**](#aprobarordencompra) | **POST** /api/ordenes-compra/{id}/aprobar | Aprueba un documento en revisión|
|[**crearOrdenCompra**](#crearordencompra) | **POST** /api/ordenes-compra | Crea una OC en borrador (materiales o parcial de OT)|
|[**eliminarOrdenCompra**](#eliminarordencompra) | **POST** /api/ordenes-compra/{id}/eliminar | Elimina un borrador (borrado lógico)|
|[**enviarOrdenCompraARevision**](#enviarordencompraarevision) | **POST** /api/ordenes-compra/{id}/enviar-revision | Envía un borrador a revisión|
|[**listarOrdenesCompra**](#listarordenescompra) | **GET** /api/ordenes-compra | Lista órdenes de compra (paginado, del folio más reciente al más antiguo)|
|[**obtenerOrdenCompra**](#obtenerordencompra) | **GET** /api/ordenes-compra/{id} | Obtiene la orden de compra|
|[**rechazarOrdenCompra**](#rechazarordencompra) | **POST** /api/ordenes-compra/{id}/rechazar | Rechaza un documento en revisión (con motivo)|
|[**recibirOrdenCompra**](#recibirordencompra) | **POST** /api/ordenes-compra/{id}/recibir | Registra la recepción conforme de una OC aprobada|

# **actualizarOrdenCompra**
> OrdenCompraDetalleDto actualizarOrdenCompra(actualizarOrdenCompraDto)

Datos y líneas (reemplazan a las actuales) mientras es un borrador. Supuesto H5: una OC aprobada no se edita, se anula.

### Example

```typescript
import {
    OrdenesCompraApi,
    Configuration,
    ActualizarOrdenCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesCompraApi(configuration);

let id: number; //Identificador de la orden de compra. (default to undefined)
let actualizarOrdenCompraDto: ActualizarOrdenCompraDto; //

const { status, data } = await apiInstance.actualizarOrdenCompra(
    id,
    actualizarOrdenCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarOrdenCompraDto** | **ActualizarOrdenCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de compra. | defaults to undefined|


### Return type

**OrdenCompraDetalleDto**

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

# **anularOrdenCompra**
> OrdenCompraDetalleDto anularOrdenCompra(anularDocumentoCompraDto)

aprobada → anulada (supuesto H5: una OC aprobada no se edita). Registra la reversa del compromiso y libera el saldo de la OT.

### Example

```typescript
import {
    OrdenesCompraApi,
    Configuration,
    AnularDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesCompraApi(configuration);

let id: number; //Identificador de la orden de compra. (default to undefined)
let anularDocumentoCompraDto: AnularDocumentoCompraDto; //

const { status, data } = await apiInstance.anularOrdenCompra(
    id,
    anularDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **anularDocumentoCompraDto** | **AnularDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de compra. | defaults to undefined|


### Return type

**OrdenCompraDetalleDto**

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

# **aprobarOrdenCompra**
> OrdenCompraDetalleDto aprobarOrdenCompra(aprobarDocumentoCompraDto)

Registra el compromiso (CLP neto) en el libro de movimientos. El `usuario` no puede aprobar lo que él mismo creó; el `admin` sí (D-10).

### Example

```typescript
import {
    OrdenesCompraApi,
    Configuration,
    AprobarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesCompraApi(configuration);

let id: number; //Identificador de la orden de compra. (default to undefined)
let aprobarDocumentoCompraDto: AprobarDocumentoCompraDto; //

const { status, data } = await apiInstance.aprobarOrdenCompra(
    id,
    aprobarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **aprobarDocumentoCompraDto** | **AprobarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de compra. | defaults to undefined|


### Return type

**OrdenCompraDetalleDto**

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

# **crearOrdenCompra**
> OrdenCompraDetalleDto crearOrdenCompra(crearOrdenCompraDto)

Materiales: obra, proveedor y líneas. Parcial: OT aprobada, hito y porcentaje de la OT, con tope en el saldo del hito. El IVA usa el parámetro vigente a la fecha de la OC.

### Example

```typescript
import {
    OrdenesCompraApi,
    Configuration,
    CrearOrdenCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesCompraApi(configuration);

let crearOrdenCompraDto: CrearOrdenCompraDto; //

const { status, data } = await apiInstance.crearOrdenCompra(
    crearOrdenCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearOrdenCompraDto** | **CrearOrdenCompraDto**|  | |


### Return type

**OrdenCompraDetalleDto**

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

# **eliminarOrdenCompra**
> eliminarOrdenCompra(eliminarDocumentoCompraDto)

Solo borradores: lo enviado a revisión queda en el historial.

### Example

```typescript
import {
    OrdenesCompraApi,
    Configuration,
    EliminarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesCompraApi(configuration);

let id: number; //Identificador de la orden de compra. (default to undefined)
let eliminarDocumentoCompraDto: EliminarDocumentoCompraDto; //

const { status, data } = await apiInstance.eliminarOrdenCompra(
    id,
    eliminarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarDocumentoCompraDto** | **EliminarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de compra. | defaults to undefined|


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

# **enviarOrdenCompraARevision**
> OrdenCompraDetalleDto enviarOrdenCompraARevision(enviarDocumentoCompraDto)

borrador → en revisión. Debe tener monto (y líneas, si es de materiales) y caber en el saldo de la OT.

### Example

```typescript
import {
    OrdenesCompraApi,
    Configuration,
    EnviarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesCompraApi(configuration);

let id: number; //Identificador de la orden de compra. (default to undefined)
let enviarDocumentoCompraDto: EnviarDocumentoCompraDto; //

const { status, data } = await apiInstance.enviarOrdenCompraARevision(
    id,
    enviarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **enviarDocumentoCompraDto** | **EnviarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de compra. | defaults to undefined|


### Return type

**OrdenCompraDetalleDto**

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

# **listarOrdenesCompra**
> PaginaOrdenesCompraDto listarOrdenesCompra()

Todos los usuarios ven todos los documentos (D-03).

### Example

```typescript
import {
    OrdenesCompraApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesCompraApi(configuration);

let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let q: string; //Búsqueda por folio (número), descripción o proveedor. (optional) (default to undefined)
let obraId: number; //Filtra por obra. (optional) (default to undefined)
let proveedorId: number; //Filtra por proveedor. (optional) (default to undefined)
let estado: EstadoDocumentoCompra; // (optional) (default to undefined)
let tipo: TipoOrdenCompra; // (optional) (default to undefined)
let ordenTrabajoId: number; //Solo las OC parciales de esta OT. (optional) (default to undefined)

const { status, data } = await apiInstance.listarOrdenesCompra(
    pagina,
    tamanio,
    q,
    obraId,
    proveedorId,
    estado,
    tipo,
    ordenTrabajoId
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
| **tipo** | **TipoOrdenCompra** |  | (optional) defaults to undefined|
| **ordenTrabajoId** | [**number**] | Solo las OC parciales de esta OT. | (optional) defaults to undefined|


### Return type

**PaginaOrdenesCompraDto**

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

# **obtenerOrdenCompra**
> OrdenCompraDetalleDto obtenerOrdenCompra()


### Example

```typescript
import {
    OrdenesCompraApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesCompraApi(configuration);

let id: number; //Identificador de la orden de compra. (default to undefined)

const { status, data } = await apiInstance.obtenerOrdenCompra(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador de la orden de compra. | defaults to undefined|


### Return type

**OrdenCompraDetalleDto**

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

# **rechazarOrdenCompra**
> OrdenCompraDetalleDto rechazarOrdenCompra(rechazarDocumentoCompraDto)

El rechazo es final: para corregirlo se crea un documento nuevo.

### Example

```typescript
import {
    OrdenesCompraApi,
    Configuration,
    RechazarDocumentoCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesCompraApi(configuration);

let id: number; //Identificador de la orden de compra. (default to undefined)
let rechazarDocumentoCompraDto: RechazarDocumentoCompraDto; //

const { status, data } = await apiInstance.rechazarOrdenCompra(
    id,
    rechazarDocumentoCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rechazarDocumentoCompraDto** | **RechazarDocumentoCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de compra. | defaults to undefined|


### Return type

**OrdenCompraDetalleDto**

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

# **recibirOrdenCompra**
> OrdenCompraDetalleDto recibirOrdenCompra(recibirOrdenCompraDto)

aprobada → recibida (supuesto: recepción total, una sola vez). El compromiso se mantiene hasta la factura.

### Example

```typescript
import {
    OrdenesCompraApi,
    Configuration,
    RecibirOrdenCompraDto
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdenesCompraApi(configuration);

let id: number; //Identificador de la orden de compra. (default to undefined)
let recibirOrdenCompraDto: RecibirOrdenCompraDto; //

const { status, data } = await apiInstance.recibirOrdenCompra(
    id,
    recibirOrdenCompraDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **recibirOrdenCompraDto** | **RecibirOrdenCompraDto**|  | |
| **id** | [**number**] | Identificador de la orden de compra. | defaults to undefined|


### Return type

**OrdenCompraDetalleDto**

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

