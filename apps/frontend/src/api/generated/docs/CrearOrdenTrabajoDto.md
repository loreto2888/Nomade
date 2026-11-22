# CrearOrdenTrabajoDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**descripcion** | **string** | Alcance del trabajo. Por defecto, la descripción de la cotización. | [optional] [default to undefined]
**fechaInicio** | **string** |  | [optional] [default to undefined]
**fechaTermino** | **string** |  | [optional] [default to undefined]
**hitos** | [**Array&lt;DatosHitoDto&gt;**](DatosHitoDto.md) | Hitos en orden. Reemplazan a los actuales. En borrador pueden sumar menos de 100 %; para enviar a revisión deben sumar 100 %. | [optional] [default to undefined]
**cotizacionId** | **number** | Cotización aprobada (sin otra OT vigente) de la que nace la OT. | [default to undefined]

## Example

```typescript
import { CrearOrdenTrabajoDto } from './api';

const instance: CrearOrdenTrabajoDto = {
    descripcion,
    fechaInicio,
    fechaTermino,
    hitos,
    cotizacionId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
