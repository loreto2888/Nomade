# PresupuestoVersionDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**obraId** | **number** |  | [default to undefined]
**numero** | **number** | Correlativo de la versión en la obra. | [default to undefined]
**estado** | [**EstadoPresupuesto**](EstadoPresupuesto.md) |  | [default to undefined]
**vigente** | **boolean** | Única versión aprobada que rige la obra. Una aprobada que ya no es vigente fue reemplazada por otra. | [default to undefined]
**descripcion** | **string** |  | [default to undefined]
**moneda** | [**MonedaContrato**](MonedaContrato.md) | Moneda de los precios y totales de las partidas. | [default to undefined]
**valorUf** | **number** | Versiones en UF: valor de la UF con que se convierte a CLP. | [default to undefined]
**fechaValorUf** | **string** | Fecha del valor de la UF. | [default to undefined]
**total** | **number** | Total en la moneda de la versión. | [default to undefined]
**totalClp** | **number** | Total en pesos (CLP). | [default to undefined]
**cantidadPartidas** | **number** |  | [default to undefined]
**copiadaDeId** | **number** | Versión desde la que se copió. | [default to undefined]
**copiadaDeNumero** | **number** | Número de la versión desde la que se copió. | [default to undefined]
**importacionLoteId** | **number** | Lote de importación del que nació. | [default to undefined]
**creadoPor** | [**UsuarioResumenDto**](UsuarioResumenDto.md) |  | [default to undefined]
**creadoEn** | **string** |  | [default to undefined]
**actualizadoEn** | **string** |  | [default to undefined]
**enviadoEn** | **string** |  | [default to undefined]
**enviadoPor** | [**UsuarioResumenDto**](UsuarioResumenDto.md) |  | [default to undefined]
**resueltoEn** | **string** | Cuándo se aprobó o rechazó. | [default to undefined]
**resueltoPor** | [**UsuarioResumenDto**](UsuarioResumenDto.md) | Quién aprobó o rechazó. | [default to undefined]
**motivoResolucion** | **string** | Motivo del rechazo (o comentario de la aprobación). | [default to undefined]
**version** | **number** | Versión para control optimista. | [default to undefined]

## Example

```typescript
import { PresupuestoVersionDto } from './api';

const instance: PresupuestoVersionDto = {
    id,
    obraId,
    numero,
    estado,
    vigente,
    descripcion,
    moneda,
    valorUf,
    fechaValorUf,
    total,
    totalClp,
    cantidadPartidas,
    copiadaDeId,
    copiadaDeNumero,
    importacionLoteId,
    creadoPor,
    creadoEn,
    actualizadoEn,
    enviadoEn,
    enviadoPor,
    resueltoEn,
    resueltoPor,
    motivoResolucion,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
