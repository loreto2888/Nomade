# PresupuestosApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**actualizarPartida**](#actualizarpartida) | **PATCH** /api/presupuestos/{id}/partidas/{partidaId} | Modifica una partida de un borrador (con control de versión)|
|[**actualizarPresupuesto**](#actualizarpresupuesto) | **PATCH** /api/presupuestos/{id} | Modifica los datos de un borrador (descripción)|
|[**aprobarPresupuesto**](#aprobarpresupuesto) | **POST** /api/presupuestos/{id}/aprobar | Aprueba una versión en revisión|
|[**compararPresupuesto**](#compararpresupuesto) | **GET** /api/presupuestos/{id}/comparacion | Compara una versión con la vigente (o con otra versión)|
|[**crearPartida**](#crearpartida) | **POST** /api/presupuestos/{id}/partidas | Agrega una partida a un borrador|
|[**crearPresupuesto**](#crearpresupuesto) | **POST** /api/obras/{obraId}/presupuestos | Crea una versión de presupuesto en borrador|
|[**eliminarPartida**](#eliminarpartida) | **POST** /api/presupuestos/{id}/partidas/{partidaId}/eliminar | Elimina una partida de un borrador|
|[**eliminarPresupuesto**](#eliminarpresupuesto) | **POST** /api/presupuestos/{id}/eliminar | Elimina un borrador (borrado lógico)|
|[**enviarPresupuestoARevision**](#enviarpresupuestoarevision) | **POST** /api/presupuestos/{id}/enviar-revision | Envía un borrador a revisión|
|[**exportarPresupuesto**](#exportarpresupuesto) | **GET** /api/presupuestos/{id}/exportar | Exporta una versión a Excel|
|[**listarPresupuestos**](#listarpresupuestos) | **GET** /api/obras/{obraId}/presupuestos | Lista las versiones de presupuesto de una obra|
|[**obtenerPresupuesto**](#obtenerpresupuesto) | **GET** /api/presupuestos/{id} | Obtiene una versión con sus partidas y totales por familia|
|[**rechazarPresupuesto**](#rechazarpresupuesto) | **POST** /api/presupuestos/{id}/rechazar | Rechaza una versión en revisión (con motivo)|

# **actualizarPartida**
> PartidaDto actualizarPartida(actualizarPartidaDto)


### Example

```typescript
import {
    PresupuestosApi,
    Configuration,
    ActualizarPartidaDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)
let partidaId: number; //Identificador de la partida. (default to undefined)
let actualizarPartidaDto: ActualizarPartidaDto; //

const { status, data } = await apiInstance.actualizarPartida(
    id,
    partidaId,
    actualizarPartidaDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarPartidaDto** | **ActualizarPartidaDto**|  | |
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|
| **partidaId** | [**number**] | Identificador de la partida. | defaults to undefined|


### Return type

**PartidaDto**

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
|**409** | Versión desactualizada o código duplicado. |  -  |
|**422** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **actualizarPresupuesto**
> PresupuestoVersionDto actualizarPresupuesto(actualizarPresupuestoDto)


### Example

```typescript
import {
    PresupuestosApi,
    Configuration,
    ActualizarPresupuestoDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)
let actualizarPresupuestoDto: ActualizarPresupuestoDto; //

const { status, data } = await apiInstance.actualizarPresupuesto(
    id,
    actualizarPresupuestoDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarPresupuestoDto** | **ActualizarPresupuestoDto**|  | |
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|


### Return type

**PresupuestoVersionDto**

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
|**422** | La versión no es un borrador (&#x60;VERSION_NO_EDITABLE&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **aprobarPresupuesto**
> PresupuestoVersionDto aprobarPresupuesto(aprobarPresupuestoDto)

Deja esta versión como la única vigente de la obra (la vigente anterior queda en el historial). El `usuario` no puede aprobar una versión que él mismo creó; el `admin` sí (D-10).

### Example

```typescript
import {
    PresupuestosApi,
    Configuration,
    AprobarPresupuestoDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)
let aprobarPresupuestoDto: AprobarPresupuestoDto; //

const { status, data } = await apiInstance.aprobarPresupuesto(
    id,
    aprobarPresupuestoDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **aprobarPresupuestoDto** | **AprobarPresupuestoDto**|  | |
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|


### Return type

**PresupuestoVersionDto**

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
|**422** | La versión no está en revisión (&#x60;TRANSICION_NO_VALIDA&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **compararPresupuesto**
> ComparacionPresupuestoDto compararPresupuesto()

Cruza las partidas por código: nuevas, eliminadas, modificadas y sin cambios, con la diferencia en CLP.

### Example

```typescript
import {
    PresupuestosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)
let baseId: number; //Versión base contra la que se compara. Por defecto, la versión aprobada vigente de la obra. (optional) (default to undefined)

const { status, data } = await apiInstance.compararPresupuesto(
    id,
    baseId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|
| **baseId** | [**number**] | Versión base contra la que se compara. Por defecto, la versión aprobada vigente de la obra. | (optional) defaults to undefined|


### Return type

**ComparacionPresupuestoDto**

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
|**422** | No hay versión vigente (&#x60;SIN_VERSION_BASE&#x60;) o se comparan versiones de obras distintas o la misma. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **crearPartida**
> PartidaDto crearPartida(crearPartidaDto)

Los totales (de la partida y de la versión) los calcula el servidor.

### Example

```typescript
import {
    PresupuestosApi,
    Configuration,
    CrearPartidaDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)
let crearPartidaDto: CrearPartidaDto; //

const { status, data } = await apiInstance.crearPartida(
    id,
    crearPartidaDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearPartidaDto** | **CrearPartidaDto**|  | |
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|


### Return type

**PartidaDto**

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
|**404** |  |  -  |
|**409** | El código ya existe en la versión (&#x60;PARTIDA_DUPLICADA&#x60;). |  -  |
|**422** | La versión no es un borrador o la familia no está disponible. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **crearPresupuesto**
> PresupuestoVersionDto crearPresupuesto(crearPresupuestoDto)

Vacía o copiada de otra versión de la misma obra (`copiarDeId`). Un cambio sobre un presupuesto aprobado requiere una versión nueva copiada de la vigente. En obras en UF la versión se valoriza al valor de la UF de hoy.

### Example

```typescript
import {
    PresupuestosApi,
    Configuration,
    CrearPresupuestoDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let obraId: number; //Identificador de la obra. (default to undefined)
let crearPresupuestoDto: CrearPresupuestoDto; //

const { status, data } = await apiInstance.crearPresupuesto(
    obraId,
    crearPresupuestoDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearPresupuestoDto** | **CrearPresupuestoDto**|  | |
| **obraId** | [**number**] | Identificador de la obra. | defaults to undefined|


### Return type

**PresupuestoVersionDto**

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
|**404** |  |  -  |
|**422** | Obra cerrada, versión de origen inválida o UF no disponible (&#x60;UF_NO_DISPONIBLE&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **eliminarPartida**
> eliminarPartida(eliminarPartidaDto)


### Example

```typescript
import {
    PresupuestosApi,
    Configuration,
    EliminarPartidaDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)
let partidaId: number; //Identificador de la partida. (default to undefined)
let eliminarPartidaDto: EliminarPartidaDto; //

const { status, data } = await apiInstance.eliminarPartida(
    id,
    partidaId,
    eliminarPartidaDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarPartidaDto** | **EliminarPartidaDto**|  | |
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|
| **partidaId** | [**number**] | Identificador de la partida. | defaults to undefined|


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
|**204** | Partida eliminada. |  -  |
|**401** | Sin sesión válida. |  -  |
|**404** |  |  -  |
|**409** |  |  -  |
|**422** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **eliminarPresupuesto**
> eliminarPresupuesto(eliminarPresupuestoDto)

Solo borradores: una versión en revisión, aprobada o rechazada queda en el historial.

### Example

```typescript
import {
    PresupuestosApi,
    Configuration,
    EliminarPresupuestoDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)
let eliminarPresupuestoDto: EliminarPresupuestoDto; //

const { status, data } = await apiInstance.eliminarPresupuesto(
    id,
    eliminarPresupuestoDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarPresupuestoDto** | **EliminarPresupuestoDto**|  | |
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|


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

# **enviarPresupuestoARevision**
> PresupuestoVersionDto enviarPresupuestoARevision(enviarPresupuestoDto)

borrador → en revisión. La versión queda congelada y debe tener al menos una partida.

### Example

```typescript
import {
    PresupuestosApi,
    Configuration,
    EnviarPresupuestoDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)
let enviarPresupuestoDto: EnviarPresupuestoDto; //

const { status, data } = await apiInstance.enviarPresupuestoARevision(
    id,
    enviarPresupuestoDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **enviarPresupuestoDto** | **EnviarPresupuestoDto**|  | |
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|


### Return type

**PresupuestoVersionDto**

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
|**422** | Transición no válida (&#x60;TRANSICION_NO_VALIDA&#x60;) o sin partidas (&#x60;PRESUPUESTO_VACIO&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **exportarPresupuesto**
> File exportarPresupuesto()

Hoja «Partidas» (mismas columnas de la plantilla de importación, más totales) y hoja «Resumen».

### Example

```typescript
import {
    PresupuestosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)

const { status, data } = await apiInstance.exportarPresupuesto(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|


### Return type

**File**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Archivo .xlsx. |  -  |
|**401** | Sin sesión válida. |  -  |
|**404** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarPresupuestos**
> Array<PresupuestoVersionDto> listarPresupuestos()

De la más reciente a la más antigua, con su estado, totales y quién la creó, envió y aprobó o rechazó.

### Example

```typescript
import {
    PresupuestosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let obraId: number; //Identificador de la obra. (default to undefined)

const { status, data } = await apiInstance.listarPresupuestos(
    obraId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **obraId** | [**number**] | Identificador de la obra. | defaults to undefined|


### Return type

**Array<PresupuestoVersionDto>**

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

# **obtenerPresupuesto**
> PresupuestoDetalleDto obtenerPresupuesto()


### Example

```typescript
import {
    PresupuestosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)

const { status, data } = await apiInstance.obtenerPresupuesto(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|


### Return type

**PresupuestoDetalleDto**

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

# **rechazarPresupuesto**
> PresupuestoVersionDto rechazarPresupuesto(rechazarPresupuestoDto)

La versión rechazada es final: para corregirla se crea una versión nueva copiada de ella.

### Example

```typescript
import {
    PresupuestosApi,
    Configuration,
    RechazarPresupuestoDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PresupuestosApi(configuration);

let id: number; //Identificador de la versión de presupuesto. (default to undefined)
let rechazarPresupuestoDto: RechazarPresupuestoDto; //

const { status, data } = await apiInstance.rechazarPresupuesto(
    id,
    rechazarPresupuestoDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rechazarPresupuestoDto** | **RechazarPresupuestoDto**|  | |
| **id** | [**number**] | Identificador de la versión de presupuesto. | defaults to undefined|


### Return type

**PresupuestoVersionDto**

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

