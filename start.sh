#!/bin/sh
set -e

DB_FILE="/pb/pb_data/pb.db"
MIGRATION="1673167670_multi_match_migrate.go"

# If DB exists and has the _migrations table, mark the incompatible migration
# as applied so PocketBase skips it on startup.
if [ -f "$DB_FILE" ]; then
  sqlite3 "$DB_FILE" \
    "INSERT OR IGNORE INTO _migrations (file, applied) VALUES ('$MIGRATION', strftime('%s','now'));" \
    2>/dev/null || true
fi

exec /pb/pocketbase \
  --hooksDir=/pb/pb_hooks \
  --migrationsDir=/pb/pb_migrations \
  serve \
  --http=0.0.0.0:8090 \
  --dir=/pb/pb_data
