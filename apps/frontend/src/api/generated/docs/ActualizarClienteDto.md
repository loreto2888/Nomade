# ActualizarClienteDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**rut** | **string** | RUT (se acepta con puntos; se guarda como 76123456-0). | [optional] [default to undefined]
**razonSocial** | **string** |  | [optional] [default to undefined]
**nombreFantasia** | **string** |  | [optional] [default to undefined]
**giro** | **string** |  | [optional] [default to undefined]
**contactoNombre** | **string** |  | [optional] [default to undefined]
**correo** | **string** |  | [optional] [default to undefined]
**telefono** | **string** |  | [optional] [default to undefined]
**direccion** | **string** |  | [optional] [default to undefined]
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]

## Example

```typescript
import { ActualizarClienteDto } from './api';

const instance: ActualizarClienteDto = {
    rut,
    razonSocial,
    nombreFantasia,
    giro,
    contactoNombre,
    correo,
    telefono,
    direccion,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
