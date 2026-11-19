import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { temaClaro, temaOscuro, type ModoTema } from '@/app/theme';
import { ContextoTema, guardarModo, leerModoGuardado } from './contextoTema';

interface ProveedorTemaProps {
  children: ReactNode;
  /** Modo inicial; por defecto el guardado en el navegador o «claro». */
  modoInicial?: ModoTema;
}

/** Tema MUI claro/oscuro (D-12) con la preferencia recordada en el navegador. */
export function ProveedorTema({ children, modoInicial }: ProveedorTemaProps) {
  const [modo, setModo] = useState<ModoTema>(() => modoInicial ?? leerModoGuardado() ?? 'claro');

  const establecerModo = useCallback((nuevo: ModoTema) => {
    setModo(nuevo);
    guardarModo(nuevo);
  }, []);

  const valor = useMemo(() => ({ modo, establecerModo }), [modo, establecerModo]);

  return (
    <ContextoTema.Provider value={valor}>
      <ThemeProvider theme={modo === 'oscuro' ? temaOscuro : temaClaro}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ContextoTema.Provider>
  );
}
