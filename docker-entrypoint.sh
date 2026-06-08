#!/bin/sh
set -e

mkdir -p /pb/pb_data/fresh

echo "[init] starting pocketbase --hooksDir=/pb/pb_hooks ..."
exec /pb/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data/fresh --hooksDir=/pb/pb_hooks
