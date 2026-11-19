import { Column, Entity } from 'typeorm';
import { EntidadMaestroEliminable } from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { EntidadContraparte } from '../../common/maestros/contraparte.entity.js';
import { TipoCuentaBancaria } from './proveedores.tipos.js';

@Entity({ name: 'proveedor', schema: 'nomade' })
export class Proveedor extends EntidadContraparte {}

/** Datos bancarios sensibles: solo el admin los consulta y modifica (D-17). */
@Entity({ name: 'proveedor_cuenta_bancaria', schema: 'nomade' })
export class CuentaBancariaProveedor extends EntidadMaestroEliminable {
  @Column({ name: 'proveedor_id', type: 'bigint', transformer: bigintANumero })
  proveedorId: number;

  @Column({ type: 'text' })
  banco: string;

  @Column({ name: 'tipo_cuenta', type: 'text' })
  tipoCuenta: TipoCuentaBancaria;

  @Column({ name: 'numero_cuenta', type: 'text' })
  numeroCuenta: string;

  @Column({ type: 'text' })
  titular: string;

  @Column({ name: 'titular_rut', type: 'text' })
  titularRut: string;

  @Column({ name: 'correo_notificacion', type: 'text', nullable: true })
  correoNotificacion: string | null;

  @Column({ type: 'boolean', default: false })
  principal: boolean;
}
