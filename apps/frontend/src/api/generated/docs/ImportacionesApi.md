# ImportacionesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**confirmarImportacion**](#confirmarimportacion) | **POST** /api/importaciones/{id}/confirmar | Confirma un lote sin errores: crea la versión de presupuesto en borrador|
|[**descargarPlantillaPresupuesto**](#descargarplantillapresupuesto) | **GET** /api/importaciones/plantillas/presupuesto | Descarga la plantilla provisoria de presupuesto (.xlsx)|
|[**descartarImportacion**](#descartarimportacion) | **POST** /api/importaciones/{id}/descartar | Descarta un lote pendiente|
|[**listarFilasImportacion**](#listarfilasimportacion) | **GET** /api/importaciones/{id}/filas | Filas de un lote con su validación (paginado)|
|[**listarImportaciones**](#listarimportaciones) | **GET** /api/importaciones | Lista los lotes de importación (los más recientes primero)|
|[**obtenerImportacion**](#obtenerimportacion) | **GET** /api/importaciones/{id} | Obtiene un lote de importación|
|[**subirImportacionPresupuesto**](#subirimportacionpresupuesto) | **POST** /api/importaciones/presupuestos | Sube una planilla de presupuesto y la previsualiza|

# **confirmarImportacion**
> ImportacionLoteDto confirmarImportacion(confirmarImportacionDto)

Vuelve a validar las filas y crea la versión (`presupuestoVersionId` en la respuesta). Un lote con errores no se puede confirmar.

### Example

```typescript
import {
    ImportacionesApi,
    Configuration,
    ConfirmarImportacionDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ImportacionesApi(configuration);

let id: number; //Identificador del lote de importación. (default to undefined)
let confirmarImportacionDto: ConfirmarImportacionDto; //

const { status, data } = await apiInstance.confirmarImportacion(
    id,
    confirmarImportacionDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **confirmarImportacionDto** | **ConfirmarImportacionDto**|  | |
| **id** | [**number**] | Identificador del lote de importación. | defaults to undefined|


### Return type

**ImportacionLoteDto**

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
|**422** | Lote con errores (&#x60;IMPORTACION_CON_ERRORES&#x60;), ya resuelto (&#x60;IMPORTACION_NO_PENDIENTE&#x60;) o desactualizado. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **descargarPlantillaPresupuesto**
> File descargarPlantillaPresupuesto()

Columnas: código, familia, descripción, unidad, cantidad y precio unitario. La plantilla real del cliente aún no existe (H9).

### Example

```typescript
import {
    ImportacionesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ImportacionesApi(configuration);

const { status, data } = await apiInstance.descargarPlantillaPresupuesto();
```

### Parameters
This endpoint does not have any parameters.


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
|**403** | Solo administradores. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **descartarImportacion**
> ImportacionLoteDto descartarImportacion(descartarImportacionDto)


### Example

```typescript
import {
    ImportacionesApi,
    Configuration,
    DescartarImportacionDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ImportacionesApi(configuration);

let id: number; //Identificador del lote de importación. (default to undefined)
let descartarImportacionDto: DescartarImportacionDto; //

const { status, data } = await apiInstance.descartarImportacion(
    id,
    descartarImportacionDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **descartarImportacionDto** | **DescartarImportacionDto**|  | |
| **id** | [**number**] | Identificador del lote de importación. | defaults to undefined|


### Return type

**ImportacionLoteDto**

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
|**422** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarFilasImportacion**
> PaginaFilasImportacionDto listarFilasImportacion()

Con `soloErrores=true` devuelve únicamente las filas con errores.

### Example

```typescript
import {
    ImportacionesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ImportacionesApi(configuration);

let id: number; //Identificador del lote de importación. (default to undefined)
let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let soloErrores: boolean; //Solo las filas con errores. (optional) (default to false)

const { status, data } = await apiInstance.listarFilasImportacion(
    id,
    pagina,
    tamanio,
    soloErrores
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador del lote de importación. | defaults to undefined|
| **pagina** | [**number**] | Número de página (desde 1). | (optional) defaults to 1|
| **tamanio** | [**number**] | Registros por página. | (optional) defaults to 25|
| **soloErrores** | [**boolean**] | Solo las filas con errores. | (optional) defaults to false|


### Return type

**PaginaFilasImportacionDto**

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

# **listarImportaciones**
> PaginaImportacionesDto listarImportaciones()


### Example

```typescript
import {
    ImportacionesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ImportacionesApi(configuration);

let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let obraId: number; //Filtra por obra de destino. (optional) (default to undefined)
let estado: EstadoImportacion; // (optional) (default to undefined)

const { status, data } = await apiInstance.listarImportaciones(
    pagina,
    tamanio,
    obraId,
    estado
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **pagina** | [**number**] | Número de página (desde 1). | (optional) defaults to 1|
| **tamanio** | [**number**] | Registros por página. | (optional) defaults to 25|
| **obraId** | [**number**] | Filtra por obra de destino. | (optional) defaults to undefined|
| **estado** | **EstadoImportacion** |  | (optional) defaults to undefined|


### Return type

**PaginaImportacionesDto**

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

# **obtenerImportacion**
> ImportacionLoteDto obtenerImportacion()


### Example

```typescript
import {
    ImportacionesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ImportacionesApi(configuration);

let id: number; //Identificador del lote de importación. (default to undefined)

const { status, data } = await apiInstance.obtenerImportacion(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador del lote de importación. | defaults to undefined|


### Return type

**ImportacionLoteDto**

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

# **subirImportacionPresupuesto**
> ImportacionLoteDto subirImportacionPresupuesto()

Formulario multipart con el archivo en `archivo` (.xlsx o .csv, hasta 20 MB y 5.000 filas) y `obraId`. Valida fila a fila y guarda el lote; no crea nada en el presupuesto hasta confirmar.

### Example

```typescript
import {
    ImportacionesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ImportacionesApi(configuration);

let archivo: File; //Planilla .xlsx o .csv. (default to undefined)
let obraId: number; // (default to undefined)

const { status, data } = await apiInstance.subirImportacionPresupuesto(
    archivo,
    obraId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **archivo** | [**File**] | Planilla .xlsx o .csv. | defaults to undefined|
| **obraId** | [**number**] |  | defaults to undefined|


### Return type

**ImportacionLoteDto**

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
|**403** | Solo administradores. |  -  |
|**404** |  |  -  |
|**413** | Supera 20 MB. |  -  |
|**415** | No es .xlsx ni .csv. |  -  |
|**422** | Planilla inválida (&#x60;PLANTILLA_INVALIDA&#x60;, &#x60;ARCHIVO_ILEGIBLE&#x60;, &#x60;PLANILLA_DEMASIADO_GRANDE&#x60;) u obra cerrada. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

