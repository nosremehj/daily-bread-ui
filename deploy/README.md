# Deploy do frontend (VPS / Docker)

Build de produção com `apiUrl` vazio: o browser chama `/api/v1/...` no mesmo host. O Nginx encaminha `/api/` para o container da API Spring (`api:9090` na rede Docker).

## Imagem só do front

Na raiz do repositório:

```bash
docker build -t daily-bread-ui .
docker run -p 8080:80 --network SUA_REDE_COM_O_SERVICO_api daily-bread-ui
```

O container precisa estar na **mesma rede Docker** que o serviço nomeado **`api`** (como no `docker-compose` do backend), para o `proxy_pass http://api:9090` resolver.

## Compose completo

Use o `docker-compose` do repositório da API (ou um compose unificado) para subir `postgres`, `api` e este serviço `web`, com `web` dependendo de `api` e ambos em `networks: internal`.
