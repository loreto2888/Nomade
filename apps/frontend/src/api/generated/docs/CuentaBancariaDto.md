# CuentaBancariaDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**proveedorId** | **number** |  | [default to undefined]
**banco** | **string** |  | [default to undefined]
**tipoCuenta** | [**TipoCuentaBancaria**](TipoCuentaBancaria.md) |  | [default to undefined]
**numeroCuenta** | **string** |  | [default to undefined]
**titular** | **string** |  | [default to undefined]
**titularRut** | **string** |  | [default to undefined]
**correoNotificacion** | **string** |  | [default to undefined]
**principal** | **boolean** | Cuenta preferida para los pagos del proveedor. | [default to undefined]
**creadoEn** | **string** |  | [default to undefined]
**actualizadoEn** | **string** |  | [default to undefined]
**version** | **number** |  | [default to undefined]

## Example

```typescript
import { CuentaBancariaDto } from './api';

const instance: CuentaBancariaDto = {
    id,
    proveedorId,
    banco,
    tipoCuenta,
    numeroCuenta,
    titular,
    titularRut,
    correoNotificacion,
    principal,
    creadoEn,
    actualizadoEn,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
