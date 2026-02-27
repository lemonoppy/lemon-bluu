const botConfig = require('@lemon-bluu/eslint-config/bot-flat');

const jestGlobals = {
  afterAll: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  describe: 'readonly',
  expect: 'readonly',
  it: 'readonly',
  jest: 'readonly',
  test: 'readonly',
};

module.exports = [
  ...botConfig,
  {
    languageOptions: {
      globals: jestGlobals,
    },
  },
  {
    ignores: ['node_modules/**', 'build/**', 'dist/**'],
  },
];
