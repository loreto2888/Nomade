# SesionActualDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**usuario** | [**UsuarioSesionDto**](UsuarioSesionDto.md) |  | [default to undefined]
**permisos** | **Array&lt;string&gt;** | Códigos de permiso efectivos del rol (admin → todos; usuario → todos salvo administración). | [default to undefined]
**expiraEn** | **string** | Vencimiento absoluto de la sesión (8 h). | [default to undefined]

## Example

```typescript
import { SesionActualDto } from './api';

const instance: SesionActualDto = {
    usuario,
    permisos,
    expiraEn,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
