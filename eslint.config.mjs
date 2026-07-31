import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', '.vscode-test/**', '.vscode-test*', '.tmp-vscode-profile/**', '.tmp-vscode-profile*', '.tmp-vscode-extensions/**', '.tmp-vscode-extensions*', 'coverage/**', 'tests/integration/**']
  }
);
