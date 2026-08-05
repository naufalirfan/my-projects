module.exports = {
  apps: [{
    name: 'forex-bot',
    script: 'scheduler.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
