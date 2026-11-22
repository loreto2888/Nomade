# LineaOrdenCompraDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**numero** | **number** |  | [default to undefined]
**descripcion** | **string** |  | [default to undefined]
**unidad** | **string** |  | [default to undefined]
**cantidad** | **number** |  | [default to undefined]
**precioUnitario** | **number** | CLP (hasta 4 decimales). | [default to undefined]
**total** | **number** | Cantidad × precio, en pesos. | [default to undefined]

## Example

```typescript
import { LineaOrdenCompraDto } from './api';

const instance: LineaOrdenCompraDto = {
    id,
    numero,
    descripcion,
    unidad,
    cantidad,
    precioUnitario,
    total,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
