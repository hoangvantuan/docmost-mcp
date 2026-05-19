#!/bin/bash
# Setup PM2 log rotation cho docmost-mcp

echo "Cài đặt pm2-logrotate..."
pm2 install pm2-logrotate

echo "Cấu hình log rotation..."
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

echo "Done. Kiểm tra cấu hình:"
pm2 conf pm2-logrotate
