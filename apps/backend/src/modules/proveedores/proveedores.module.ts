import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentasBancariasController } from './cuentas-bancarias.controller.js';
import { CuentasBancariasService } from './cuentas-bancarias.service.js';
import { CuentaBancariaProveedor, Proveedor } from './proveedor.entity.js';
import { ProveedoresController } from './proveedores.controller.js';
import {
  CuentasBancariasRepositorio,
  ProveedoresRepositorio,
} from './proveedores.repositorio.js';
import { ProveedoresService } from './proveedores.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Proveedor, CuentaBancariaProveedor])],
  controllers: [ProveedoresController, CuentasBancariasController],
  providers: [
    ProveedoresRepositorio,
    CuentasBancariasRepositorio,
    ProveedoresService,
    CuentasBancariasService,
  ],
  exports: [ProveedoresRepositorio],
})
export class ProveedoresModule {}
