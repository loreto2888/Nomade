import { describe, expect, it } from 'vitest';
import { crearTema, tokensClaro, tokensOscuro } from './theme';

describe('tema claro y oscuro', () => {
  it('el tema claro usa la paleta del prototipo', () => {
    const tema = crearTema('claro');
    expect(tema.palette.mode).toBe('light');
    expect(tema.palette.primary.main).toBe('#1e5744');
    expect(tema.palette.background.default).toBe('#f6f7f4');
  });

  it('el tema oscuro invierte superficies y texto, y mantiene la marca', () => {
    const tema = crearTema('oscuro');
    expect(tema.palette.mode).toBe('dark');
    expect(tema.palette.background.default).toBe(tokensOscuro.fondo);
    expect(tema.palette.text.primary).toBe(tokensOscuro.texto);
    expect(tema.palette.barraLateral.fondo).toBe(tokensOscuro.barraLateral.fondo);
    expect(tema.palette.background.default).not.toBe(tokensClaro.fondo);
  });

  it('ambos temas definen los mismos tokens de apoyo', () => {
    expect(Object.keys(tokensOscuro.apoyo).sort()).toEqual(Object.keys(tokensClaro.apoyo).sort());
    expect(Object.keys(tokensOscuro.barraLateral).sort()).toEqual(
      Object.keys(tokensClaro.barraLateral).sort(),
    );
  });
});
