# SaludDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**estado** | [**EstadoSalud**](EstadoSalud.md) | Estado general del servicio. | [default to undefined]
**baseDatos** | [**EstadoSalud**](EstadoSalud.md) | Estado de la conexión a PostgreSQL. | [default to undefined]
**version** | **string** | Versión del backend (package.json). | [default to undefined]
**fecha** | **string** | Fecha y hora del servidor (ISO 8601). | [default to undefined]

## Example

```typescript
import { SaludDto } from './api';

const instance: SaludDto = {
    estado,
    baseDatos,
    version,
    fecha,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
