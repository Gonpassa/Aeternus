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
      // The client and backend eslint configs both use tseslint.configs.recommended,
      // and typescript-eslint infers each one's tsconfig root dir by walking the call
      // stack of the config file that references it. The VS Code ESLint extension
      // runs a single server process for the whole workspace, so both configs load
      // into that same process and register conflicting candidates. Setting this
      // explicitly avoids the ambiguity.
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
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
  {
    // Breakpoint boundary: viewport widths live in one place. `styling/breakpoints.ts`
    // mirrors Chakra's stock breakpoint tokens, so `breakpoints.from('lg')` and an
    // `{ base, lg }` responsive style prop resolve to the same pixel value; a
    // hand-written '(min-width: 64em)' silently drifts from both (DreamAnalysis.tsx
    // carried exactly that until ADR-0008 removed it). Responsive style props are the
    // first choice, `breakpoints.from`/`.until` the fallback when a JavaScript media
    // query is genuinely needed (Nav.tsx), and a raw query string is never right.
    //
    // Only TS/TSX is in scope: CSS modules write their breakpoints as `@media` rules,
    // which ESLint does not parse and which have no token indirection to route through.
    files: ['**/*.{ts,tsx}'],
    // The module that defines the queries is necessarily where the strings live.
    ignores: ['src/styling/breakpoints.ts'],
    rules: {
      // Airbnb's four selectors are re-listed here because no-restricted-syntax replaces
      // its options wholesale rather than merging them (see the ESLint 8 note above).
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message:
            'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
        },
        {
          selector: 'ForOfStatement',
          message:
            'iterators/generators require regenerator-runtime, which is too heavyweight for this guide to allow them. Separately, loops should be avoided in favor of array iterations.',
        },
        {
          selector: 'LabeledStatement',
          message:
            'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
        },
        {
          selector: 'WithStatement',
          message:
            '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
        },
        {
          selector: 'Literal[value=/(min|max)-width\\s*:/]',
          message:
            'Raw media query: use a responsive style prop ({ base, lg }) or styling/breakpoints.ts.',
        },
        {
          // The template-literal form, which is how a parameterized query gets written.
          selector: 'TemplateElement[value.raw=/(min|max)-width\\s*:/]',
          message:
            'Raw media query: use a responsive style prop ({ base, lg }) or styling/breakpoints.ts.',
        },
      ],
    },
  },
  {
    // Chakra encapsulation boundary: `atoms/` is the only layer allowed to import
    // `@chakra-ui/react` directly (see docs/adr/0002-chakra-import-boundary.md).
    // Everywhere else should compose the shared atoms/ components instead.
    files: ['**/*.{ts,tsx}'],
    // atoms/ is the boundary itself; theme.ts defines the design system's Chakra
    // recipes/system; main.tsx and test/setup.tsx wire up the app- and test-level
    // ChakraProvider, which necessarily happens outside the atoms/ boundary.
    ignores: ['src/atoms/**', 'src/theme.ts', 'src/main.tsx', 'src/test/setup.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@chakra-ui/react',
              message: 'Import from atoms/ instead of @chakra-ui/react directly.',
            },
          ],
        },
      ],
    },
  },
);
