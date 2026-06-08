FROM alpine:3.20

RUN apk add --no-cache ca-certificates unzip curl

RUN LATEST=$(curl -fsSL -o /dev/null -w "%{url_effective}" \
      "https://github.com/pocketbase/pocketbase/releases/latest" \
      | sed 's|.*/v||') \
    && curl -fsSL \
       "https://github.com/pocketbase/pocketbase/releases/download/v${LATEST}/pocketbase_${LATEST}_linux_amd64.zip" \
       -o /tmp/pb.zip \
    && unzip -o /tmp/pb.zip -d /pb \
    && rm /tmp/pb.zip \
    && chmod +x /pb/pocketbase

COPY pocketbase/hooks /pb/pb_hooks
COPY pocketbase/migrations /pb/pb_migrations

WORKDIR /pb

EXPOSE 8090

# --hooksDir e --migrationsDir são flags GLOBAIS: devem vir ANTES de "serve"
CMD ["/bin/sh", "-c", "\
  if [ -n \"$ADMIN_EMAIL\" ] && [ -n \"$ADMIN_PASSWORD\" ]; then \
    ./pocketbase superuser create \"$ADMIN_EMAIL\" \"$ADMIN_PASSWORD\" 2>/dev/null || \
    ./pocketbase superuser update \"$ADMIN_EMAIL\" \"$ADMIN_PASSWORD\" 2>/dev/null || true; \
  fi; \
  exec ./pocketbase --hooksDir=/pb/pb_hooks --migrationsDir=/pb/pb_migrations \
    serve --http=0.0.0.0:${PORT:-8090} --dir=/pb/pb_data"]
