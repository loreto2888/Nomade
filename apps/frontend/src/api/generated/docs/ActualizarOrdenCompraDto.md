# ActualizarOrdenCompraDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**categoriaGastoId** | **number** | Categoría de gasto. Por defecto: «Materiales» o la de la OT. | [optional] [default to undefined]
**fecha** | **string** | Por defecto, hoy. | [optional] [default to undefined]
**fechaEntrega** | **string** |  | [optional] [default to undefined]
**descripcion** | **string** |  | [optional] [default to undefined]
**afectaIva** | **boolean** | false &#x3D; OC exenta de IVA. | [optional] [default to true]
**lineas** | [**Array&lt;DatosLineaDto&gt;**](DatosLineaDto.md) | OC de materiales: líneas en orden (reemplazan a las actuales). | [optional] [default to undefined]
**porcentaje** | **number** | OC parcial: porcentaje del monto de la OT (hasta 2 decimales). | [optional] [default to undefined]
**proveedorId** | **number** | OC de materiales: proveedor. | [optional] [default to undefined]
**hitoId** | **number** | OC parcial: hito de la misma OT. | [optional] [default to undefined]
**version** | **number** | Versión que el cliente tiene cargada (409 si no coincide). | [default to undefined]

## Example

```typescript
import { ActualizarOrdenCompraDto } from './api';

const instance: ActualizarOrdenCompraDto = {
    categoriaGastoId,
    fecha,
    fechaEntrega,
    descripcion,
    afectaIva,
    lineas,
    porcentaje,
    proveedorId,
    hitoId,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
