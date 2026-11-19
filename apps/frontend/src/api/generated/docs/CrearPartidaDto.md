# CrearPartidaDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**codigo** | **string** | Código de la partida, único en la versión: 1 a 30 caracteres (letras, dígitos, punto, guion o guion bajo). | [default to undefined]
**familiaId** | **number** | Familia (catálogo &#x60;familia_partida&#x60;). | [default to undefined]
**descripcion** | **string** |  | [default to undefined]
**unidad** | **string** |  | [default to undefined]
**cantidad** | **number** | Mayor que cero, hasta 4 decimales. | [default to undefined]
**precioUnitario** | **number** | Precio por unidad en la moneda de la versión (CLP: entero; UF: hasta 4 decimales). | [default to undefined]

## Example

```typescript
import { CrearPartidaDto } from './api';

const instance: CrearPartidaDto = {
    codigo,
    familiaId,
    descripcion,
    unidad,
    cantidad,
    precioUnitario,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
