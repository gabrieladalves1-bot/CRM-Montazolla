FROM alpine:3.19

RUN apk add --no-cache ca-certificates unzip curl

# Detecta a versão mais recente e baixa automaticamente
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

EXPOSE 8090

CMD ["/bin/sh", "-c", "/pb/pocketbase serve --http=0.0.0.0:${PORT:-8090} --dir=/pb/pb_data"]
