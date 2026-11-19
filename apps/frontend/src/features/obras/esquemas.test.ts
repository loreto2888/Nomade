import { describe, expect, it } from 'vitest';
import { obraEjemplo } from '@/test/fixtures';
import {
  OBRA_VACIA,
  aCambios,
  aCuerpoCrear,
  deObra,
  diferenciasConServidor,
  esquemaObra,
  fusionarEdiciones,
  type DatosObra,
} from './esquemas';

const valida: DatosObra = {
  ...OBRA_VACIA,
  codigoCentroCosto: 'cc-001',
  nombre: 'Local Parque Norte',
  cliente: { id: 5, rut: '76086428-5', razonSocial: 'Grupo Andino SpA' },
  estadoId: 1,
};

const errores = (datos: DatosObra) => {
  const r = esquemaObra.safeParse(datos);
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
};

describe('esquemaObra', () => {
  it('acepta una obra mínima y pasa el centro de costo a mayúsculas', () => {
    const r = esquemaObra.safeParse(valida);
    expect(r.success).toBe(true);
    expect(r.data?.codigoCentroCosto).toBe('CC-001');
  });

  it('valida el centro de costo, el nombre y el cliente', () => {
    expect(errores({ ...valida, codigoCentroCosto: 'A' })).toEqual(['codigoCentroCosto']);
    expect(errores({ ...valida, codigoCentroCosto: 'CC 001' })).toEqual(['codigoCentroCosto']);
    expect(errores({ ...valida, nombre: 'A' })).toEqual(['nombre']);
    expect(errores({ ...valida, cliente: null })).toEqual(['cliente']);
  });

  it('la fecha de término no puede ser anterior a la de inicio', () => {
    expect(errores({ ...valida, fechaInicio: '2026-03-01', fechaTermino: '2026-01-01' })).toEqual([
      'fechaTermino',
    ]);
    expect(errores({ ...valida, fechaInicio: '2026-03-01', fechaTermino: '2026-03-01' })).toEqual(
      [],
    );
    expect(errores({ ...valida, fechaInicio: '', fechaTermino: '2026-01-01' })).toEqual([]);
  });

  it('en CLP el monto es entero y en UF admite hasta 4 decimales', () => {
    expect(errores({ ...valida, montoContrato: 100.5 })).toEqual(['montoContrato']);
    expect(errores({ ...valida, monedaContrato: 'UF', montoContrato: 4710.5 })).toEqual([]);
    expect(errores({ ...valida, monedaContrato: 'UF', montoContrato: 4710.12345 })).toEqual([
      'montoContrato',
    ]);
    expect(errores({ ...valida, montoContrato: -1 })).toEqual(['montoContrato']);
    expect(errores({ ...valida, montoContrato: null })).toEqual([]);
  });
});

describe('conversión entre formulario y API', () => {
  it('deObra / aCuerpoCrear: ida y vuelta con vacíos como null', () => {
    const datos = deObra(obraEjemplo({ responsable: null, observaciones: null }));
    expect(datos.responsable).toBe('');
    expect(aCuerpoCrear({ ...datos, cliente: datos.cliente })).toMatchObject({
      codigoCentroCosto: 'CC-001',
      clienteId: 5,
      estadoId: 2,
      responsable: null,
      observaciones: null,
      monedaContrato: 'CLP',
      montoContrato: 185_000_000,
    });
  });

  it('aCuerpoCrear omite el estado si no se eligió (el servidor usa «en preparación»)', () => {
    expect(aCuerpoCrear({ ...valida, estadoId: null })).not.toHaveProperty('estadoId');
  });

  it('aCambios envía solo lo que cambió', () => {
    const original = deObra(obraEjemplo());
    expect(aCambios(original, original)).toEqual({});
    expect(aCambios({ ...original, nombre: 'Otro nombre', responsable: '' }, original)).toEqual({
      nombre: 'Otro nombre',
      responsable: null,
    });
    expect(aCambios({ ...original, monedaContrato: 'UF', montoContrato: 100 }, original)).toEqual({
      monedaContrato: 'UF',
      montoContrato: 100,
    });
    expect(aCambios({ ...original, estadoId: 3 }, original)).toEqual({ estadoId: 3 });
  });
});

describe('diferenciasConServidor', () => {
  it('lista solo los campos que la persona editó y que hoy valen otra cosa en el servidor', () => {
    const original = deObra(obraEjemplo());
    const mios: DatosObra = {
      ...original,
      nombre: 'Mi nombre',
      responsable: 'Camila Rojas',
      direccion: 'Mi dirección',
    };
    const servidor = obraEjemplo({
      nombre: 'Nombre ajeno',
      direccion: 'Dirección ajena',
      estado: { id: 3, codigo: 'suspendida', nombre: 'Suspendida' },
    });

    const diferencias = diferenciasConServidor(mios, original, servidor);
    expect(diferencias).toEqual([
      { campo: 'Nombre', tuValor: 'Mi nombre', valorActual: 'Nombre ajeno' },
      { campo: 'Dirección', tuValor: 'Mi dirección', valorActual: 'Dirección ajena' },
    ]);
  });

  it('un campo editado que el servidor ya tiene igual no es diferencia', () => {
    const original = deObra(obraEjemplo());
    const mios = { ...original, nombre: 'Igual' };
    expect(diferenciasConServidor(mios, original, obraEjemplo({ nombre: 'Igual' }))).toEqual([]);
  });

  it('formatea montos, fechas, cliente y estado en texto legible', () => {
    const original = deObra(obraEjemplo());
    const mios: DatosObra = {
      ...original,
      montoContrato: 200_000_000,
      fechaTermino: '2027-01-31',
      cliente: { id: 6, rut: '11111111-1', razonSocial: 'Inmobiliaria Central' },
    };
    const servidor = obraEjemplo({
      montoContrato: 190_000_000,
      fechaTermino: '2027-02-28',
      cliente: { id: 7, rut: '10000013-K', razonSocial: 'Comercial Austral' },
    });
    const d = Object.fromEntries(
      diferenciasConServidor(mios, original, servidor).map((x) => [x.campo, x]),
    );
    expect(d['Monto del contrato']).toMatchObject({
      tuValor: '$ 200.000.000',
      valorActual: '$ 190.000.000',
    });
    expect(d['Cliente']).toMatchObject({
      tuValor: 'Inmobiliaria Central',
      valorActual: 'Comercial Austral',
    });
    expect(d['Fecha de término']).toBeDefined();
  });
});

describe('fusionarEdiciones', () => {
  it('mantiene los campos editados y toma del servidor todo lo demás', () => {
    const original = deObra(obraEjemplo());
    const mios: DatosObra = { ...original, nombre: 'Mi nombre' };
    const servidor = deObra(
      obraEjemplo({ nombre: 'Ajeno', responsable: 'Tomás Silva', version: 4 }),
    );

    const fusion = fusionarEdiciones(mios, original, servidor);
    expect(fusion.nombre).toBe('Mi nombre');
    expect(fusion.responsable).toBe('Tomás Silva');
    // Lo que se enviaría ahora contra la versión vigente es solo lo editado.
    expect(aCambios(fusion, servidor)).toEqual({ nombre: 'Mi nombre' });
  });

  it('sin ediciones queda idéntico al servidor', () => {
    const original = deObra(obraEjemplo());
    const servidor = deObra(obraEjemplo({ nombre: 'Ajeno' }));
    expect(fusionarEdiciones(original, original, servidor)).toEqual(servidor);
  });
});
