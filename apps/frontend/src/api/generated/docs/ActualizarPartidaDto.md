# ActualizarPartidaDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**codigo** | **string** | Código de la partida, único en la versión: 1 a 30 caracteres (letras, dígitos, punto, guion o guion bajo). | [optional] [default to undefined]
**familiaId** | **number** | Familia (catálogo &#x60;familia_partida&#x60;). | [optional] [default to undefined]
**descripcion** | **string** |  | [optional] [default to undefined]
**unidad** | **string** |  | [optional] [default to undefined]
**cantidad** | **number** | Mayor que cero, hasta 4 decimales. | [optional] [default to undefined]
**precioUnitario** | **number** | Precio por unidad en la moneda de la versión (CLP: entero; UF: hasta 4 decimales). | [optional] [default to undefined]
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]

## Example

```typescript
import { ActualizarPartidaDto } from './api';

const instance: ActualizarPartidaDto = {
    codigo,
    familiaId,
    descripcion,
    unidad,
    cantidad,
    precioUnitario,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
