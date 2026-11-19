import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { EstadoSalud, type SaludDto } from './salud.dto.js';
import { SaludController } from './salud.controller.js';
import { SaludService } from './salud.service.js';

async function crearControlador(salud: SaludDto) {
  const modulo = await Test.createTestingModule({
    controllers: [SaludController],
    providers: [
      {
        provide: SaludService,
        useValue: { obtenerSalud: vi.fn().mockResolvedValue(salud) },
      },
    ],
  }).compile();
  const res = { status: vi.fn(), setHeader: vi.fn() };
  return {
    controlador: modulo.get(SaludController),
    res,
    resExpress: res as unknown as Response,
  };
}

const base = { version: '0.1.0', fecha: '2026-11-18T12:00:00.000Z' };

describe('SaludController', () => {
  it('responde 200 si todo está ok', async () => {
    const salud = {
      ...base,
      estado: EstadoSalud.Ok,
      baseDatos: EstadoSalud.Ok,
    };
    const { controlador, res, resExpress } = await crearControlador(salud);

    await expect(controlador.obtenerSalud(resExpress)).resolves.toEqual(salud);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('responde 503 si la base de datos falla', async () => {
    const salud = {
      ...base,
      estado: EstadoSalud.Error,
      baseDatos: EstadoSalud.Error,
    };
    const { controlador, res, resExpress } = await crearControlador(salud);

    await expect(controlador.obtenerSalud(resExpress)).resolves.toEqual(salud);
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
