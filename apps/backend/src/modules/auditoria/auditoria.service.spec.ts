import type { Repository, SelectQueryBuilder } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { AuditoriaEvento } from './auditoria-evento.entity.js';
import {
  AuditoriaService,
  construirConsulta,
  rangoFechas,
} from './auditoria.service.js';

function crearServicio() {
  const repo = {
    insert: vi.fn(() => Promise.resolve()),
    createQueryBuilder: vi.fn(),
  };
  return {
    servicio: new AuditoriaService(
      repo as unknown as Repository<AuditoriaEvento>,
    ),
    repo,
  };
}

describe('AuditoriaService.registrar', () => {
  it('inserta el evento sin datos sensibles y con entidadId como texto', async () => {
    const { servicio, repo } = crearServicio();
    await servicio.registrar({
      usuarioId: 1,
      accion: 'usuario.crear',
      entidad: 'usuario',
      entidadId: 12,
      despues: {
        correo: 'a@nomade.cl',
        claveTemporal: 'secreta',
        claveHash: 'h',
      },
      ip: '10.0.0.1',
    });
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 1,
        accion: 'usuario.crear',
        entidadId: '12',
        antes: null,
        despues: { correo: 'a@nomade.cl' },
        motivo: null,
        ip: '10.0.0.1',
      }),
    );
  });

  it('solo expone insert: la bitácora es append-only', () => {
    const { servicio } = crearServicio();
    const metodos = Object.getOwnPropertyNames(AuditoriaService.prototype);
    expect(
      metodos.filter((m) =>
        /actualizar|eliminar|borrar|update|delete/i.test(m),
      ),
    ).toEqual([]);
    expect(servicio).toBeInstanceOf(AuditoriaService);
  });

  it('registrarSinFallar no propaga errores de la BD', async () => {
    const { servicio, repo } = crearServicio();
    repo.insert.mockRejectedValueOnce(new Error('BD caída'));
    await expect(
      servicio.registrarSinFallar({ accion: 'a.b', entidad: 'a' }),
    ).resolves.toBeUndefined();
  });
});

describe('rangoFechas', () => {
  it('"hasta" con solo fecha incluye todo ese día', () => {
    const { desde, hasta } = rangoFechas('2026-11-01', '2026-11-30');
    expect(desde).toEqual(new Date('2026-11-01T00:00:00.000Z'));
    expect(hasta).toEqual(new Date('2026-12-01T00:00:00.000Z'));
  });

  it('"hasta" con hora se usa tal cual', () => {
    expect(rangoFechas(undefined, '2026-11-30T12:00:00.000Z').hasta).toEqual(
      new Date('2026-11-30T12:00:00.000Z'),
    );
  });

  it('sin filtros devuelve vacío', () => {
    expect(rangoFechas()).toEqual({ desde: undefined, hasta: undefined });
  });
});

describe('construirConsulta', () => {
  function qbEspia() {
    const clausulas: { sql: unknown; params?: Record<string, unknown> }[] = [];
    const qb = {
      andWhere: vi.fn((sql: unknown, params?: Record<string, unknown>) => {
        clausulas.push({ sql, params });
        return qb;
      }),
    };
    return {
      qb: qb as unknown as SelectQueryBuilder<AuditoriaEvento>,
      clausulas,
    };
  }

  it('sin filtros no agrega condiciones', () => {
    const { qb, clausulas } = qbEspia();
    construirConsulta(qb, {});
    expect(clausulas).toEqual([]);
  });

  it('combina fecha, actor, entidad y acción exacta', () => {
    const { qb, clausulas } = qbEspia();
    construirConsulta(qb, {
      desde: '2026-11-01',
      hasta: '2026-11-02',
      usuarioId: 4,
      entidad: 'usuario',
      entidadId: '12',
      accion: 'usuario.crear',
    });
    expect(clausulas.map((c) => c.sql)).toEqual([
      'e.ocurridoEn >= :desde',
      'e.ocurridoEn < :hasta',
      'e.usuarioId = :usuarioId',
      'e.entidad = :entidad',
      'e.entidadId = :entidadId',
      'e.accion = :accion',
    ]);
    expect(clausulas[1].params?.hasta).toEqual(
      new Date('2026-11-03T00:00:00.000Z'),
    );
  });

  it('una acción terminada en punto filtra por prefijo escapando comodines', () => {
    const { qb, clausulas } = qbEspia();
    construirConsulta(qb, { accion: 'usuario.' });
    expect(clausulas[0].params).toEqual({ prefijo: 'usuario.%' });
    const e = qbEspia();
    construirConsulta(e.qb, { accion: 'a_b%.' });
    expect(e.clausulas[0].params).toEqual({ prefijo: 'a\\_b\\%.%' });
  });

  it('la búsqueda libre se agrupa con OR y se combina con AND', () => {
    const { qb, clausulas } = qbEspia();
    construirConsulta(qb, { q: '100%' });
    expect(clausulas).toHaveLength(1);
    expect(clausulas[0].params).toEqual({ q: '%100\\%%' });
  });
});
