import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sesion } from './sesion.entity.js';
import {
  INACTIVIDAD_MAXIMA_MS,
  calcularExpiracion,
} from './politica-sesion.js';
import { SesionesService, hashearToken } from './sesiones.service.js';

const ahora = new Date('2026-11-19T08:00:00.000Z');

function crearServicio() {
  const filas: Sesion[] = [];
  const repo = {
    create: vi.fn((datos: Partial<Sesion>) => ({ ...datos }) as Sesion),
    save: vi.fn((s: Sesion) => {
      s.id = filas.length + 1;
      filas.push(s);
      return Promise.resolve(s);
    }),
    findOne: vi.fn(({ where }: { where: { tokenHash: string } }) =>
      Promise.resolve(
        filas.find((s) => s.tokenHash === where.tokenHash) ?? null,
      ),
    ),
    update: vi.fn(() => Promise.resolve()),
  };
  const servicio = new SesionesService(repo as unknown as Repository<Sesion>);
  return { servicio, repo, filas };
}

describe('SesionesService', () => {
  let ctx: ReturnType<typeof crearServicio>;
  beforeEach(() => {
    ctx = crearServicio();
  });

  it('crea la sesión guardando solo el hash SHA-256 del token opaco', async () => {
    const { token, sesion } = await ctx.servicio.crear(
      5,
      { ip: '1.2.3.4', agenteUsuario: 'UA' },
      ahora,
    );
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sesion.tokenHash).toBe(hashearToken(token));
    expect(sesion.tokenHash).not.toContain(token);
    expect(sesion.expiraEn).toEqual(calcularExpiracion(ahora));
    expect(sesion.usuarioId).toBe(5);
  });

  it('los tokens son únicos', async () => {
    const a = await ctx.servicio.crear(
      1,
      { ip: null, agenteUsuario: null },
      ahora,
    );
    const b = await ctx.servicio.crear(
      1,
      { ip: null, agenteUsuario: null },
      ahora,
    );
    expect(a.token).not.toBe(b.token);
  });

  it('valida una sesión vigente y registra la actividad pasado el intervalo', async () => {
    const { token } = await ctx.servicio.crear(
      5,
      { ip: null, agenteUsuario: null },
      ahora,
    );
    const mas = new Date(ahora.getTime() + 5 * 60_000);
    const res = await ctx.servicio.validar(token, mas);
    expect(res.estado).toBe('valida');
    expect(ctx.repo.update).toHaveBeenCalledWith(expect.anything(), {
      ultimaActividadEn: mas,
    });
  });

  it('no escribe en cada request (dentro del intervalo)', async () => {
    const { token } = await ctx.servicio.crear(
      5,
      { ip: null, agenteUsuario: null },
      ahora,
    );
    await ctx.servicio.validar(token, new Date(ahora.getTime() + 10_000));
    expect(ctx.repo.update).not.toHaveBeenCalled();
  });

  it('token desconocido → inexistente', async () => {
    expect((await ctx.servicio.validar('no-existe', ahora)).estado).toBe(
      'inexistente',
    );
  });

  it('expira por inactividad (30 min)', async () => {
    const { token } = await ctx.servicio.crear(
      5,
      { ip: null, agenteUsuario: null },
      ahora,
    );
    const res = await ctx.servicio.validar(
      token,
      new Date(ahora.getTime() + INACTIVIDAD_MAXIMA_MS),
    );
    expect(res.estado).toBe('inactiva');
    expect(ctx.repo.update).not.toHaveBeenCalled();
  });

  it('expira a las 8 h', async () => {
    const { token, sesion } = await ctx.servicio.crear(
      5,
      { ip: null, agenteUsuario: null },
      ahora,
    );
    sesion.ultimaActividadEn = new Date(sesion.expiraEn.getTime() - 1000);
    const res = await ctx.servicio.validar(token, sesion.expiraEn);
    expect(res.estado).toBe('expirada');
  });

  it('una sesión revocada se rechaza', async () => {
    const { token, sesion } = await ctx.servicio.crear(
      5,
      { ip: null, agenteUsuario: null },
      ahora,
    );
    sesion.revocadaEn = ahora;
    expect((await ctx.servicio.validar(token, ahora)).estado).toBe('revocada');
  });

  it('revoca por id y por usuario', async () => {
    await ctx.servicio.revocar(3, ahora);
    expect(ctx.repo.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 3 }),
      { revocadaEn: ahora },
    );
    await ctx.servicio.revocarDeUsuario(9, { ahora });
    expect(ctx.repo.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ usuarioId: 9 }),
      { revocadaEn: ahora },
    );
    await ctx.servicio.revocarDeUsuario(9, { excepto: 4, ahora });
    expect(ctx.repo.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ usuarioId: 9, id: expect.anything() }),
      { revocadaEn: ahora },
    );
  });
});
