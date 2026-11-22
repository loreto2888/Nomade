# OrdenCompraDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**numero** | **number** | Correlativo global por tipo de documento. | [default to undefined]
**folio** | **string** | Folio visible. | [default to undefined]
**obra** | [**ObraReferenciaDto**](ObraReferenciaDto.md) |  | [default to undefined]
**proveedor** | [**ProveedorReferenciaDto**](ProveedorReferenciaDto.md) |  | [default to undefined]
**categoria** | [**CategoriaGastoResumenDto**](CategoriaGastoResumenDto.md) |  | [default to undefined]
**descripcion** | **string** |  | [default to undefined]
**estado** | [**EstadoDocumentoCompra**](EstadoDocumentoCompra.md) |  | [default to undefined]
**creadoPor** | [**UsuarioResumenDto**](UsuarioResumenDto.md) |  | [default to undefined]
**creadoEn** | **string** |  | [default to undefined]
**actualizadoEn** | **string** |  | [default to undefined]
**enviadoEn** | **string** |  | [default to undefined]
**enviadoPor** | [**UsuarioResumenDto**](UsuarioResumenDto.md) |  | [default to undefined]
**resueltoEn** | **string** | Cuándo se aprobó o rechazó. | [default to undefined]
**resueltoPor** | [**UsuarioResumenDto**](UsuarioResumenDto.md) |  | [default to undefined]
**motivoResolucion** | **string** | Motivo del rechazo (o comentario de la aprobación). | [default to undefined]
**version** | **number** | Versión para control optimista. | [default to undefined]
**tipo** | [**TipoOrdenCompra**](TipoOrdenCompra.md) |  | [default to undefined]
**ordenTrabajo** | [**DocumentoReferenciaDto**](DocumentoReferenciaDto.md) |  | [default to undefined]
**hito** | [**HitoReferenciaDto**](HitoReferenciaDto.md) |  | [default to undefined]
**porcentaje** | **number** | OC parcial: porcentaje del monto de la OT. | [default to undefined]
**fecha** | **string** |  | [default to undefined]
**fechaEntrega** | **string** |  | [default to undefined]
**afectaIva** | **boolean** |  | [default to undefined]
**tasaIva** | **number** | Tasa de IVA vigente a la fecha de la OC. | [default to undefined]
**montoNeto** | **number** |  | [default to undefined]
**montoIva** | **number** |  | [default to undefined]
**montoTotal** | **number** |  | [default to undefined]
**lineas** | [**Array&lt;LineaOrdenCompraDto&gt;**](LineaOrdenCompraDto.md) |  | [default to undefined]
**recibidoEn** | **string** |  | [default to undefined]
**recibidoPor** | [**UsuarioResumenDto**](UsuarioResumenDto.md) |  | [default to undefined]
**fechaRecepcion** | **string** |  | [default to undefined]
**observacionRecepcion** | **string** |  | [default to undefined]
**anuladoEn** | **string** |  | [default to undefined]
**anuladoPor** | [**UsuarioResumenDto**](UsuarioResumenDto.md) |  | [default to undefined]
**motivoAnulacion** | **string** |  | [default to undefined]

## Example

```typescript
import { OrdenCompraDto } from './api';

const instance: OrdenCompraDto = {
    id,
    numero,
    folio,
    obra,
    proveedor,
    categoria,
    descripcion,
    estado,
    creadoPor,
    creadoEn,
    actualizadoEn,
    enviadoEn,
    enviadoPor,
    resueltoEn,
    resueltoPor,
    motivoResolucion,
    version,
    tipo,
    ordenTrabajo,
    hito,
    porcentaje,
    fecha,
    fechaEntrega,
    afectaIva,
    tasaIva,
    montoNeto,
    montoIva,
    montoTotal,
    lineas,
    recibidoEn,
    recibidoPor,
    fechaRecepcion,
    observacionRecepcion,
    anuladoEn,
    anuladoPor,
    motivoAnulacion,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
