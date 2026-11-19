# ProveedoresApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**actualizarCuentaBancaria**](#actualizarcuentabancaria) | **PATCH** /api/proveedores/{proveedorId}/cuentas-bancarias/{cuentaId} | Modifica una cuenta bancaria (con control de versión)|
|[**actualizarProveedor**](#actualizarproveedor) | **PATCH** /api/proveedores/{id} | Modifica un proveedor (con control de versión)|
|[**crearCuentaBancaria**](#crearcuentabancaria) | **POST** /api/proveedores/{proveedorId}/cuentas-bancarias | Agrega una cuenta bancaria al proveedor|
|[**crearProveedor**](#crearproveedor) | **POST** /api/proveedores | Crea un proveedor|
|[**eliminarCuentaBancaria**](#eliminarcuentabancaria) | **POST** /api/proveedores/{proveedorId}/cuentas-bancarias/{cuentaId}/eliminar | Elimina una cuenta bancaria (borrado lógico)|
|[**eliminarProveedor**](#eliminarproveedor) | **POST** /api/proveedores/{id}/eliminar | Elimina un proveedor (borrado lógico)|
|[**listarCuentasBancarias**](#listarcuentasbancarias) | **GET** /api/proveedores/{proveedorId}/cuentas-bancarias | Lista las cuentas bancarias de un proveedor (auditado)|
|[**listarProveedores**](#listarproveedores) | **GET** /api/proveedores | Lista proveedores (paginado, con búsqueda y orden)|
|[**obtenerProveedor**](#obtenerproveedor) | **GET** /api/proveedores/{id} | Obtiene un proveedor|

# **actualizarCuentaBancaria**
> CuentaBancariaDto actualizarCuentaBancaria(actualizarCuentaBancariaDto)


### Example

```typescript
import {
    ProveedoresApi,
    Configuration,
    ActualizarCuentaBancariaDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ProveedoresApi(configuration);

let proveedorId: number; //Identificador del proveedor. (default to undefined)
let cuentaId: number; //Identificador de la cuenta bancaria. (default to undefined)
let actualizarCuentaBancariaDto: ActualizarCuentaBancariaDto; //

const { status, data } = await apiInstance.actualizarCuentaBancaria(
    proveedorId,
    cuentaId,
    actualizarCuentaBancariaDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarCuentaBancariaDto** | **ActualizarCuentaBancariaDto**|  | |
| **proveedorId** | [**number**] | Identificador del proveedor. | defaults to undefined|
| **cuentaId** | [**number**] | Identificador de la cuenta bancaria. | defaults to undefined|


### Return type

**CuentaBancariaDto**

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
|**422** | No se puede quitar la marca de principal (&#x60;CUENTA_PRINCIPAL_REQUERIDA&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **actualizarProveedor**
> ProveedorDto actualizarProveedor(actualizarProveedorDto)


### Example

```typescript
import {
    ProveedoresApi,
    Configuration,
    ActualizarProveedorDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ProveedoresApi(configuration);

let id: number; //Identificador del proveedor. (default to undefined)
let actualizarProveedorDto: ActualizarProveedorDto; //

const { status, data } = await apiInstance.actualizarProveedor(
    id,
    actualizarProveedorDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarProveedorDto** | **ActualizarProveedorDto**|  | |
| **id** | [**number**] | Identificador del proveedor. | defaults to undefined|


### Return type

**ProveedorDto**

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
|**409** | Versión desactualizada (&#x60;CONFLICTO_VERSION&#x60;) o RUT duplicado (&#x60;RUT_DUPLICADO&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **crearCuentaBancaria**
> CuentaBancariaDto crearCuentaBancaria(crearCuentaBancariaDto)


### Example

```typescript
import {
    ProveedoresApi,
    Configuration,
    CrearCuentaBancariaDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ProveedoresApi(configuration);

let proveedorId: number; //Identificador del proveedor. (default to undefined)
let crearCuentaBancariaDto: CrearCuentaBancariaDto; //

const { status, data } = await apiInstance.crearCuentaBancaria(
    proveedorId,
    crearCuentaBancariaDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearCuentaBancariaDto** | **CrearCuentaBancariaDto**|  | |
| **proveedorId** | [**number**] | Identificador del proveedor. | defaults to undefined|


### Return type

**CuentaBancariaDto**

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
|**403** | Solo administradores. |  -  |
|**404** |  |  -  |
|**409** | Ya existe esa cuenta (&#x60;CUENTA_BANCARIA_DUPLICADA&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **crearProveedor**
> ProveedorDto crearProveedor(crearProveedorDto)


### Example

```typescript
import {
    ProveedoresApi,
    Configuration,
    CrearProveedorDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ProveedoresApi(configuration);

let crearProveedorDto: CrearProveedorDto; //

const { status, data } = await apiInstance.crearProveedor(
    crearProveedorDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearProveedorDto** | **CrearProveedorDto**|  | |


### Return type

**ProveedorDto**

### Authorization

[nomade_session](../README.md#nomade_session)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** |  |  -  |
|**400** | Datos inválidos (RUT, correo…). |  -  |
|**401** | Sin sesión válida. |  -  |
|**409** | El RUT ya existe (&#x60;RUT_DUPLICADO&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **eliminarCuentaBancaria**
> eliminarCuentaBancaria(eliminarCuentaBancariaDto)


### Example

```typescript
import {
    ProveedoresApi,
    Configuration,
    EliminarCuentaBancariaDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ProveedoresApi(configuration);

let proveedorId: number; //Identificador del proveedor. (default to undefined)
let cuentaId: number; //Identificador de la cuenta bancaria. (default to undefined)
let eliminarCuentaBancariaDto: EliminarCuentaBancariaDto; //

const { status, data } = await apiInstance.eliminarCuentaBancaria(
    proveedorId,
    cuentaId,
    eliminarCuentaBancariaDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarCuentaBancariaDto** | **EliminarCuentaBancariaDto**|  | |
| **proveedorId** | [**number**] | Identificador del proveedor. | defaults to undefined|
| **cuentaId** | [**number**] | Identificador de la cuenta bancaria. | defaults to undefined|


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
|**204** | Cuenta eliminada. |  -  |
|**401** | Sin sesión válida. |  -  |
|**403** | Solo administradores. |  -  |
|**404** |  |  -  |
|**409** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **eliminarProveedor**
> eliminarProveedor(eliminarProveedorDto)


### Example

```typescript
import {
    ProveedoresApi,
    Configuration,
    EliminarProveedorDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ProveedoresApi(configuration);

let id: number; //Identificador del proveedor. (default to undefined)
let eliminarProveedorDto: EliminarProveedorDto; //

const { status, data } = await apiInstance.eliminarProveedor(
    id,
    eliminarProveedorDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eliminarProveedorDto** | **EliminarProveedorDto**|  | |
| **id** | [**number**] | Identificador del proveedor. | defaults to undefined|


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
|**204** | Proveedor eliminado. |  -  |
|**401** | Sin sesión válida. |  -  |
|**404** |  |  -  |
|**409** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarCuentasBancarias**
> Array<CuentaBancariaDto> listarCuentasBancarias()

Cada consulta queda registrada en la bitácora.

### Example

```typescript
import {
    ProveedoresApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProveedoresApi(configuration);

let proveedorId: number; //Identificador del proveedor. (default to undefined)

const { status, data } = await apiInstance.listarCuentasBancarias(
    proveedorId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proveedorId** | [**number**] | Identificador del proveedor. | defaults to undefined|


### Return type

**Array<CuentaBancariaDto>**

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

# **listarProveedores**
> PaginaProveedoresDto listarProveedores()


### Example

```typescript
import {
    ProveedoresApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProveedoresApi(configuration);

let pagina: number; //Número de página (desde 1). (optional) (default to 1)
let tamanio: number; //Registros por página. (optional) (default to 25)
let direccion: DireccionOrden; // (optional) (default to undefined)
let q: string; //Búsqueda por razón social, nombre de fantasía o RUT. (optional) (default to undefined)
let ordenarPor: 'razonSocial' | 'rut' | 'creadoEn'; // (optional) (default to 'razonSocial')

const { status, data } = await apiInstance.listarProveedores(
    pagina,
    tamanio,
    direccion,
    q,
    ordenarPor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **pagina** | [**number**] | Número de página (desde 1). | (optional) defaults to 1|
| **tamanio** | [**number**] | Registros por página. | (optional) defaults to 25|
| **direccion** | **DireccionOrden** |  | (optional) defaults to undefined|
| **q** | [**string**] | Búsqueda por razón social, nombre de fantasía o RUT. | (optional) defaults to undefined|
| **ordenarPor** | [**&#39;razonSocial&#39; | &#39;rut&#39; | &#39;creadoEn&#39;**]**Array<&#39;razonSocial&#39; &#124; &#39;rut&#39; &#124; &#39;creadoEn&#39;>** |  | (optional) defaults to 'razonSocial'|


### Return type

**PaginaProveedoresDto**

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

# **obtenerProveedor**
> ProveedorDto obtenerProveedor()

No incluye datos bancarios: se consultan aparte y solo el administrador puede hacerlo.

### Example

```typescript
import {
    ProveedoresApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProveedoresApi(configuration);

let id: number; //Identificador del proveedor. (default to undefined)

const { status, data } = await apiInstance.obtenerProveedor(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] | Identificador del proveedor. | defaults to undefined|


### Return type

**ProveedorDto**

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

