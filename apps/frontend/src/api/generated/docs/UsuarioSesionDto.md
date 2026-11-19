# UsuarioSesionDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**correo** | **string** |  | [default to undefined]
**nombre** | **string** |  | [default to undefined]
**rol** | [**Rol**](Rol.md) |  | [default to undefined]
**debeCambiarClave** | **boolean** | Si es &#x60;true&#x60;, solo puede cambiar su contraseña hasta hacerlo. | [default to undefined]
**tema** | [**TemaInterfaz**](TemaInterfaz.md) |  | [default to undefined]

## Example

```typescript
import { UsuarioSesionDto } from './api';

const instance: UsuarioSesionDto = {
    id,
    correo,
    nombre,
    rol,
    debeCambiarClave,
    tema,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
