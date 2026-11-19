import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'src/api/generated']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // Equivale a `erasableSyntaxOnly` de TypeScript, que está desactivado en tsconfig.app.json
      // solo porque el cliente generado (ignorado aquí) usa parameter properties.
      'no-restricted-syntax': [
        'error',
        { selector: 'TSEnumDeclaration', message: 'Usa un objeto `as const` en lugar de enum.' },
        { selector: 'TSParameterProperty', message: 'Declara la propiedad en la clase.' },
        {
          selector: 'TSModuleDeclaration[declare!=true][kind!="global"]',
          message: 'No uses namespaces con código.',
        },
      ],
    },
  },
  prettier,
]);
