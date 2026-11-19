# ActualizarCatalogoItemDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]
**nombre** | **string** |  | [optional] [default to undefined]
**descripcion** | **string** |  | [optional] [default to undefined]
**orden** | **number** |  | [optional] [default to undefined]
**activo** | **boolean** | Activa o desactiva el ítem (los protegidos no se desactivan). | [optional] [default to undefined]

## Example

```typescript
import { ActualizarCatalogoItemDto } from './api';

const instance: ActualizarCatalogoItemDto = {
    version,
    nombre,
    descripcion,
    orden,
    activo,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
