# HitoDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**numero** | **number** | Posición del hito en la OT. | [default to undefined]
**descripcion** | **string** |  | [default to undefined]
**porcentaje** | **number** | Porcentaje del monto de la OT. | [default to undefined]
**montoNeto** | **number** | Monto neto del hito (CLP). | [default to undefined]
**fechaEstimada** | **string** |  | [default to undefined]
**porcentajeOrdenado** | **number** | Porcentaje ya ordenado con OC parciales vigentes. | [default to undefined]
**montoOrdenado** | **number** |  | [default to undefined]
**porcentajeDisponible** | **number** | Porcentaje que aún se puede ordenar. | [default to undefined]
**montoDisponible** | **number** |  | [default to undefined]

## Example

```typescript
import { HitoDto } from './api';

const instance: HitoDto = {
    id,
    numero,
    descripcion,
    porcentaje,
    montoNeto,
    fechaEstimada,
    porcentajeOrdenado,
    montoOrdenado,
    porcentajeDisponible,
    montoDisponible,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
