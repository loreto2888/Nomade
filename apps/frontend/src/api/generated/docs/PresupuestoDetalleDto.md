# PresupuestoDetalleDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**version** | [**PresupuestoVersionDto**](PresupuestoVersionDto.md) |  | [default to undefined]
**partidas** | [**Array&lt;PartidaDto&gt;**](PartidaDto.md) |  | [default to undefined]
**totalesPorFamilia** | [**Array&lt;TotalFamiliaDto&gt;**](TotalFamiliaDto.md) | Totales por familia, en el orden del catálogo. | [default to undefined]

## Example

```typescript
import { PresupuestoDetalleDto } from './api';

const instance: PresupuestoDetalleDto = {
    version,
    partidas,
    totalesPorFamilia,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
