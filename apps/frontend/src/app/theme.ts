import type { CSSProperties } from 'react';
import { createTheme, type Theme } from '@mui/material/styles';
import { esES } from '@mui/material/locale';

export type ModoTema = 'claro' | 'oscuro';

interface TokensBarraLateral {
  fondo: string;
  texto: string;
  tituloSeccion: string;
  hover: string;
  activoFondo: string;
  activoTexto: string;
  borde: string;
  marca: string;
  marcaBorde: string;
  marcaSubtitulo: string;
}

/** Colores de apoyo que MUI no modela: textos tenues, avatar, estados vacíos. */
interface TokensApoyo {
  titulo: string;
  eyebrow: string;
  textoSuave: string;
  textoTenue: string;
  bordeTarjeta: string;
  sombraTarjeta: string;
  iconoBarra: string;
  migas: string;
  migaActual: string;
  avatarFondo: string;
  avatarTexto: string;
  vacioFondo: string;
  vacioIcono: string;
  botonBorde: string;
  botonTexto: string;
  botonBordeHover: string;
}

interface TokensModo {
  primario: string;
  primarioOscuro: string;
  primarioContraste: string;
  acento: string;
  foco: string;
  fondo: string;
  papel: string;
  texto: string;
  textoSecundario: string;
  divisor: string;
  exito: string;
  barraLateral: TokensBarraLateral;
  apoyo: TokensApoyo;
}

/** Tema claro: tokens tomados de `styles.css` del prototipo (plan §10.1). */
export const tokensClaro: TokensModo = {
  primario: '#1e5744',
  primarioOscuro: '#163f32',
  primarioContraste: '#ffffff',
  acento: '#ec9b63',
  foco: '#efb37f',
  fondo: '#f6f7f4',
  papel: '#ffffff',
  texto: '#243731',
  textoSecundario: '#84928a',
  divisor: '#e7ece7',
  exito: '#3e7953',
  barraLateral: {
    fondo: '#183c33',
    texto: '#c4d6c9',
    tituloSeccion: '#91ac9c',
    hover: '#234e40',
    activoFondo: '#e8f0de',
    activoTexto: '#204737',
    borde: '#32594b',
    marca: '#e3eedb',
    marcaBorde: '#779b83',
    marcaSubtitulo: '#a6c0b0',
  },
  apoyo: {
    titulo: '#1f382e',
    eyebrow: '#9bada0',
    textoSuave: '#8b9b90',
    textoTenue: '#9daaa1',
    bordeTarjeta: '#e9eee9',
    sombraTarjeta: '0 3px 15px rgba(37, 61, 44, 0.025)',
    iconoBarra: '#718378',
    migas: '#99a69d',
    migaActual: '#40554a',
    avatarFondo: '#e8ede2',
    avatarTexto: '#42634e',
    vacioFondo: '#f0f5ec',
    vacioIcono: '#73947b',
    botonBorde: '#dfe8df',
    botonTexto: '#405b4b',
    botonBordeHover: '#9bb4a0',
  },
};

/** Tema oscuro: mismo verde de marca sobre superficies verde-grafito. */
export const tokensOscuro: TokensModo = {
  primario: '#5fb58c',
  primarioOscuro: '#7ccaa3',
  primarioContraste: '#0b1a14',
  acento: '#ec9b63',
  foco: '#efb37f',
  fondo: '#0f1915',
  papel: '#16231e',
  texto: '#e3ece6',
  textoSecundario: '#9db0a4',
  divisor: '#27382f',
  exito: '#66b985',
  barraLateral: {
    fondo: '#0a1411',
    texto: '#b9cdc0',
    tituloSeccion: '#7f9a8a',
    hover: '#173229',
    activoFondo: '#24493b',
    activoTexto: '#e8f0de',
    borde: '#27382f',
    marca: '#e3eedb',
    marcaBorde: '#5d806b',
    marcaSubtitulo: '#8fab9b',
  },
  apoyo: {
    titulo: '#e8f1ea',
    eyebrow: '#7f9a8a',
    textoSuave: '#94a89b',
    textoTenue: '#819788',
    bordeTarjeta: '#243830',
    sombraTarjeta: '0 3px 15px rgba(0, 0, 0, 0.25)',
    iconoBarra: '#9db0a4',
    migas: '#86998d',
    migaActual: '#cfe0d5',
    avatarFondo: '#24493b',
    avatarTexto: '#d7ead9',
    vacioFondo: '#1d2f27',
    vacioIcono: '#7fb593',
    botonBorde: '#33473d',
    botonTexto: '#c5d8cb',
    botonBordeHover: '#5d806b',
  },
};

export const tokensPorModo: Record<ModoTema, TokensModo> = {
  claro: tokensClaro,
  oscuro: tokensOscuro,
};

export const ANCHO_BARRA_LATERAL = 242;
export const ALTO_BARRA_SUPERIOR = 75;

const fuenteTexto = '"DM Sans", system-ui, sans-serif';
const fuenteTitulos = '"Manrope", "DM Sans", system-ui, sans-serif';

declare module '@mui/material/styles' {
  interface Palette {
    barraLateral: TokensBarraLateral;
    apoyo: TokensApoyo;
  }
  interface PaletteOptions {
    barraLateral?: TokensBarraLateral;
    apoyo?: TokensApoyo;
  }
  interface TypographyVariants {
    eyebrow: CSSProperties;
  }
  interface TypographyVariantsOptions {
    eyebrow?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    eyebrow: true;
  }
}

export function crearTema(modo: ModoTema): Theme {
  const t = tokensPorModo[modo];
  const titulo = { fontFamily: fuenteTitulos, color: t.apoyo.titulo, letterSpacing: '-0.03em' };

  return createTheme(
    {
      palette: {
        mode: modo === 'oscuro' ? 'dark' : 'light',
        primary: { main: t.primario, dark: t.primarioOscuro, contrastText: t.primarioContraste },
        secondary: { main: t.acento, contrastText: '#fff' },
        success: { main: t.exito },
        background: { default: t.fondo, paper: t.papel },
        text: { primary: t.texto, secondary: t.textoSecundario },
        divider: t.divisor,
        barraLateral: t.barraLateral,
        apoyo: t.apoyo,
      },
      shape: { borderRadius: 10 },
      typography: {
        fontFamily: fuenteTexto,
        h1: {
          ...titulo,
          fontSize: '1.6875rem',
          fontWeight: 800,
          lineHeight: 1.2,
          letterSpacing: '-0.045em',
        },
        h2: { ...titulo, fontSize: '1.375rem', fontWeight: 800, lineHeight: 1.25 },
        h3: { ...titulo, fontSize: '1.125rem', fontWeight: 700 },
        h4: { ...titulo, fontSize: '1rem', fontWeight: 700 },
        h5: { ...titulo, fontSize: '0.9375rem', fontWeight: 700 },
        h6: {
          ...titulo,
          fontSize: '0.875rem',
          fontWeight: 700,
          color: modo === 'oscuro' ? '#cfe0d5' : '#30473a',
        },
        button: { textTransform: 'none', fontWeight: 700 },
        eyebrow: {
          display: 'block',
          fontFamily: fuenteTexto,
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color: t.apoyo.eyebrow,
        },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: { fontSynthesis: 'none' },
            ':focus-visible': { outline: `3px solid ${t.foco}`, outlineOffset: 2 },
          },
        },
        MuiTypography: {
          defaultProps: { variantMapping: { eyebrow: 'span' } },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: { borderRadius: 7, minHeight: 38, paddingInline: 14 },
            outlined: {
              borderColor: t.apoyo.botonBorde,
              color: t.apoyo.botonTexto,
              '&:hover': { borderColor: t.apoyo.botonBordeHover },
            },
          },
        },
        MuiCard: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              border: `1px solid ${t.apoyo.bordeTarjeta}`,
              boxShadow: t.apoyo.sombraTarjeta,
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: { borderRadius: 5, fontWeight: 700 },
          },
        },
        MuiAppBar: {
          defaultProps: { elevation: 0, color: 'inherit' },
          styleOverrides: { root: { backgroundImage: 'none' } },
        },
      },
    },
    esES,
  );
}

export const temaClaro = crearTema('claro');
export const temaOscuro = crearTema('oscuro');
