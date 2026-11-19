# ResumenObraDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**obra** | [**ObraDto**](ObraDto.md) |  | [default to undefined]
**cantidadAdjuntos** | **number** | Adjuntos vigentes de la obra. | [default to undefined]
**valorUfHoy** | [**ValorUfDto**](ValorUfDto.md) | Valor de la UF aplicable hoy; &#x60;null&#x60; si no hay valores cargados. | [default to undefined]
**montoContratoClpHoy** | **number** | Monto del contrato en CLP al valor de la UF de hoy (solo contratos en UF). | [default to undefined]

## Example

```typescript
import { ResumenObraDto } from './api';

const instance: ResumenObraDto = {
    obra,
    cantidadAdjuntos,
    valorUfHoy,
    montoContratoClpHoy,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
