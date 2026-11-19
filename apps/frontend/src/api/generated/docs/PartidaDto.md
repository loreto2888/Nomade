# PartidaDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**versionId** | **number** |  | [default to undefined]
**orden** | **number** | Posición dentro de la versión. | [default to undefined]
**codigo** | **string** | Código (la jerarquía se expresa con puntos). | [default to undefined]
**familia** | [**FamiliaResumenDto**](FamiliaResumenDto.md) |  | [default to undefined]
**descripcion** | **string** |  | [default to undefined]
**unidad** | **string** |  | [default to undefined]
**cantidad** | **number** |  | [default to undefined]
**precioUnitario** | **number** | En la moneda de la versión. | [default to undefined]
**total** | **number** | Cantidad × precio, en la moneda de la versión. | [default to undefined]
**totalClp** | **number** | Total en pesos (CLP). | [default to undefined]
**version** | **number** | Versión para control optimista. | [default to undefined]

## Example

```typescript
import { PartidaDto } from './api';

const instance: PartidaDto = {
    id,
    versionId,
    orden,
    codigo,
    familia,
    descripcion,
    unidad,
    cantidad,
    precioUnitario,
    total,
    totalClp,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
