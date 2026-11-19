# CrearCuentaBancariaDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**banco** | **string** |  | [default to undefined]
**tipoCuenta** | [**TipoCuentaBancaria**](TipoCuentaBancaria.md) |  | [default to undefined]
**numeroCuenta** | **string** | 4 a 20 dígitos. | [default to undefined]
**titular** | **string** |  | [default to undefined]
**titularRut** | **string** |  | [default to undefined]
**correoNotificacion** | **string** |  | [optional] [default to undefined]
**principal** | **boolean** | La primera cuenta del proveedor queda como principal automáticamente. | [optional] [default to undefined]

## Example

```typescript
import { CrearCuentaBancariaDto } from './api';

const instance: CrearCuentaBancariaDto = {
    banco,
    tipoCuenta,
    numeroCuenta,
    titular,
    titularRut,
    correoNotificacion,
    principal,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
