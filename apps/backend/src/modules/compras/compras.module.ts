import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reloj } from '../../common/tiempo/reloj.js';
import { CatalogosModule } from '../catalogos/catalogos.module.js';
import { MovimientosModule } from '../movimientos/movimientos.module.js';
import { ObrasModule } from '../obras/obras.module.js';
import { ParametrosModule } from '../parametros/parametros.module.js';
import { ProveedoresModule } from '../proveedores/proveedores.module.js';
import { ComprasRepositorio } from './compras.repositorio.js';
import { ContextoCompras } from './contexto-compras.js';
import { Cotizacion } from './cotizacion.entity.js';
import { CotizacionesController } from './cotizaciones.controller.js';
import { CotizacionesService } from './cotizaciones.service.js';
import { OrdenCompra, OrdenCompraLinea } from './orden-compra.entity.js';
import { OrdenTrabajo, OrdenTrabajoHito } from './orden-trabajo.entity.js';
import { OrdenesCompraController } from './ordenes-compra.controller.js';
import { OrdenesCompraService } from './ordenes-compra.service.js';
import { OrdenesTrabajoController } from './ordenes-trabajo.controller.js';
import { OrdenesTrabajoService } from './ordenes-trabajo.service.js';

/** Fase 4 — Compras núcleo: cotizaciones, OT con hitos y OC (P10, P11, P30 bandeja). */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cotizacion,
      OrdenTrabajo,
      OrdenTrabajoHito,
      OrdenCompra,
      OrdenCompraLinea,
    ]),
    ObrasModule,
    ProveedoresModule,
    CatalogosModule,
    ParametrosModule,
    MovimientosModule,
  ],
  controllers: [
    CotizacionesController,
    OrdenesTrabajoController,
    OrdenesCompraController,
  ],
  providers: [
    ComprasRepositorio,
    ContextoCompras,
    CotizacionesService,
    OrdenesTrabajoService,
    OrdenesCompraService,
    Reloj,
  ],
})
export class ComprasModule {}
