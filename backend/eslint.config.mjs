import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended, eslintConfigPrettier],
    rules: {
      'no-console': 'error',
    },
  },
);
