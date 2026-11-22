# CrearCotizacionDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**obraId** | **number** |  | [default to undefined]
**proveedorId** | **number** |  | [default to undefined]
**referenciaProveedor** | **string** |  | [optional] [default to undefined]
**fecha** | **string** |  | [default to undefined]
**validezHasta** | **string** |  | [optional] [default to undefined]
**descripcion** | **string** |  | [default to undefined]
**categoriaGastoId** | **number** | Categoría de gasto (catálogo &#x60;categoria_gasto&#x60;). Por defecto, «Subcontratos». | [optional] [default to undefined]
**montoNeto** | **number** | Monto neto en CLP (entero). | [default to undefined]

## Example

```typescript
import { CrearCotizacionDto } from './api';

const instance: CrearCotizacionDto = {
    obraId,
    proveedorId,
    referenciaProveedor,
    fecha,
    validezHasta,
    descripcion,
    categoriaGastoId,
    montoNeto,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
