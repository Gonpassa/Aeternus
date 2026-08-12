import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import { FlatCompat } from '@eslint/eslintrc';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...compat.extends('airbnb', 'airbnb/hooks'),
      reactRefresh.configs.recommended,
      eslintConfigPrettier,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // airbnb (eslintrc) re-enables these base rules on top of typescript-eslint's
      // recommended config, which disables the base rule in favor of the
      // TS-aware version. Re-apply that precedence so the TS rules run instead
      // of the base rules. Options are passed explicitly (rather than relying on
      // the rule's built-in `defaultOptions` merge, an ESLint 9 Linter feature
      // not available here since this workspace pins ESLint 8).
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      // airbnb predates React 18's automatic JSX runtime and TS/TSX file layout;
      // adjust the handful of rules that would otherwise misfire on every file.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
      'import/prefer-default-export': 'off',
      // TypeScript (via `tsc -b` in the build script) already validates module
      // resolution, including TS path/subpath exports eslint-plugin-import
      // cannot resolve without extra resolver config (e.g. package `exports`
      // fields, or the router plugin's generated routeTree.gen.ts).
      'import/no-unresolved': 'off',
      // Same reasoning as import/no-unresolved above: without that resolver
      // config, eslint-plugin-import can't tell the `@/*` TS path alias apart
      // from an unresolvable module, so it falls back to demanding a file
      // extension on every `@/...` import. tsc -b already enforces this.
      'import/extensions': 'off',
      // airbnb's react/require-default-props predates TypeScript prop typing and
      // wants a `defaultProps` static for every optional prop; that pattern is
      // deprecated for function components (React 18.3+) and redundant here since
      // TS interfaces already express optionality and defaults are handled via
      // destructuring default values.
      'react/require-default-props': 'off',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            'vite.config.ts',
            'src/routes/__root.tsx',
            '**/*.test.{ts,tsx}',
            'src/test/**',
          ],
        },
      ],
    },
  },
);
