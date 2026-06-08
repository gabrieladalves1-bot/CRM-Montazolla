FROM alpine:3.20

# Fixado em v0.22.46 — compatível com nossos hooks (API v0.22)
ARG PB_VERSION=0.22.46

RUN apk add --no-cache ca-certificates unzip curl

RUN curl -fsSL \
      "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
      -o /tmp/pb.zip \
    && unzip -o /tmp/pb.zip -d /pb \
    && rm /tmp/pb.zip \
    && chmod +x /pb/pocketbase

COPY pocketbase/hooks /pb/pb_hooks
COPY pocketbase/migrations /pb/pb_migrations

WORKDIR /pb

EXPOSE 8090
