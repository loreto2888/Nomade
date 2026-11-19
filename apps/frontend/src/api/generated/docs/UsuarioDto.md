# UsuarioDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** | Identificador del usuario. | [default to undefined]
**correo** | **string** | Correo (inicio de sesión). | [default to undefined]
**nombre** | **string** |  | [default to undefined]
**rol** | [**Rol**](Rol.md) |  | [default to undefined]
**activo** | **boolean** | Las cuentas no se eliminan: solo se desactivan. | [default to undefined]
**debeCambiarClave** | **boolean** | Debe reemplazar su contraseña temporal al ingresar. | [default to undefined]
**bloqueadoHasta** | **string** | Si está bloqueada por intentos fallidos, hasta cuándo. | [default to undefined]
**ultimoAccesoEn** | **string** |  | [default to undefined]
**tema** | [**TemaInterfaz**](TemaInterfaz.md) |  | [default to undefined]
**creadoEn** | **string** |  | [default to undefined]
**actualizadoEn** | **string** |  | [default to undefined]
**version** | **number** | Versión para control optimista: se envía en cada modificación. | [default to undefined]

## Example

```typescript
import { UsuarioDto } from './api';

const instance: UsuarioDto = {
    id,
    correo,
    nombre,
    rol,
    activo,
    debeCambiarClave,
    bloqueadoHasta,
    ultimoAccesoEn,
    tema,
    creadoEn,
    actualizadoEn,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
