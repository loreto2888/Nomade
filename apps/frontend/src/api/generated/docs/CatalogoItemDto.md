# CatalogoItemDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**tipo** | [**TipoCatalogo**](TipoCatalogo.md) |  | [default to undefined]
**codigo** | **string** | Identificador estable; no se puede editar. | [default to undefined]
**nombre** | **string** |  | [default to undefined]
**descripcion** | **string** |  | [default to undefined]
**orden** | **number** | Posición en las listas (ascendente). | [default to undefined]
**activo** | **boolean** | Los ítems inactivos no se ofrecen para nuevos registros. | [default to undefined]
**protegido** | **boolean** | Ítem que usa la lógica de la aplicación: no se puede desactivar. | [default to undefined]
**version** | **number** |  | [default to undefined]

## Example

```typescript
import { CatalogoItemDto } from './api';

const instance: CatalogoItemDto = {
    id,
    tipo,
    codigo,
    nombre,
    descripcion,
    orden,
    activo,
    protegido,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
