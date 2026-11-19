import { describe, expect, it } from 'vitest';
import { crearValidationPipe } from '../common/errores/validacion.js';
import { ListarAdjuntosDto, SubirAdjuntoDto } from './adjuntos/adjuntos.dto.js';
import {
  ActualizarCatalogoItemDto,
  CrearCatalogoItemDto,
  ListarCatalogoDto,
} from './catalogos/catalogos.dto.js';
import {
  ActualizarClienteDto,
  CrearClienteDto,
  ListarClientesDto,
} from './clientes/clientes.dto.js';
import {
  ActualizarObraDto,
  CrearObraDto,
  ListarObrasDto,
} from './obras/obras.dto.js';
import { AgregarValorParametroDto } from './parametros/parametros.dto.js';
import {
  ActualizarCuentaBancariaDto,
  CrearCuentaBancariaDto,
  CrearProveedorDto,
} from './proveedores/proveedores.dto.js';
import {
  ConsultarValorUfDto,
  GuardarValorUfDto,
  ListarValoresUfDto,
} from './uf/uf.dto.js';

const pipe = crearValidationPipe();
const validar = <T>(
  tipo: new () => T,
  valor: unknown,
  type: 'body' | 'query' = 'body',
) => pipe.transform(valor, { type, metatype: tipo }) as Promise<T>;
const campos = async (promesa: Promise<unknown>): Promise<string[]> => {
  try {
    await promesa;
    return [];
  } catch (error) {
    return (
      error as { response: { detalles: { campo: string }[] } }
    ).response.detalles.map((d) => d.campo);
  }
};
const mensaje = async (
  promesa: Promise<unknown>,
  campo: string,
): Promise<string | undefined> => {
  try {
    await promesa;
  } catch (error) {
    const d = (
      error as {
        response: { detalles: { campo: string; errores: string[] }[] };
      }
    ).response.detalles;
    return d.find((x) => x.campo === campo)?.errores[0];
  }
  return undefined;
};

describe('DTOs de maestros: validación y normalización (mensajes en español)', () => {
  describe('clientes y proveedores (RUT módulo 11)', () => {
    it('normaliza el RUT y recorta los textos; los vacíos opcionales pasan a null', async () => {
      const dto = await validar(CrearClienteDto, {
        rut: ' 76.086.428-5 ',
        razonSocial: '  Grupo Andino SpA ',
        giro: '   ',
        correo: ' CONTACTO@Andino.CL ',
        telefono: '+56 2 2345 6789',
      });
      expect(dto).toMatchObject({
        rut: '76086428-5',
        razonSocial: 'Grupo Andino SpA',
        giro: null,
        correo: 'contacto@andino.cl',
        telefono: '+56 2 2345 6789',
      });
    });

    it('rechaza un RUT con dígito verificador incorrecto con un mensaje claro', async () => {
      expect(
        await mensaje(
          validar(CrearClienteDto, { rut: '76.086.428-4', razonSocial: 'X Y' }),
          'rut',
        ),
      ).toBe('Ingresa un RUT válido (por ejemplo 12.345.678-5).');
      expect(
        await campos(
          validar(CrearProveedorDto, { rut: 'abc', razonSocial: 'X Y' }),
        ),
      ).toEqual(['rut']);
      expect(
        await campos(validar(CrearProveedorDto, { razonSocial: 'X Y' })),
      ).toEqual(['rut']);
    });

    it('valida razón social, correo y teléfono, y rechaza campos desconocidos', async () => {
      const r = await campos(
        validar(CrearClienteDto, {
          rut: '76086428-5',
          razonSocial: 'A',
          correo: 'no',
          telefono: 'abc',
        }),
      );
      expect(r).toEqual(
        expect.arrayContaining(['razonSocial', 'correo', 'telefono']),
      );
      expect(
        await campos(
          validar(CrearClienteDto, {
            rut: '76086428-5',
            razonSocial: 'Ana',
            eliminadoEn: null,
          }),
        ),
      ).toEqual(['eliminadoEn']);
    });

    it('actualizar exige la versión y deja todo lo demás opcional', async () => {
      expect(
        await campos(validar(ActualizarClienteDto, { giro: 'X' })),
      ).toEqual(['version']);
      expect(
        await validar(ActualizarClienteDto, {
          version: 2,
          giro: 'Inmobiliario',
        }),
      ).toMatchObject({
        version: 2,
        giro: 'Inmobiliario',
      });
    });

    it('actualizar sigue validando RUT y normalizando', async () => {
      expect(
        await campos(
          validar(ActualizarClienteDto, { version: 1, rut: '12345678-9' }),
        ),
      ).toEqual(['rut']);
      expect(
        await validar(ActualizarClienteDto, {
          version: 1,
          rut: '12.345.678-5',
        }),
      ).toMatchObject({
        rut: '12345678-5',
      });
    });

    it('el listado acepta orden por campos permitidos y rechaza otros', async () => {
      const ok = await validar(
        ListarClientesDto,
        { q: ' andino ', ordenarPor: 'rut', direccion: 'desc' },
        'query',
      );
      expect(ok).toMatchObject({
        q: 'andino',
        ordenarPor: 'rut',
        direccion: 'desc',
        pagina: 1,
        tamanio: 25,
      });
      expect(
        await campos(
          validar(ListarClientesDto, { ordenarPor: 'clave' }, 'query'),
        ),
      ).toEqual(['ordenarPor']);
      expect(
        await campos(
          validar(ListarClientesDto, { direccion: 'arriba' }, 'query'),
        ),
      ).toEqual(['direccion']);
    });
  });

  describe('cuentas bancarias', () => {
    const base = {
      banco: 'Banco de Chile',
      tipoCuenta: 'corriente',
      numeroCuenta: '001-234 5678',
      titular: 'Materiales SpA',
      titularRut: '11.111.111-1',
    };

    it('quita espacios y guiones del número y normaliza el RUT del titular', async () => {
      expect(await validar(CrearCuentaBancariaDto, base)).toMatchObject({
        numeroCuenta: '0012345678',
        titularRut: '11111111-1',
      });
    });

    it('rechaza tipo de cuenta, número y RUT inválidos', async () => {
      const r = await campos(
        validar(CrearCuentaBancariaDto, {
          ...base,
          tipoCuenta: 'ahorros',
          numeroCuenta: '12',
          titularRut: '1-9',
        }),
      );
      expect(r).toEqual(
        expect.arrayContaining(['tipoCuenta', 'numeroCuenta', 'titularRut']),
      );
    });

    it('actualizar exige la versión', async () => {
      expect(
        await campos(validar(ActualizarCuentaBancariaDto, { titular: 'X Y' })),
      ).toEqual(['version']);
    });
  });

  describe('obras', () => {
    const base = {
      codigoCentroCosto: 'cc-001',
      nombre: 'Local Parque Norte',
      clienteId: 1,
    };

    it('pasa el centro de costo a mayúsculas', async () => {
      expect(
        await validar(CrearObraDto, { ...base, codigoCentroCosto: ' cc-001 ' }),
      ).toMatchObject({
        codigoCentroCosto: 'CC-001',
      });
    });

    it('valida el formato del centro de costo', async () => {
      for (const codigoCentroCosto of [
        'A',
        'CC 001',
        '-CC1',
        'X'.repeat(21),
        'CÑ-1',
      ]) {
        expect(
          await campos(validar(CrearObraDto, { ...base, codigoCentroCosto })),
        ).toEqual(['codigoCentroCosto']);
      }
    });

    it('valida fechas, moneda y monto (hasta 4 decimales, no negativo)', async () => {
      expect(
        await campos(
          validar(CrearObraDto, {
            ...base,
            fechaInicio: '2026-02-30',
            monedaContrato: 'USD',
            montoContrato: -5,
          }),
        ),
      ).toEqual(
        expect.arrayContaining([
          'fechaInicio',
          'monedaContrato',
          'montoContrato',
        ]),
      );
      expect(
        await campos(
          validar(CrearObraDto, { ...base, montoContrato: 1.23456 }),
        ),
      ).toEqual(['montoContrato']);
      expect(
        await validar(CrearObraDto, {
          ...base,
          monedaContrato: 'UF',
          montoContrato: 4710.5,
          fechaInicio: '2026-03-01',
        }),
      ).toMatchObject({ monedaContrato: 'UF', montoContrato: 4710.5 });
    });

    it('los campos opcionales vacíos pasan a null (para borrarlos al editar)', async () => {
      const dto = await validar(ActualizarObraDto, {
        version: 1,
        responsable: '  ',
        fechaTermino: '',
        montoContrato: null,
      });
      expect(dto).toMatchObject({
        responsable: null,
        fechaTermino: null,
        montoContrato: null,
      });
    });

    it('exige cliente y estado numéricos; actualizar exige la versión', async () => {
      expect(
        await campos(validar(CrearObraDto, { ...base, clienteId: 'uno' })),
      ).toEqual(['clienteId']);
      expect(
        await campos(validar(ActualizarObraDto, { nombre: 'Otro nombre' })),
      ).toEqual(['version']);
    });

    it('el listado convierte estadoId y clienteId a número', async () => {
      const dto = await validar(
        ListarObrasDto,
        { estadoId: '2', clienteId: '5', ordenarPor: 'cliente' },
        'query',
      );
      expect(dto).toMatchObject({
        estadoId: 2,
        clienteId: 5,
        ordenarPor: 'cliente',
      });
      expect(
        await campos(validar(ListarObrasDto, { estadoId: 'x' }, 'query')),
      ).toEqual(['estadoId']);
    });
  });

  describe('catálogos', () => {
    it('el código es snake_case y no se puede enviar al actualizar (es inmutable)', async () => {
      expect(
        await validar(CrearCatalogoItemDto, {
          codigo: 'en_garantia',
          nombre: 'En garantía',
          orden: 60,
        }),
      ).toMatchObject({
        codigo: 'en_garantia',
      });
      for (const codigo of ['En Garantia', '1abc', 'a', 'con-guion']) {
        expect(
          await campos(
            validar(CrearCatalogoItemDto, { codigo, nombre: 'Algo' }),
          ),
        ).toEqual(['codigo']);
      }
      expect(
        await campos(
          validar(ActualizarCatalogoItemDto, { version: 1, codigo: 'otro' }),
        ),
      ).toEqual(['codigo']);
    });

    it('incluirInactivos acepta "true"/"false"', async () => {
      expect(
        await validar(ListarCatalogoDto, { incluirInactivos: 'true' }, 'query'),
      ).toMatchObject({
        incluirInactivos: true,
      });
      expect(
        await campos(
          validar(ListarCatalogoDto, { incluirInactivos: 'quizás' }, 'query'),
        ),
      ).toEqual(['incluirInactivos']);
    });
  });

  describe('UF y parámetros', () => {
    it('el valor de la UF es positivo con hasta 4 decimales', async () => {
      expect(
        await validar(GuardarValorUfDto, { valor: 39284.8712 }),
      ).toMatchObject({ valor: 39284.8712 });
      for (const valor of [0, -1, 1.23456, 'abc']) {
        expect(await campos(validar(GuardarValorUfDto, { valor }))).toEqual([
          'valor',
        ]);
      }
    });

    it('las fechas de consulta de la UF son AAAA-MM-DD válidas', async () => {
      expect(
        await campos(
          validar(ConsultarValorUfDto, { fecha: '2026-02-30' }, 'query'),
        ),
      ).toEqual(['fecha']);
      expect(
        await validar(
          ListarValoresUfDto,
          { desde: '2026-11-01', hasta: '2026-11-30' },
          'query',
        ),
      ).toMatchObject({
        desde: '2026-11-01',
      });
    });

    it('agregar valor de parámetro exige versión, valor y fecha de vigencia', async () => {
      expect(await campos(validar(AgregarValorParametroDto, {}))).toEqual(
        expect.arrayContaining(['version', 'valor', 'vigenteDesde']),
      );
      expect(
        await validar(AgregarValorParametroDto, {
          version: 1,
          valor: ' 20 ',
          vigenteDesde: '2026-12-01',
          motivo: ' Ley ',
        }),
      ).toMatchObject({ valor: '20', motivo: 'Ley' });
      expect(
        await campos(
          validar(AgregarValorParametroDto, {
            version: 1,
            valor: '20',
            vigenteDesde: '01-12-2026',
          }),
        ),
      ).toEqual(['vigenteDesde']);
    });
  });

  describe('adjuntos', () => {
    it('el listado exige una entidad válida y un id numérico', async () => {
      expect(
        await validar(
          ListarAdjuntosDto,
          { entidadTipo: 'obra', entidadId: '3' },
          'query',
        ),
      ).toMatchObject({
        entidadTipo: 'obra',
        entidadId: 3,
      });
      expect(
        await campos(
          validar(
            ListarAdjuntosDto,
            { entidadTipo: 'factura', entidadId: 'x' },
            'query',
          ),
        ),
      ).toEqual(expect.arrayContaining(['entidadTipo', 'entidadId']));
    });

    it('el formulario de subida valida los campos de texto y no acepta el archivo como campo', async () => {
      expect(
        await validar(SubirAdjuntoDto, {
          entidadTipo: 'proveedor',
          entidadId: '7',
          descripcion: ' Cert. ',
        }),
      ).toMatchObject({
        entidadTipo: 'proveedor',
        entidadId: 7,
        descripcion: 'Cert.',
      });
      expect(
        await campos(
          validar(SubirAdjuntoDto, {
            entidadTipo: 'obra',
            entidadId: '1',
            archivo: 'texto',
          }),
        ),
      ).toEqual(['archivo']);
    });
  });
});
