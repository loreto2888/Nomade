# ActualizarCotizacionDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**obraId** | **number** |  | [optional] [default to undefined]
**proveedorId** | **number** |  | [optional] [default to undefined]
**referenciaProveedor** | **string** |  | [optional] [default to undefined]
**fecha** | **string** |  | [optional] [default to undefined]
**validezHasta** | **string** |  | [optional] [default to undefined]
**descripcion** | **string** |  | [optional] [default to undefined]
**categoriaGastoId** | **number** | Categoría de gasto (catálogo &#x60;categoria_gasto&#x60;). Por defecto, «Subcontratos». | [optional] [default to undefined]
**montoNeto** | **number** | Monto neto en CLP (entero). | [optional] [default to undefined]
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]

## Example

```typescript
import { ActualizarCotizacionDto } from './api';

const instance: ActualizarCotizacionDto = {
    obraId,
    proveedorId,
    referenciaProveedor,
    fecha,
    validezHasta,
    descripcion,
    categoriaGastoId,
    montoNeto,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
