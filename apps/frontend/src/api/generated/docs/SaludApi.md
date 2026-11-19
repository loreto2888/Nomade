# SaludApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**obtenerSalud**](#obtenersalud) | **GET** /api/health | Estado del servicio y de la base de datos|

# **obtenerSalud**
> SaludDto obtenerSalud()


### Example

```typescript
import {
    SaludApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SaludApi(configuration);

const { status, data } = await apiInstance.obtenerSalud();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SaludDto**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Servicio operativo. |  -  |
|**503** | La base de datos no responde. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

