export enum TipoCuentaBancaria {
  Corriente = 'corriente',
  Vista = 'vista',
  Ahorro = 'ahorro',
}

export const CAMPOS_ORDEN_PROVEEDORES = [
  'razonSocial',
  'rut',
  'creadoEn',
] as const;
