module.exports = {
  apps: [
    {
      name: "docmost-mcp",
      script: "dist/index.js",
      node_args: "--experimental-modules",
      env: {
        NODE_ENV: "production",
        TRANSPORT: "http",
        PORT: 3001,
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: "256M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      merge_logs: true,
    },
  ],
};
