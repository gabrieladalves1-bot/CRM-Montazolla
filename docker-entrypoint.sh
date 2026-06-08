#!/bin/sh
set -e

# Copy hooks from Docker image into the data dir where PocketBase looks by default
mkdir -p /pb/pb_data/fresh/pb_hooks
mkdir -p /pb/pb_data/fresh/pb_migrations
cp /pb/pb_hooks/_test_route.js /pb/pb_data/fresh/pb_hooks/

echo "[init] hooks: $(ls /pb/pb_data/fresh/pb_hooks | wc -l) files (TEST MODE - only _test_route.js)"
echo "[init] starting pocketbase..."

exec /pb/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data/fresh
