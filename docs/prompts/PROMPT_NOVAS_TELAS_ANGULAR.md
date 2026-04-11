# Prompt: novas telas (Angular — padrões do projeto **daily**)

Use este texto ao pedir implementação de **novas páginas, fluxos ou modais** no frontend. O agente ou dev deve **seguir a stack e convenções abaixo**, não reinventar padrões paralelos.

---

## Stack

- **Angular 17+**, componentes **standalone** (`standalone: true`).
- Estilos: **SCSS** por componente (`styleUrl`) + tokens globais em `src/styles.scss`.
- Rotas filhas do **`MainLayoutComponent`** em `app.routes.ts` (sidebar + `<router-outlet>`).
- Ícones: **Unicons** (`uil uil-*`), já referenciados no layout.

---

## HTTP e configuração

- **Base URL:** `src/environments/environment.ts` — propriedade `apiUrl` (ex.: dev `http://localhost:9090`). Build de produção usa `environment.prod.ts` via `fileReplacements` no `angular.json`.
- **HttpClient:** em `app.config.ts` usar **`provideHttpClient()`** — **não** usar `withFetch()` salvo exceção documentada. O backend padrão com XHR mantém integração com **Zone.js** e evita tela “travada” após respostas 200.
- Chamadas HTTP: centralizar em **serviços** (`@Injectable({ providedIn: 'root' })`), tipos TypeScript para request/response, `catchError` com mensagens legíveis.
- **Multipart / upload:** `FormData.append('file', ...)` — **nunca** setar header `Content-Type` manualmente no `POST` com `FormData`.

---

## Zone.js, signals e UI que não atualiza

Após `HttpClient` (com XHR), se ainda houver caso em que a UI não reflita o fim da requisição:

- Envolver atualizações de **signals** em **`inject(NgZone).run(() => { ... })`** nos callbacks de `subscribe`.
- Para flags de loading, pode-se usar **`finalize()`** do RxJS para garantir `loading.set(false)` após sucesso ou erro (cuidado com **ordem**: em fluxos que chamam `close()` dependendo de `loading === false`, liberar o loading **antes** de `close()`).

---

## SSR / hidratação / dados só no browser

- Chamadas à API em telas com **SSR/prerender**: preferir disparar o fetch **após o primeiro render no cliente**, por exemplo **`afterNextRender(() => ...)`** no construtor/injeção, para não bater em `localhost` durante o build do servidor.
- Evitar depender de `window`/`document` no construtor sem checar plataforma.

---

## Templates (control flow do Angular 17)

- Usar `@if`, `@for`, `@else`.
- **Regra importante:** o alias `as` (`@if (expr; as x)`) **só é permitido no `@if` principal**. Não usar `@else if (foo(); as bar)`. Em vez disso, aninhar:

  ```html
  } @else {
    @if (foo(); as bar) {
      ...
    }
  }
  ```

---

## Modais

- Overlay + painel com **`role="dialog"`**, **`aria-modal="true"`**, título com `aria-labelledby`.
- **Fechar:** botão, clique no backdrop (se desejado), **Escape** (`@HostListener('document:keydown.escape')`).
- **z-index:** modais empilhados — subir índices (ex.: upload em um nível, detalhe em outro) para não ficar atrás.
- Se o fechar depender de estado (`uploading`, etc.), garantir ordem lógica nos callbacks (ver seção Zone acima).

---

## Estilo visual (consistência)

- Reutilizar classes globais quando existirem: **`.glass`**, **`.btn-primary`**, variáveis CSS (`--text-primary`, `--accent-purple`, etc.).
- **Atenção:** `.btn-primary` global em `styles.scss` pode ter **`margin-top`** — em barras de ação horizontais, **resetar** com `margin-top: 0` no escopo local e alinhar botões com **`display: inline-flex`**, **`align-items: center`**, **`min-height`** e padding coerente entre botões primário e secundário.

---

## Internacionalização de datas

- `LOCALE_ID` configurado para **`pt-BR`** no `app.config.ts`.
- `registerLocaleData` em `main.ts` / `main.server.ts` com locale **`pt`** e registro para **`'pt-BR'`** conforme o projeto.

---

## Rotas e navegação

- Novas rotas como **filhas** do layout principal, path em **kebab-case** (ex.: `reading-plans`).
- Links na sidebar em `main-layout.component.html` com `routerLink` / `routerLinkActive`.
- Componentes que usam **`RouterLink`**: nos testes unitários, incluir **`provideRouter([])`** (ou rotas de teste) no `TestBed`.

---

## Testes

- Após mudar templates que usam router ou signals, rodar **`ng test`** e **`ng build`** (dev).

---

## Checklist rápido antes de entregar

| Item | Verificação |
|------|-------------|
| API | `apiUrl` + endpoints no serviço, não URL hardcoded espalhada |
| HttpClient | Sem `withFetch()` no provider padrão |
| Loading | Flag limpa em sucesso e erro; cuidado com `finalize` vs `close()` |
| SSR | Fetch de dados sensível ao browser com `afterNextRender` quando aplicável |
| Template | `@if` aninhado onde precisar de `as` em ramos secundários |
| A11y | Dialog com rótulos e fechamento por teclado |
| Estilo | Botões na mesma linha alinhados; sem `margin-top` fantasma do `.btn-primary` |

---

## Documentos relacionados

- Contrato REST de planos de leitura: `docs/prompts/PROMPT_TELA_INICIAL_FRONTEND.md`

---

*Última orientação alinhada ao app **daily** (Angular, layout com sidebar, API Spring em dev na porta 9090).*
