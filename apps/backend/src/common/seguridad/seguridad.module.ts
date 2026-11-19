import { Global, Module } from '@nestjs/common';
import { HashClaveService } from './hash-clave.service.js';

@Global()
@Module({
  providers: [HashClaveService],
  exports: [HashClaveService],
})
export class SeguridadModule {}
