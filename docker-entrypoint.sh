#!/bin/sh
set -e

echo "=== PocketBase Startup ==="
echo "Hooks dir contents (/app/hooks):"
ls -la /app/hooks || echo "ERROR: /app/hooks not found!"
echo "Migrations dir contents (/app/migrations):"
ls -la /app/migrations || echo "ERROR: /app/migrations not found!"
echo "PocketBase binary:"
ls -la /pb/pocketbase || echo "ERROR: pocketbase binary not found!"
echo "=========================="

exec /pb/pocketbase serve \
  --http=0.0.0.0:8090 \
  --dir=/pb/pb_data/fresh \
  --hooksDir=/app/hooks \
  --migrationsDir=/app/migrations
