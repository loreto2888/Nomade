# MovimientoDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**fecha** | **string** | Fecha contable. | [default to undefined]
**tipo** | [**TipoMovimiento**](TipoMovimiento.md) |  | [default to undefined]
**origenTipo** | [**OrigenMovimiento**](OrigenMovimiento.md) |  | [default to undefined]
**origenId** | **number** |  | [default to undefined]
**montoClp** | **number** | CLP con signo: las reversas son negativas. | [default to undefined]
**reversaDeId** | **number** | Movimiento que esta reversa anula. | [default to undefined]
**descripcion** | **string** |  | [default to undefined]
**creadoEn** | **string** |  | [default to undefined]

## Example

```typescript
import { MovimientoDto } from './api';

const instance: MovimientoDto = {
    id,
    fecha,
    tipo,
    origenTipo,
    origenId,
    montoClp,
    reversaDeId,
    descripcion,
    creadoEn,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
