#!/bin/sh
set -e

# Copy to the default hooksDir ({--dir}/pb_hooks) so no --hooksDir flag needed
mkdir -p /pb/pb_data/fresh/pb_hooks
rm -f /pb/pb_data/fresh/pb_hooks/*.js
cp /pb/pb_hooks/_test_route.js /pb/pb_data/fresh/pb_hooks/

echo "[init] hooks: $(ls /pb/pb_data/fresh/pb_hooks)"
echo "[init] starting pocketbase (--hooksWatch=false)..."
exec /pb/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data/fresh --hooksWatch=false
