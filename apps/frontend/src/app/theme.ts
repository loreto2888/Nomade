import type { CSSProperties } from 'react';
import { createTheme } from '@mui/material/styles';
import { esES } from '@mui/material/locale';

/** Tokens visuales tomados de `styles.css` del prototipo (plan §10.1). */
export const tokens = {
  primario: '#1e5744',
  primarioOscuro: '#163f32',
  acento: '#ec9b63',
  foco: '#efb37f',
  fondo: '#f6f7f4',
  papel: '#ffffff',
  texto: '#243731',
  textoSecundario: '#84928a',
  divisor: '#e7ece7',
  bordeTarjeta: '#e9eee9',
  titulo: '#1f382e',
  eyebrow: '#9bada0',
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
} as const;

export const ANCHO_BARRA_LATERAL = 242;
export const ALTO_BARRA_SUPERIOR = 75;

const fuenteTexto = '"DM Sans", system-ui, sans-serif';
const fuenteTitulos = '"Manrope", "DM Sans", system-ui, sans-serif';

declare module '@mui/material/styles' {
  interface Palette {
    barraLateral: (typeof tokens)['barraLateral'];
  }
  interface PaletteOptions {
    barraLateral?: (typeof tokens)['barraLateral'];
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

const titulo = { fontFamily: fuenteTitulos, color: tokens.titulo, letterSpacing: '-0.03em' };

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: { main: tokens.primario, dark: tokens.primarioOscuro, contrastText: '#fff' },
      secondary: { main: tokens.acento, contrastText: '#fff' },
      success: { main: '#3e7953' },
      background: { default: tokens.fondo, paper: tokens.papel },
      text: { primary: tokens.texto, secondary: tokens.textoSecundario },
      divider: tokens.divisor,
      barraLateral: tokens.barraLateral,
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
      h6: { ...titulo, fontSize: '0.875rem', fontWeight: 700, color: '#30473a' },
      button: { textTransform: 'none', fontWeight: 700 },
      eyebrow: {
        display: 'block',
        fontFamily: fuenteTexto,
        fontSize: '0.625rem',
        fontWeight: 700,
        letterSpacing: '0.13em',
        textTransform: 'uppercase',
        color: tokens.eyebrow,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { fontSynthesis: 'none' },
          ':focus-visible': { outline: `3px solid ${tokens.foco}`, outlineOffset: 2 },
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
            borderColor: '#dfe8df',
            color: '#405b4b',
            '&:hover': { borderColor: '#9bb4a0' },
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${tokens.bordeTarjeta}`,
            boxShadow: '0 3px 15px rgba(37, 61, 44, 0.025)',
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
      },
    },
  },
  esES,
);
