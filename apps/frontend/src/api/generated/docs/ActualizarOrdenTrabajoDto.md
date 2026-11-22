# ActualizarOrdenTrabajoDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**descripcion** | **string** | Alcance del trabajo. Por defecto, la descripción de la cotización. | [optional] [default to undefined]
**fechaInicio** | **string** |  | [optional] [default to undefined]
**fechaTermino** | **string** |  | [optional] [default to undefined]
**hitos** | [**Array&lt;DatosHitoDto&gt;**](DatosHitoDto.md) | Hitos en orden. Reemplazan a los actuales. En borrador pueden sumar menos de 100 %; para enviar a revisión deben sumar 100 %. | [optional] [default to undefined]
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]

## Example

```typescript
import { ActualizarOrdenTrabajoDto } from './api';

const instance: ActualizarOrdenTrabajoDto = {
    descripcion,
    fechaInicio,
    fechaTermino,
    hitos,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
