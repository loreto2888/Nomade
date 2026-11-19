import { describe, expect, it } from 'vitest';
import { crearValidationPipe } from '../../common/errores/validacion.js';
import { CambiarClaveDto, IniciarSesionDto } from '../auth/auth.dto.js';
import { ConsultarAuditoriaDto } from '../auditoria/auditoria.dto.js';
import {
  ActualizarUsuarioDto,
  CrearUsuarioDto,
  ListarUsuariosDto,
} from './usuarios.dto.js';

const pipe = crearValidationPipe();
const validar = <T>(tipo: new () => T, valor: unknown) =>
  pipe.transform(valor, { type: 'body', metatype: tipo }) as Promise<T>;
const campos = async (promesa: Promise<unknown>): Promise<string[]> => {
  try {
    await promesa;
    return [];
  } catch (error) {
    const detalles = (error as { response: { detalles: { campo: string }[] } })
      .response.detalles;
    return detalles.map((d) => d.campo);
  }
};

describe('validación de DTOs (mensajes en español)', () => {
  it('CrearUsuarioDto normaliza correo y nombre', async () => {
    const dto = await validar(CrearUsuarioDto, {
      correo: '  Camila@Nomade.CL ',
      nombre: '  Camila Rojas ',
      rol: 'usuario',
    });
    expect(dto).toMatchObject({
      correo: 'camila@nomade.cl',
      nombre: 'Camila Rojas',
      rol: 'usuario',
    });
  });

  it('CrearUsuarioDto rechaza correo, nombre y rol inválidos y campos extra', async () => {
    expect(
      await campos(
        validar(CrearUsuarioDto, { correo: 'x', nombre: 'A', rol: 'jefe' }),
      ),
    ).toEqual(expect.arrayContaining(['correo', 'nombre', 'rol']));
    expect(
      await campos(
        validar(CrearUsuarioDto, {
          correo: 'a@b.cl',
          nombre: 'Ana',
          rol: 'admin',
          claveHash: 'x',
        }),
      ),
    ).toEqual(['claveHash']);
  });

  it('ActualizarUsuarioDto exige la versión', async () => {
    expect(
      await campos(validar(ActualizarUsuarioDto, { nombre: 'Ana Ruiz' })),
    ).toEqual(['version']);
    expect(await campos(validar(ActualizarUsuarioDto, { version: 0 }))).toEqual(
      ['version'],
    );
    await expect(
      validar(ActualizarUsuarioDto, { version: 2, rol: 'admin' }),
    ).resolves.toMatchObject({ version: 2 });
  });

  it('CambiarClaveDto exige ≥ 12 caracteres en la nueva contraseña', async () => {
    expect(
      await campos(
        validar(CambiarClaveDto, { claveActual: 'x', claveNueva: 'corta' }),
      ),
    ).toEqual(['claveNueva']);
    await expect(
      validar(CambiarClaveDto, {
        claveActual: 'x',
        claveNueva: 'una-clave-de-12+',
      }),
    ).resolves.toBeDefined();
  });

  it('IniciarSesionDto normaliza el correo a minúsculas', async () => {
    const dto = await validar(IniciarSesionDto, {
      correo: 'ADMIN@Nomade.cl',
      clave: 'x',
    });
    expect(dto.correo).toBe('admin@nomade.cl');
  });

  it('ListarUsuariosDto convierte tipos de la query y acota la paginación', async () => {
    const dto = await pipe.transform(
      { pagina: '2', tamanio: '50', activo: 'false', rol: 'admin', q: ' ana ' },
      { type: 'query', metatype: ListarUsuariosDto },
    );
    expect(dto).toMatchObject({
      pagina: 2,
      tamanio: 50,
      activo: false,
      rol: 'admin',
      q: 'ana',
    });
    expect(
      await campos(
        pipe.transform(
          { tamanio: '1000' },
          { type: 'query', metatype: ListarUsuariosDto },
        ),
      ),
    ).toEqual(['tamanio']);
    const porDefecto = await pipe.transform(
      {},
      { type: 'query', metatype: ListarUsuariosDto },
    );
    expect(porDefecto).toMatchObject({ pagina: 1, tamanio: 25 });
  });

  it('ConsultarAuditoriaDto valida fechas ISO', async () => {
    expect(
      await campos(
        pipe.transform(
          { desde: 'ayer' },
          { type: 'query', metatype: ConsultarAuditoriaDto },
        ),
      ),
    ).toEqual(['desde']);
    await expect(
      pipe.transform(
        { desde: '2026-11-01', hasta: '2026-11-19', usuarioId: '3' },
        { type: 'query', metatype: ConsultarAuditoriaDto },
      ),
    ).resolves.toMatchObject({ usuarioId: 3 });
  });
});
