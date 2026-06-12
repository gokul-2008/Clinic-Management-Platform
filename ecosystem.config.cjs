module.exports = {
  apps: [
    {
      name: 'carepulse-api',
      script: './backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './backend/logs/pm2_error.log',
      out_file: './backend/logs/pm2_out.log',
      merge_logs: true
    }
  ]
};
