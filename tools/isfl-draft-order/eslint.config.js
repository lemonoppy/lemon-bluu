const base = require('@lemon-bluu/eslint-config/bot-flat.js');

module.exports = [
  ...base,
  {
    rules: {
      'no-console': 'off',
    },
  },
];
