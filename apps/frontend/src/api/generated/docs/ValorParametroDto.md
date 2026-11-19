# ValorParametroDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**valor** | **string** | Valor en texto (los numéricos sin ceros sobrantes). | [default to undefined]
**valorNumerico** | **number** | Valor numérico; &#x60;null&#x60; en parámetros de texto. | [default to undefined]
**vigenteDesde** | **string** | Primer día de vigencia (AAAA-MM-DD). | [default to undefined]
**vigenteHasta** | **string** | Último día de vigencia; &#x60;null&#x60; si es la versión más reciente. | [default to undefined]
**motivo** | **string** |  | [default to undefined]
**creadoEn** | **string** |  | [default to undefined]
**creadoPor** | **number** |  | [default to undefined]

## Example

```typescript
import { ValorParametroDto } from './api';

const instance: ValorParametroDto = {
    id,
    valor,
    valorNumerico,
    vigenteDesde,
    vigenteHasta,
    motivo,
    creadoEn,
    creadoPor,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
