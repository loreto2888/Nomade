# ActualizarCuentaBancariaDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**banco** | **string** |  | [optional] [default to undefined]
**tipoCuenta** | [**TipoCuentaBancaria**](TipoCuentaBancaria.md) |  | [optional] [default to undefined]
**numeroCuenta** | **string** | 4 a 20 dígitos. | [optional] [default to undefined]
**titular** | **string** |  | [optional] [default to undefined]
**titularRut** | **string** |  | [optional] [default to undefined]
**correoNotificacion** | **string** |  | [optional] [default to undefined]
**principal** | **boolean** | La primera cuenta del proveedor queda como principal automáticamente. | [optional] [default to undefined]
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]

## Example

```typescript
import { ActualizarCuentaBancariaDto } from './api';

const instance: ActualizarCuentaBancariaDto = {
    banco,
    tipoCuenta,
    numeroCuenta,
    titular,
    titularRut,
    correoNotificacion,
    principal,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
