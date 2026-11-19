# PartidaComparadaDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**codigo** | **string** |  | [default to undefined]
**cambio** | [**TipoCambioPartida**](TipoCambioPartida.md) |  | [default to undefined]
**descripcion** | **string** | Descripción (de la versión comparada o, si fue eliminada, de la base). | [default to undefined]
**base** | [**PartidaDto**](PartidaDto.md) | Partida en la versión base. | [default to undefined]
**nueva** | [**PartidaDto**](PartidaDto.md) | Partida en la versión comparada. | [default to undefined]
**diferenciaClp** | **number** | Total en CLP de la versión comparada menos el de la base. | [default to undefined]

## Example

```typescript
import { PartidaComparadaDto } from './api';

const instance: PartidaComparadaDto = {
    codigo,
    cambio,
    descripcion,
    base,
    nueva,
    diferenciaClp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
