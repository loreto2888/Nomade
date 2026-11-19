import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

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
});
