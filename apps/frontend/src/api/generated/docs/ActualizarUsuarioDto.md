# ActualizarUsuarioDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]
**correo** | **string** |  | [optional] [default to undefined]
**nombre** | **string** |  | [optional] [default to undefined]
**rol** | [**Rol**](Rol.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ActualizarUsuarioDto } from './api';

const instance: ActualizarUsuarioDto = {
    version,
    correo,
    nombre,
    rol,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
