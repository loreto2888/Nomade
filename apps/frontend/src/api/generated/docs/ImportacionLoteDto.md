# ImportacionLoteDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**tipo** | [**TipoImportacion**](TipoImportacion.md) |  | [default to undefined]
**estado** | [**EstadoImportacion**](EstadoImportacion.md) |  | [default to undefined]
**obra** | [**ObraImportacionDto**](ObraImportacionDto.md) | Obra de destino. | [default to undefined]
**nombreArchivo** | **string** |  | [default to undefined]
**tamanioBytes** | **number** | Tamaño del archivo en bytes. | [default to undefined]
**totalFilas** | **number** |  | [default to undefined]
**filasValidas** | **number** |  | [default to undefined]
**filasConError** | **number** | Con errores: mientras haya alguna no se puede confirmar. | [default to undefined]
**montoTotal** | **number** | Suma de las filas válidas en la moneda de la obra. | [default to undefined]
**moneda** | [**MonedaContrato**](MonedaContrato.md) |  | [default to undefined]
**presupuestoVersionId** | **number** | Versión de presupuesto creada al confirmar. | [default to undefined]
**confirmadoEn** | **string** |  | [default to undefined]
**creadoPor** | [**UsuarioResumenDto**](UsuarioResumenDto.md) |  | [default to undefined]
**creadoEn** | **string** |  | [default to undefined]
**version** | **number** | Versión para control optimista. | [default to undefined]

## Example

```typescript
import { ImportacionLoteDto } from './api';

const instance: ImportacionLoteDto = {
    id,
    tipo,
    estado,
    obra,
    nombreArchivo,
    tamanioBytes,
    totalFilas,
    filasValidas,
    filasConError,
    montoTotal,
    moneda,
    presupuestoVersionId,
    confirmadoEn,
    creadoPor,
    creadoEn,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
