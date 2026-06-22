#!/bin/sh
set -e

# Áp dụng migration đã commit lên DB trước khi chạy app (an toàn cho production).
echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting application..."
exec node dist/main
