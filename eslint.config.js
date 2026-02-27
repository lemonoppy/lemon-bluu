const botConfig = require('@lemon-bluu/eslint-config/bot-flat');

// Root config used by lint-staged (runs eslint from repo root).
// Applies bot rules to all bot/package TS files; web has its own config.
module.exports = [
  { ignores: ['apps/web/**', '**/node_modules/**', '**/build/**', '**/dist/**'] },
  ...botConfig,
];
