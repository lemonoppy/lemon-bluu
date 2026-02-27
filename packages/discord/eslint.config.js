const botConfig = require('@lemon-bluu/eslint-config/bot-flat');

module.exports = [
  ...botConfig,
  {
    ignores: ['node_modules/**', 'build/**', 'dist/**'],
  },
];
