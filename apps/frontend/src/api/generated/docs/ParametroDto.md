# ParametroDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**codigo** | **string** |  | [default to undefined]
**nombre** | **string** |  | [default to undefined]
**descripcion** | **string** |  | [default to undefined]
**categoria** | **string** |  | [default to undefined]
**tipoValor** | [**TipoValorParametro**](TipoValorParametro.md) |  | [default to undefined]
**unidad** | **string** |  | [default to undefined]
**valorVigente** | [**ValorParametroDto**](ValorParametroDto.md) | Versión que rige hoy (hora de Chile). | [default to undefined]
**proximoValor** | [**ValorParametroDto**](ValorParametroDto.md) | Versión programada para entrar en vigencia más adelante, si existe. | [default to undefined]
**version** | **number** | Versión para control optimista: sube con cada valor agregado o eliminado. | [default to undefined]

## Example

```typescript
import { ParametroDto } from './api';

const instance: ParametroDto = {
    id,
    codigo,
    nombre,
    descripcion,
    categoria,
    tipoValor,
    unidad,
    valorVigente,
    proximoValor,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
