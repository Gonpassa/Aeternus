import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended, eslintConfigPrettier],
    // The client and backend eslint configs both use tseslint.configs.recommended,
    // and typescript-eslint infers each one's tsconfig root dir by walking the call
    // stack of the config file that references it. The VS Code ESLint extension
    // runs a single server process for the whole workspace, so both configs load
    // into that same process and register conflicting candidates. Setting this
    // explicitly avoids the ambiguity.
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      // Options passed explicitly rather than relying on the rule's built-in
      // `defaultOptions` merge, an ESLint 9 Linter feature not available here
      // since this workspace pins ESLint 8.
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
