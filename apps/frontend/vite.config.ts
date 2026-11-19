import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const PUERTO = 5177;

export default defineConfig(({ mode }) => {
  // BACKEND_URL puede venir del entorno o de un archivo .env en esta carpeta.
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.BACKEND_URL || 'http://localhost:3007';

  const proxy = {
    '/api': {
      target: backendUrl,
      changeOrigin: false,
      xfwd: true,
    },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          // Separa librerías estables en chunks propios (mejor caché entre despliegues).
          codeSplitting: {
            groups: [
              { name: 'mui', test: /node_modules[\\/](@mui|@emotion)[\\/]/ },
              { name: 'vendor', test: /node_modules[\\/]/ },
            ],
          },
        },
      },
    },
    server: {
      port: PUERTO,
      strictPort: true,
      host: true,
      allowedHosts: ['nomade.coworlabs.cl'],
      proxy,
    },
    preview: {
      port: PUERTO,
      strictPort: true,
      proxy,
    },
  };
});
