# ResumenCompromisosDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**obraId** | **number** |  | [default to undefined]
**totalClp** | **number** | Compromisos vigentes de la obra (OC aprobadas o recibidas, neto de anulaciones), CLP neto. | [default to undefined]
**porCategoria** | [**Array&lt;CompromisoCategoriaDto&gt;**](CompromisoCategoriaDto.md) |  | [default to undefined]

## Example

```typescript
import { ResumenCompromisosDto } from './api';

const instance: ResumenCompromisosDto = {
    obraId,
    totalClp,
    porCategoria,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
