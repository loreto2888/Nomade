# ErrorResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**codigo** | **string** | Código estable del error, en mayúsculas. | [default to undefined]
**mensaje** | **string** | Mensaje legible en español. | [default to undefined]
**detalles** | **Array&lt;any&gt;** | Información adicional (por ejemplo, errores por campo). | [optional] [default to undefined]

## Example

```typescript
import { ErrorResponse } from './api';

const instance: ErrorResponse = {
    codigo,
    mensaje,
    detalles,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
