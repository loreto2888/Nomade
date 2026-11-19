# CambiarClaveDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**claveActual** | **string** | Contraseña actual (o la temporal entregada por el administrador). | [default to undefined]
**claveNueva** | **string** | Nueva contraseña (mínimo 12 caracteres). | [default to undefined]

## Example

```typescript
import { CambiarClaveDto } from './api';

const instance: CambiarClaveDto = {
    claveActual,
    claveNueva,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
