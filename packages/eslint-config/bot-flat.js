const tsPlugin = require('@typescript-eslint/eslint-plugin');
const importXPlugin = require('eslint-plugin-import-x');

// Node.js globals for flat config (replaces env: { node: true, es6: true })
const nodeGlobals = {
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  clearImmediate: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  exports: 'writable',
  fetch: 'readonly',
  global: 'readonly',
  globalThis: 'readonly',
  module: 'writable',
  process: 'readonly',
  require: 'readonly',
  setImmediate: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
};

module.exports = [
  // TypeScript recommended (sets up parser + base TS rules)
  ...tsPlugin.configs['flat/recommended'],

  // Our custom rules
  {
    languageOptions: {
      globals: nodeGlobals,
    },
    plugins: {
      'import-x': importXPlugin,
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-restricted-imports': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'import-x/no-extraneous-dependencies': 'off',
      'import-x/no-default-export': 'warn',
      'import-x/no-anonymous-default-export': ['error', { allowArray: true, allowObject: true }],
      'import-x/no-useless-path-segments': 'error',
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      'import-x/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always-and-inside-groups',
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        },
      ],
    },
  },
];
