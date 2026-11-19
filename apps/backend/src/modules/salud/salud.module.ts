import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { SaludController } from './salud.controller.js';
import { SaludService } from './salud.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SaludController],
  providers: [SaludService],
})
export class SaludModule {}
