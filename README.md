# Pão diário — frontend

Interface web do **Daily Bread**: plano de leitura bíblica, autenticação (login, cadastro, perfil) e importação de planos em PDF. SPA em português (pt-BR).

## Stack

- [Angular](https://angular.io/) 17, TypeScript
- [Angular Material](https://material.angular.io/) + CDK
- SSR com Express (`@angular/ssr`)

## API (backend)

O backend é uma API REST **Spring Boot** (repositório separado). O frontend **não** fixa URLs completas nos serviços: a base vem de `src/environments/`.

| Ambiente | URL base da API |
|----------|-----------------|
| Produção | `https://api-daily-bread.onrender.com` |
| Desenvolvimento local | `http://localhost:9090` |

Prefixo REST: `/api/v1` (ex.: `/api/v1/auth/login`, `/api/v1/reading-plans`).

### Frontend em produção

A aplicação está hospedada na **Vercel**: [https://daily-bread-ui.vercel.app](https://daily-bread-ui.vercel.app)

O build de produção usa `environment.prod.ts` e aponta para a API no Render. Se aparecer erro de **CORS** no navegador, o ajuste é no backend (origens permitidas), não só no Angular.

## Pré-requisitos

- Node.js (recomendado: LTS compatível com o Angular 17)
- npm

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm start` ou `npm run start:local` | Dev server (`ng serve`) com API em **localhost:9090** |
| `npm run start:remote-api` | Mesmo dev server, mas chamadas para a API no **Render** (útil para testar o back deployado) |
| `npm run build` | Build de produção (saída em `dist/daily`) |
| `npm run watch` | Build em modo desenvolvimento com watch |
| `npm test` | Testes unitários (Karma/Jasmine) |
| `npm run serve:ssr:daily` | Servir o bundle SSR após `npm run build` (Node em `dist/daily/server`) |

Após `npm start`, abra [http://localhost:4200](http://localhost:4200) (porta padrão do CLI; outra porta pode ser exibida no terminal).

## Variáveis e ambientes

- **Desenvolvimento:** `src/environments/environment.ts` → API local.
- **Produção (Vercel):** `src/environments/environment.prod.ts` → API Render (substituição via `angular.json` no build).
- **Dev contra API remota:** `src/environments/environment.remote.ts`, usado pelo script `start:remote-api`.

Há um `.env.example` na raiz com referência às URLs; o Angular não carrega `.env` automaticamente — os valores ficam nos arquivos de environment acima.

## Estrutura útil

- `src/app/services/` — `AuthService`, `ReadingPlanService`, etc.
- `src/app/interceptors/` — JWT e refresh (`auth.interceptor.ts`)
- `src/environments/` — URLs base por ambiente

## Documentação adicional

- Integração front/API: `docs/prompts/PROMPT_INTEGRACAO_FRONTEND_API.md`
- Swagger da API em produção: [https://api-daily-bread.onrender.com/swagger-ui.html](https://api-daily-bread.onrender.com/swagger-ui.html)

## Gerar código (Angular CLI)

```bash
ng generate component nome-do-componente
```

Veja `ng help` ou a [documentação do Angular CLI](https://angular.dev/tools/cli).
