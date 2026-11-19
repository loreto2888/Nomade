export enum MonedaContrato {
  Clp = 'CLP',
  Uf = 'UF',
}

export const CAMPOS_ORDEN_OBRAS = [
  'codigoCentroCosto',
  'nombre',
  'cliente',
  'estado',
  'fechaInicio',
  'creadoEn',
] as const;

export type CampoOrdenObras = (typeof CAMPOS_ORDEN_OBRAS)[number];
