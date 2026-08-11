import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended, eslintConfigPrettier],
    rules: {
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
