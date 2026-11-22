# CotizacionDto


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
**referenciaProveedor** | **string** | Número o referencia que usa el proveedor. | [default to undefined]
**fecha** | **string** |  | [default to undefined]
**validezHasta** | **string** |  | [default to undefined]
**montoNeto** | **number** | Monto neto en CLP. | [default to undefined]
**ordenTrabajo** | [**DocumentoReferenciaDto**](DocumentoReferenciaDto.md) | OT vigente creada desde esta cotización (no rechazada ni anulada). | [default to undefined]

## Example

```typescript
import { CotizacionDto } from './api';

const instance: CotizacionDto = {
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
    referenciaProveedor,
    fecha,
    validezHasta,
    montoNeto,
    ordenTrabajo,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
