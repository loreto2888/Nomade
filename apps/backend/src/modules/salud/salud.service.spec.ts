import { describe, expect, it, vi } from 'vitest';
import type { ConexionBaseDatos } from '../../database/conexion-base-datos.js';
import { VERSION_APP } from '../../config/version.js';
import { EstadoSalud } from './salud.dto.js';
import { SaludService } from './salud.service.js';

function crearServicio(bdOk: boolean) {
  const conexion = { verificar: vi.fn().mockResolvedValue(bdOk) };
  return {
    conexion,
    servicio: new SaludService(conexion as unknown as ConexionBaseDatos),
  };
}

describe('SaludService', () => {
  it('informa ok cuando la base de datos responde', async () => {
    const { servicio, conexion } = crearServicio(true);
    const salud = await servicio.obtenerSalud();

    expect(conexion.verificar).toHaveBeenCalledOnce();
    expect(salud).toMatchObject({
      estado: EstadoSalud.Ok,
      baseDatos: EstadoSalud.Ok,
      version: VERSION_APP,
    });
    expect(new Date(salud.fecha).toISOString()).toBe(salud.fecha);
  });

  it('informa error cuando la base de datos no responde', async () => {
    const { servicio } = crearServicio(false);
    const salud = await servicio.obtenerSalud();

    expect(salud.estado).toBe(EstadoSalud.Error);
    expect(salud.baseDatos).toBe(EstadoSalud.Error);
  });

  it('lee la versión del package.json', () => {
    expect(VERSION_APP).toMatch(/^\d+\.\d+\.\d+/);
  });
});
