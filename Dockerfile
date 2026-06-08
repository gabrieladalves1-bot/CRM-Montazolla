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

WORKDIR /pb

EXPOSE 8090

CMD ["/pb/pocketbase", "--hooksDir=/pb/pb_hooks", "--migrationsDir=/pb/pb_migrations", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]
