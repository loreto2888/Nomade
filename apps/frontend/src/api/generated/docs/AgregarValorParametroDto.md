# AgregarValorParametroDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]
**valor** | **string** | Valor según el tipo del parámetro (número, entero o texto). | [default to undefined]
**vigenteDesde** | **string** | Primer día de vigencia (hoy o posterior). | [default to undefined]
**motivo** | **string** | Motivo del cambio (queda en la bitácora). | [optional] [default to undefined]

## Example

```typescript
import { AgregarValorParametroDto } from './api';

const instance: AgregarValorParametroDto = {
    version,
    valor,
    vigenteDesde,
    motivo,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
