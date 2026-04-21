/**
 * PM2 config for AADA ERP frontend (Next.js).
 * Use on the server so NODE_ENV=production and the app uses .next-build.
 * Start: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'aada-frontend',
      cwd: __dirname,
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
}
