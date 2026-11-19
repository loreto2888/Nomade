# ComparacionPresupuestoDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**base** | [**PresupuestoVersionDto**](PresupuestoVersionDto.md) | Versión base (por defecto, la vigente). | [default to undefined]
**nueva** | [**PresupuestoVersionDto**](PresupuestoVersionDto.md) | Versión comparada. | [default to undefined]
**filas** | [**Array&lt;PartidaComparadaDto&gt;**](PartidaComparadaDto.md) |  | [default to undefined]
**totalBaseClp** | **number** |  | [default to undefined]
**totalNuevoClp** | **number** |  | [default to undefined]
**diferenciaClp** | **number** |  | [default to undefined]
**nuevas** | **number** |  | [default to undefined]
**eliminadas** | **number** |  | [default to undefined]
**modificadas** | **number** |  | [default to undefined]
**sinCambios** | **number** |  | [default to undefined]

## Example

```typescript
import { ComparacionPresupuestoDto } from './api';

const instance: ComparacionPresupuestoDto = {
    base,
    nueva,
    filas,
    totalBaseClp,
    totalNuevoClp,
    diferenciaClp,
    nuevas,
    eliminadas,
    modificadas,
    sinCambios,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
