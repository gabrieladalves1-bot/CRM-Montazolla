FROM alpine:3.20

# Fixado em v0.22.46 — compatível com nossos hooks (API v0.22)
ARG PB_VERSION=0.22.46

RUN apk add --no-cache ca-certificates unzip curl sqlite

RUN curl -fsSL --retry 3 --retry-delay 5 --connect-timeout 30 --max-time 120 \
      "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
      -o /tmp/pb.zip \
    && unzip -o /tmp/pb.zip -d /pb \
    && rm /tmp/pb.zip \
    && chmod +x /pb/pocketbase

COPY pocketbase/hooks /pb/pb_hooks
COPY pocketbase/migrations /pb/pb_migrations

# Write startup script directly (avoids Windows CRLF issues from COPY)
RUN printf '#!/bin/sh\n\
DB=/pb/pb_data/data.db\n\
M=1673167670_multi_match_migrate.go\n\
if [ -f "$DB" ]; then\n\
  sqlite3 "$DB" "ALTER TABLE _collections ADD COLUMN schema TEXT NOT NULL DEFAULT '\''[]'\''" 2>/dev/null || true\n\
  sqlite3 "$DB" "CREATE TABLE IF NOT EXISTS _migrations(file text PRIMARY KEY,applied integer)" 2>/dev/null || true\n\
  sqlite3 "$DB" "INSERT OR IGNORE INTO _migrations(file,applied) VALUES('\''$M'\'',strftime('\''%%s'\'','\''now'\''))" 2>/dev/null || true\n\
fi\n\
exec /pb/pocketbase --hooksDir=/pb/pb_hooks --migrationsDir=/pb/pb_migrations serve --http=0.0.0.0:8090 --dir=/pb/pb_data\n' > /pb/start.sh \
    && chmod +x /pb/start.sh

WORKDIR /pb

EXPOSE 8090

CMD ["/pb/start.sh"]
