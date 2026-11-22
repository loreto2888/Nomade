# OrdenTrabajoDto


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
**cotizacion** | [**DocumentoReferenciaDto**](DocumentoReferenciaDto.md) |  | [default to undefined]
**montoNeto** | **number** | Monto contratado (CLP neto). | [default to undefined]
**fechaInicio** | **string** |  | [default to undefined]
**fechaTermino** | **string** |  | [default to undefined]
**hitos** | [**Array&lt;HitoDto&gt;**](HitoDto.md) |  | [default to undefined]
**montoOrdenado** | **number** | Monto de las OC parciales vigentes (borrador, en revisión, aprobadas o recibidas). | [default to undefined]
**porcentajeOrdenado** | **number** |  | [default to undefined]
**saldo** | **number** | Saldo de la OT: monto contratado − monto ordenado. | [default to undefined]
**anuladoEn** | **string** |  | [default to undefined]
**anuladoPor** | [**UsuarioResumenDto**](UsuarioResumenDto.md) |  | [default to undefined]
**motivoAnulacion** | **string** |  | [default to undefined]

## Example

```typescript
import { OrdenTrabajoDto } from './api';

const instance: OrdenTrabajoDto = {
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
    cotizacion,
    montoNeto,
    fechaInicio,
    fechaTermino,
    hitos,
    montoOrdenado,
    porcentajeOrdenado,
    saldo,
    anuladoEn,
    anuladoPor,
    motivoAnulacion,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
