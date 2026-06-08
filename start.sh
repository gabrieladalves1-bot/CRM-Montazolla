#!/bin/sh

DB_FILE="/pb/pb_data/pb.db"
MIGRATION="1673167670_multi_match_migrate.go"

echo "=== CRM Startup Script ==="

echo "-- Data dir contents:"
ls -la /pb/pb_data/ 2>/dev/null || echo "(empty or not mounted)"

echo "-- sqlite3 check:"
which sqlite3 2>/dev/null && sqlite3 --version 2>/dev/null || echo "sqlite3 NOT FOUND"

if [ -f "$DB_FILE" ]; then
    echo "-- Database found: $DB_FILE"

    echo "-- Fix 1: adding schema column to _collections (if missing)..."
    sqlite3 "$DB_FILE" \
        "ALTER TABLE _collections ADD COLUMN schema TEXT NOT NULL DEFAULT '[]';" \
        2>&1 && echo "OK" || echo "(already exists or failed - non-fatal)"

    echo "-- Fix 2: marking migration as applied..."
    sqlite3 "$DB_FILE" \
        "CREATE TABLE IF NOT EXISTS _migrations (\"file\" text PRIMARY KEY, applied integer);" \
        2>&1 || true
    sqlite3 "$DB_FILE" \
        "INSERT OR IGNORE INTO _migrations (file, applied) VALUES ('$MIGRATION', strftime('%s','now'));" \
        2>&1 && echo "OK" || echo "(failed - non-fatal)"

    echo "-- Migrations currently applied:"
    sqlite3 "$DB_FILE" "SELECT file FROM _migrations;" 2>&1 || echo "(error reading table)"
else
    echo "-- No database at $DB_FILE — fresh start"
fi

echo "=== Starting PocketBase ==="
exec /pb/pocketbase \
    --hooksDir=/pb/pb_hooks \
    --migrationsDir=/pb/pb_migrations \
    serve \
    --http=0.0.0.0:8090 \
    --dir=/pb/pb_data
