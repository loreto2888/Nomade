# ActualizarObraDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**codigoCentroCosto** | **string** | Centro de costo único: letras mayúsculas, dígitos, punto, guion o guion bajo (2 a 20 caracteres). | [optional] [default to undefined]
**nombre** | **string** |  | [optional] [default to undefined]
**clienteId** | **number** | Cliente vigente (mandante). | [optional] [default to undefined]
**estadoId** | **number** | Estado de obra (catálogo &#x60;estado_obra&#x60;). Por defecto, \&quot;en preparación\&quot;. | [optional] [default to undefined]
**responsable** | **string** |  | [optional] [default to undefined]
**direccion** | **string** |  | [optional] [default to undefined]
**fechaInicio** | **string** |  | [optional] [default to undefined]
**fechaTermino** | **string** |  | [optional] [default to undefined]
**monedaContrato** | [**MonedaContrato**](MonedaContrato.md) | Moneda en la que está pactado el contrato. | [optional] [default to undefined]
**montoContrato** | **number** | Monto del contrato en &#x60;monedaContrato&#x60;. CLP: enteros; UF: hasta 4 decimales. | [optional] [default to undefined]
**fechaConversionUf** | **string** | Solo contratos en UF: fecha cuyo valor de UF se usa para el equivalente en CLP (por defecto, hoy). | [optional] [default to undefined]
**observaciones** | **string** |  | [optional] [default to undefined]
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]

## Example

```typescript
import { ActualizarObraDto } from './api';

const instance: ActualizarObraDto = {
    codigoCentroCosto,
    nombre,
    clienteId,
    estadoId,
    responsable,
    direccion,
    fechaInicio,
    fechaTermino,
    monedaContrato,
    montoContrato,
    fechaConversionUf,
    observaciones,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
