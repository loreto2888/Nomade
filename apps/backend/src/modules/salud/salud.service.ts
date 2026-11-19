import { Injectable } from '@nestjs/common';
import { VERSION_APP } from '../../config/version.js';
import { ConexionBaseDatos } from '../../database/conexion-base-datos.js';
import { EstadoSalud, SaludDto } from './salud.dto.js';

@Injectable()
export class SaludService {
  constructor(private readonly conexion: ConexionBaseDatos) {}

  async obtenerSalud(): Promise<SaludDto> {
    const baseDatosOk = await this.conexion.verificar();
    const estado = baseDatosOk ? EstadoSalud.Ok : EstadoSalud.Error;
    return {
      estado,
      baseDatos: estado,
      version: VERSION_APP,
      fecha: new Date().toISOString(),
    };
  }
}
