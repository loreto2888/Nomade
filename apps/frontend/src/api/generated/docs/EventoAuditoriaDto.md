# EventoAuditoriaDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**ocurridoEn** | **string** |  | [default to undefined]
**usuarioId** | **number** | Actor; vacío si el evento no tiene sesión (p. ej. intento de ingreso fallido). | [default to undefined]
**usuarioCorreo** | **string** |  | [default to undefined]
**usuarioNombre** | **string** |  | [default to undefined]
**accion** | **string** | Acción en formato &#x60;entidad.verbo&#x60;. | [default to undefined]
**entidad** | **string** |  | [default to undefined]
**entidadId** | **string** |  | [default to undefined]
**antes** | **{ [key: string]: any; }** | Valores relevantes antes del cambio (sin datos sensibles). | [default to undefined]
**despues** | **{ [key: string]: any; }** | Valores relevantes después del cambio (sin datos sensibles). | [default to undefined]
**motivo** | **string** |  | [default to undefined]
**ip** | **string** |  | [default to undefined]
**idCorrelacion** | **string** | Id de correlación del request (&#x60;x-request-id&#x60;). | [default to undefined]

## Example

```typescript
import { EventoAuditoriaDto } from './api';

const instance: EventoAuditoriaDto = {
    id,
    ocurridoEn,
    usuarioId,
    usuarioCorreo,
    usuarioNombre,
    accion,
    entidad,
    entidadId,
    antes,
    despues,
    motivo,
    ip,
    idCorrelacion,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
