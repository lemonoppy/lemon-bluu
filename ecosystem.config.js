const BASE = '/home/nelpizza/repo/lemon-bluu/apps/bots';

module.exports = {
  apps: [
    {
      name: 'kaiju-keeper',
      cwd: `${BASE}/kaiju-keeper`,
      script: 'yarn',
      args: 'start:prod',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'takoyaki',
      cwd: `${BASE}/takoyaki`,
      script: 'yarn',
      args: 'start:prod',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'fetcher-bee',
      cwd: `${BASE}/fetcher-bee`,
      script: 'yarn',
      args: 'start:prod',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
