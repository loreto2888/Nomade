# UsuarioClaveTemporalDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**usuario** | [**UsuarioDto**](UsuarioDto.md) |  | [default to undefined]
**claveTemporal** | **string** | Contraseña temporal generada. Se muestra una sola vez; el usuario deberá cambiarla al ingresar. | [default to undefined]

## Example

```typescript
import { UsuarioClaveTemporalDto } from './api';

const instance: UsuarioClaveTemporalDto = {
    usuario,
    claveTemporal,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
