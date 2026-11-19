# CatalogosApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**actualizarItemCatalogo**](#actualizaritemcatalogo) | **PATCH** /api/catalogos/{tipo}/{id} | Modifica un ítem de catálogo (con control de versión)|
|[**crearItemCatalogo**](#crearitemcatalogo) | **POST** /api/catalogos/{tipo} | Agrega un ítem a un catálogo (solo administradores)|
|[**listarCatalogo**](#listarcatalogo) | **GET** /api/catalogos/{tipo} | Lista los ítems de un catálogo|

# **actualizarItemCatalogo**
> CatalogoItemDto actualizarItemCatalogo(actualizarCatalogoItemDto)

El código no se puede editar. Los ítems no se eliminan: se desactivan.

### Example

```typescript
import {
    CatalogosApi,
    Configuration,
    ActualizarCatalogoItemDto
} from './api';

const configuration = new Configuration();
const apiInstance = new CatalogosApi(configuration);

let tipo: TipoCatalogo; //Catálogo. (default to undefined)
let id: number; //Identificador del ítem. (default to undefined)
let actualizarCatalogoItemDto: ActualizarCatalogoItemDto; //

const { status, data } = await apiInstance.actualizarItemCatalogo(
    tipo,
    id,
    actualizarCatalogoItemDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actualizarCatalogoItemDto** | **ActualizarCatalogoItemDto**|  | |
| **tipo** | **TipoCatalogo** | Catálogo. | defaults to undefined|
| **id** | [**number**] | Identificador del ítem. | defaults to undefined|


### Return type

**CatalogoItemDto**

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
|**422** | Ítem protegido: no se puede desactivar (&#x60;CATALOGO_ITEM_PROTEGIDO&#x60;). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **crearItemCatalogo**
> CatalogoItemDto crearItemCatalogo(crearCatalogoItemDto)


### Example

```typescript
import {
    CatalogosApi,
    Configuration,
    CrearCatalogoItemDto
} from './api';

const configuration = new Configuration();
const apiInstance = new CatalogosApi(configuration);

let tipo: TipoCatalogo; //Catálogo. (default to undefined)
let crearCatalogoItemDto: CrearCatalogoItemDto; //

const { status, data } = await apiInstance.crearItemCatalogo(
    tipo,
    crearCatalogoItemDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **crearCatalogoItemDto** | **CrearCatalogoItemDto**|  | |
| **tipo** | **TipoCatalogo** | Catálogo. | defaults to undefined|


### Return type

**CatalogoItemDto**

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
|**409** | Código o nombre duplicado en el catálogo. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listarCatalogo**
> Array<CatalogoItemDto> listarCatalogo()

Los ítems activos se ofrecen en los formularios; con `incluirInactivos` se listan todos (administración).

### Example

```typescript
import {
    CatalogosApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CatalogosApi(configuration);

let tipo: TipoCatalogo; //Catálogo. (default to undefined)
let incluirInactivos: boolean; //Incluye también los ítems inactivos (por defecto solo los activos). (optional) (default to false)

const { status, data } = await apiInstance.listarCatalogo(
    tipo,
    incluirInactivos
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **tipo** | **TipoCatalogo** | Catálogo. | defaults to undefined|
| **incluirInactivos** | [**boolean**] | Incluye también los ítems inactivos (por defecto solo los activos). | (optional) defaults to false|


### Return type

**Array<CatalogoItemDto>**

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

