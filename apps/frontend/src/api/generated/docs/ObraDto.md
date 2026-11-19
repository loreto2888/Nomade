# ObraDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**codigoCentroCosto** | **string** | Centro de costo (único entre las obras vigentes). | [default to undefined]
**nombre** | **string** |  | [default to undefined]
**cliente** | [**ClienteResumenDto**](ClienteResumenDto.md) |  | [default to undefined]
**estado** | [**EstadoObraDto**](EstadoObraDto.md) |  | [default to undefined]
**responsable** | **string** |  | [default to undefined]
**direccion** | **string** |  | [default to undefined]
**fechaInicio** | **string** |  | [default to undefined]
**fechaTermino** | **string** |  | [default to undefined]
**monedaContrato** | [**MonedaContrato**](MonedaContrato.md) |  | [default to undefined]
**montoContrato** | **number** | Monto del contrato en su moneda original (CLP enteros; UF hasta 4 decimales). | [default to undefined]
**montoContratoClp** | **number** | Equivalente en CLP. En contratos en UF es una fotografía con el valor de la UF de &#x60;fechaValorUf&#x60;. | [default to undefined]
**fechaValorUf** | **string** | Fecha del valor de la UF usado en la conversión. | [default to undefined]
**valorUf** | **number** | Valor de la UF usado en la conversión. | [default to undefined]
**observaciones** | **string** |  | [default to undefined]
**creadoEn** | **string** |  | [default to undefined]
**actualizadoEn** | **string** |  | [default to undefined]
**version** | **number** | Versión para control optimista. | [default to undefined]

## Example

```typescript
import { ObraDto } from './api';

const instance: ObraDto = {
    id,
    codigoCentroCosto,
    nombre,
    cliente,
    estado,
    responsable,
    direccion,
    fechaInicio,
    fechaTermino,
    monedaContrato,
    montoContrato,
    montoContratoClp,
    fechaValorUf,
    valorUf,
    observaciones,
    creadoEn,
    actualizadoEn,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
