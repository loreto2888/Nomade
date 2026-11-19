# UfApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**guardarValorUf**](#guardarvaloruf) | **PUT** /api/uf/{fecha} | Crea o corrige el valor de la UF de un día (solo administradores)|
|[**listarValoresUf**](#listarvaloresuf) | **GET** /api/uf | Lista los valores de la UF cargados (solo administradores)|
|[**obtenerValorUf**](#obtenervaloruf) | **GET** /api/uf/valor | Valor de la UF aplicable a una fecha|

# **guardarValorUf**
> ValorUfDto guardarValorUf(guardarValorUfDto)


### Example

```typescript
import {
    UfApi,
    Configuration,
    GuardarValorUfDto
} from './api';

const configuration = new Configuration();
const apiInstance = new UfApi(configuration);

let fecha: string; //Fecha AAAA-MM-DD. (default to undefined)
let guardarValorUfDto: GuardarValorUfDto; //

const { status, data } = await apiInstance.guardarValorUf(
    fecha,
    guardarValorUfDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **guardarValorUfDto** | **GuardarValorUfDto**|  | |
| **fecha** | [**string**] | Fecha AAAA-MM-DD. | defaults to undefined|


### Return type

**ValorUfDto**

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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarValoresUf**
> PaginaValoresUfDto listarValoresUf()


### Example

```typescript
import {
    UfApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UfApi(configuration);

let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let desde: string; //Desde esta fecha (incluida). (optional) (default to undefined)
let hasta: string; //Hasta esta fecha (incluida). (optional) (default to undefined)

const { status, data } = await apiInstance.listarValoresUf(
    pagina,
    tamanio,
    desde,
    hasta
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **pagina** | [**number**] | Número de página (desde 1). | (optional) defaults to 1|
| **tamanio** | [**number**] | Registros por página. | (optional) defaults to 25|
| **desde** | [**string**] | Desde esta fecha (incluida). | (optional) defaults to undefined|
| **hasta** | [**string**] | Hasta esta fecha (incluida). | (optional) defaults to undefined|


### Return type

**PaginaValoresUfDto**

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

# **obtenerValorUf**
> ValorUfDto obtenerValorUf()

Sirve para convertir montos UF ↔ CLP. Usa el valor del día o el último anterior (hasta 7 días).

### Example

```typescript
import {
    UfApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UfApi(configuration);

let fecha: string; //Fecha de la conversión (por defecto, hoy en Chile). Si ese día no tiene valor se usa el último anterior de hasta 7 días. (optional) (default to undefined)

const { status, data } = await apiInstance.obtenerValorUf(
    fecha
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **fecha** | [**string**] | Fecha de la conversión (por defecto, hoy en Chile). Si ese día no tiene valor se usa el último anterior de hasta 7 días. | (optional) defaults to undefined|


### Return type

**ValorUfDto**

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
|**422** | No hay valor cargado (&#x60;UF_NO_DISPONIBLE&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

