# Deploy do frontend (VPS / Docker)

O build **`vps`** (`npm run build:vps`) usa a mesma URL pública da API que produção, definida em **`src/environments/deployed-api-url.ts`** (via `environment.vps.ts`).

## Imagem do front

Na raiz do repositório:

```bash
docker build -t daily-bread-ui .
docker run -p 8080:80 daily-bread-ui
```

O Nginx só serve o **Angular estático**; o browser chama a API em `apiUrl` (cross-origin). Configure **CORS** no Spring para a origem do front.

## Mudar a URL da API

Edite **`src/environments/deployed-api-url.ts`** (sem barra no final) e faça **rebuild** da imagem e/ou `npm run build`.
