import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Las pantallas con DataGrid y varios diálogos tardan en montarse cuando los workers de Vitest
// compiten por CPU: se da más margen a `findBy*`/`waitFor` (solo se agota si de verdad falla).
configure({ asyncUtilTimeout: 4000 });

// jsdom no implementa matchMedia: se evalúan min-width/max-width contra window.innerWidth
// (1024 px por defecto), suficiente para los breakpoints de MUI.
function evaluarConsulta(consulta: string): boolean {
  const ancho = window.innerWidth;
  const min = /min-width:\s*([\d.]+)px/.exec(consulta);
  const max = /max-width:\s*([\d.]+)px/.exec(consulta);
  return (!min || ancho >= Number(min[1])) && (!max || ancho <= Number(max[1]));
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string): MediaQueryList => ({
    matches: evaluarConsulta(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
