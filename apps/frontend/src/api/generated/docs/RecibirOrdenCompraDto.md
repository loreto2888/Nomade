# RecibirOrdenCompraDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]
**fechaRecepcion** | **string** | Por defecto, hoy. | [optional] [default to undefined]
**observacion** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { RecibirOrdenCompraDto } from './api';

const instance: RecibirOrdenCompraDto = {
    version,
    fechaRecepcion,
    observacion,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
