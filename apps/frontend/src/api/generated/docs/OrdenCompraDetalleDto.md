# OrdenCompraDetalleDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ordenCompra** | [**OrdenCompraDto**](OrdenCompraDto.md) |  | [default to undefined]
**movimientos** | [**Array&lt;MovimientoDto&gt;**](MovimientoDto.md) | Movimientos del libro generados por la OC (compromiso y su reversa). | [default to undefined]

## Example

```typescript
import { OrdenCompraDetalleDto } from './api';

const instance: OrdenCompraDetalleDto = {
    ordenCompra,
    movimientos,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
