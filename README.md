# Pão diário — frontend

Interface web do **Daily Bread**: plano de leitura bíblica, autenticação (login, cadastro, perfil) e importação de planos em PDF. SPA em português (pt-BR).

## Stack

- [Angular](https://angular.io/) 17, TypeScript
- [Angular Material](https://material.angular.io/) + CDK
- SSR com Express (`@angular/ssr`)

## API (backend)

O backend é uma API REST **Spring Boot** (repositório separado). A base da URL vem de `src/environments/` (valor público centralizado em `deployed-api-url.ts`).

| Ambiente | URL base da API |
|----------|-----------------|
| Produção (`ng build`) | `deployed-api-url.ts` (API no EasyPanel) |
| Desenvolvimento local | `http://localhost:9090` |
| Imagem Docker (`build:vps`) | Mesma URL (`environment.vps.ts` → `deployed-api-url.ts`) |

Prefixo REST: `/api/v1` (ex.: `/api/v1/auth/login`, `/api/v1/reading-plans`).

### Frontend em produção

Hospede o build estático ou a imagem Docker conforme `deploy/README.md` e o `Dockerfile` (ex.: EasyPanel). O build padrão usa `environment.prod.ts`. Configure **CORS** no Spring para o domínio onde o front for servido.

## Pré-requisitos

- Node.js (recomendado: LTS compatível com o Angular 17)
- npm

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm start` ou `npm run start:local` | Dev server (`ng serve`) com API em **localhost:9090** |
| `npm run start:remote-api` | Dev server local chamando a API publicada (`deployed-api-url.ts`) |
| `npm run build` | Build de produção (saída em `dist/daily`) |
| `npm run build:vps` | Build para imagem Docker (`environment.vps.ts`) |
| `npm run watch` | Build em modo desenvolvimento com watch |
| `npm test` | Testes unitários (Karma/Jasmine) |
| `npm run serve:ssr:daily` | Servir o bundle SSR após `npm run build` (Node em `dist/daily/server`) |

Após `npm start`, abra [http://localhost:4200](http://localhost:4200) (porta padrão do CLI; outra porta pode ser exibida no terminal).

## Variáveis e ambientes

- **Desenvolvimento:** `src/environments/environment.ts` → API local.
- **Produção:** `src/environments/environment.prod.ts` + `deployed-api-url.ts`.
- **VPS / Docker:** `src/environments/environment.vps.ts` (build `vps`).
- **Dev contra API publicada:** `src/environments/environment.remote.ts` + script `start:remote-api`.

O Angular não carrega `.env` automaticamente — os valores ficam nos arquivos acima. Veja `.env.example` para referência rápida.

## Estrutura útil

- `src/app/services/` — `AuthService`, `ReadingPlanService`, etc.
- `src/app/interceptors/` — JWT e refresh (`auth.interceptor.ts`)
- `src/environments/` — URLs base por ambiente

## Documentação adicional

- Integração front/API: `docs/prompts/PROMPT_INTEGRACAO_FRONTEND_API.md`
- Swagger (API publicada): anexe `/swagger-ui.html` à URL em `deployed-api-url.ts`.

## Gerar código (Angular CLI)

```bash
ng generate component nome-do-componente
```

Veja `ng help` ou a [documentação do Angular CLI](https://angular.dev/tools/cli).
