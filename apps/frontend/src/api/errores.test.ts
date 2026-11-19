import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { errorApi } from '@/test/api';
import {
  erroresPorCampo,
  esConflictoVersion,
  mensajeDeError,
  normalizarError,
  versionActualDelConflicto,
} from './errores';

describe('normalizarError', () => {
  it('lee el ErrorResponse del backend', () => {
    const error = errorApi(422, 'ULTIMO_ADMIN', 'Debe existir al menos un administrador activo.');
    expect(normalizarError(error)).toEqual({
      estado: 422,
      codigo: 'ULTIMO_ADMIN',
      mensaje: 'Debe existir al menos un administrador activo.',
      detalles: [],
    });
  });

  it('una caída de red devuelve un mensaje en español', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(normalizarError(error)).toMatchObject({ estado: undefined, codigo: 'SIN_CONEXION' });
    expect(mensajeDeError(error)).toMatch(/No se pudo conectar con el servidor/);
  });

  it('cualquier otro error devuelve el mensaje genérico', () => {
    expect(mensajeDeError(new Error('boom'))).toBe(
      'Ocurrió un error inesperado. Intenta nuevamente.',
    );
    expect(mensajeDeError('texto')).toBe('Ocurrió un error inesperado. Intenta nuevamente.');
  });
});

describe('conflicto de versión y errores por campo', () => {
  const conflicto = errorApi(409, 'CONFLICTO_VERSION', 'Recarga y reintenta.', [
    { versionActual: 7 },
  ]);

  it('detecta el 409 de versión y su versión vigente', () => {
    expect(esConflictoVersion(conflicto)).toBe(true);
    expect(versionActualDelConflicto(conflicto)).toBe(7);
    expect(esConflictoVersion(errorApi(409, 'CORREO_DUPLICADO', 'x'))).toBe(false);
    expect(versionActualDelConflicto(errorApi(409, 'CORREO_DUPLICADO', 'x'))).toBeUndefined();
  });

  it('agrupa los errores de validación por campo', () => {
    const error = errorApi(400, 'VALIDACION', 'Los datos enviados no son válidos.', [
      { campo: 'correo', errores: ['Ingresa un correo válido.', 'otro'] },
      { campo: 'nombre', errores: ['Muy corto.'] },
      { raro: true },
    ]);
    expect(erroresPorCampo(error)).toEqual({
      correo: 'Ingresa un correo válido.',
      nombre: 'Muy corto.',
    });
  });
});
