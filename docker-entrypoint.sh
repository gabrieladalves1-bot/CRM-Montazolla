#!/bin/sh
set -e

echo "[debug] PocketBase: $(/pb/pocketbase --version 2>&1 | head -1)"
echo "[debug] /pb/pb_hooks: $(ls /pb/pb_hooks 2>&1)"
echo "[debug] /pb/pb_data: $(ls /pb/pb_data 2>&1 | head -5)"

mkdir -p /pb/pb_data/fresh

echo "[init] starting pocketbase --hooksDir=/pb/pb_hooks ..."
exec /pb/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data/fresh --hooksDir=/pb/pb_hooks
