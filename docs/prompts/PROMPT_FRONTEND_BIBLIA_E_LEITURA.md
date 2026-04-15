# Prompt para o frontend: Bíblia, versões e leitura do dia

Use este texto ao implementar ou pedir código para a UI que consome a API **bread** (`api-daily-bread`). Base URL configurável (ex.: `http://localhost:9090` em desenvolvimento). Todas as rotas REST usam prefixo **`/api/v1`**.

> **Onde guardar prompts de frontend:** sempre em `daily-bread-ui/docs/prompts/` (este repositório).

---

## Autenticação

- **Login:** `POST /api/v1/auth/login` — body `{ "username", "password" }` — resposta inclui `accessToken`, `refreshToken`, `tokenType`, `user`.
- **Refresh:** `POST /api/v1/auth/refresh` — `{ "refreshToken" }`.
- Rotas protegidas: header **`Authorization: Bearer <accessToken>`**.
- Rotas públicas: registro, login, refresh e **todos os GET sob `/api/v1/bible/**`**.

Em desenvolvimento, o backend pode criar usuário de teste (ver `application.properties` / seeder): credenciais típicas `teste` / `123456789` quando o seed está ativo.

---

## Bíblia (sem login)

Útil para explorador de Bíblia, comparação e troca de versão só por URL.

| Objetivo | Método e rota |
|----------|----------------|
| Listar versões + texto de atribuição/licença | `GET /api/v1/bible/versions` |
| 66 livros (número, abreviação, nome) | `GET /api/v1/bible/{version}/books` |
| Capítulo completo | `GET /api/v1/bible/{version}/books/{book}/chapters/{chapter}` |
| Um versículo | `GET /api/v1/bible/{version}/books/{book}/chapters/{chapter}/verses/{verse}` |
| Comparar o mesmo versículo nas 3 traduções | `GET /api/v1/bible/verse/compare?book=&chapter=&verse=` |

**`version`:** `nvi` | `ara` | `ntlh` (minúsculas). A terceira opção é **Nova Tradução na Linguagem de Hoje (NTLH)**, em português (SBB).

**`book`:** inteiro **1–66** (ordem protestante canônica; alinhado ao plano de leitura quando `bookNumber` vem do backend).

**Contratos JSON (resumo):**

- Capítulo: `versionId`, `bookNumber`, `abbrev`, `bookName`, `chapter`, `verses: [{ verse, text }]`.
- Versículo: `versionId`, `bookNumber`, `abbrev`, `bookName`, `chapter`, `verse`, `text`.
- Comparação: `bookNumber`, `abbrev`, `bookName` (referência NVI), `chapter`, `verse`, `versions: [{ versionId, title, text }]`.

**UX sugerida — trocar versão:** manter `book`, `chapter` (e `verse` se aplicável) e alterar só o segmento `{version}` na URL, ou refetch do capítulo/versículo com a nova versão.

**UX sugerida — comparar ao clicar num versículo:** chamar `GET .../verse/compare?book=&chapter=&verse=` e exibir as três colunas (ou abas) com `versions[]`.

---

## Progresso de leitura + “Bíblia do dia” (com login)

| Objetivo | Rota |
|----------|------|
| Dashboard (inclui `today` com blocos do dia) | `GET /api/v1/reading-progress/dashboard?date=` (date opcional, ISO) |
| **Leitura do dia já hidratada** com capítulos na versão escolhida | `GET /api/v1/reading-progress/today/bible?version=&date=` |

**`today/bible`:**

- `version` opcional — default **`nvi`**; valores: `nvi`, `ara`, `ntlh`.
- `date` opcional — default **hoje**; data de referência do plano (mesma lógica do dashboard).

**Resposta (`TodayBibleReadingResponse`):** `referenceDate`, `scheduledDayNumber`, `scheduledDate`, `versionId`, `dayCompleted`, `blocks[]`.

Cada **`TodayBibleBlockResponse`** inclui metadados do plano (`planDayId`, `dayNumber`, `bookName`, `startChapter`, `endChapter`, `readingText`, `completed`) e:

- `bookNumber`, `bookAbbrev` — quando o nome do livro do PDF foi reconhecido (caso contrário podem vir `null`).
- **`chapters`** — lista de objetos no mesmo formato do endpoint público de capítulo (`BibleChapterResponse`), já na `versionId` pedida. Se `bookNumber` for `null`, `chapters` pode vir vazio; use `readingText` como fallback.

**Dashboard — mudança útil para a UI:** em `today.blocks[]` (`TodayReadingBlockResponse`), o backend agora envia também **`bookNumber`** e **`bookAbbrev`** para montar links para a Bíblia sem depender só do nome livre do PDF.

---

## Fluxos recomendados na aplicação

1. **Tela inicial / dia:** `dashboard` ou `today/bible?version=<preferência do usuário>` para mostrar leitura + texto integral dos capítulos.
2. **Seletor de versão:** alterar query `version` em `today/bible` ou trocar `version` nas rotas `/api/v1/bible/...`.
3. **Leitura contínua:** usar `books/{book}/chapters/{chapter}` para navegar capítulos; versículo destacado via `verses/{verse}` se precisar de um trecho pontual.
4. **Comparação:** ao toque num versículo, `verse/compare` com os mesmos `book`, `chapter`, `verse` (os números são os mesmos nas três versões).

---

## Erros HTTP

- **401** em rotas protegidas sem token ou com token inválido — corpo típico `{ "error": "Não autenticado" }`.
- **404** — plano/dia/matrícula inexistente, versículo fora do capítulo, versão inválida, etc. — corpo `{ "error": "mensagem" }`.

---

## Collection Postman

No repositório **api-daily-bread**, importar **`postman/Daily-Bread-API.postman_collection.json`** (a partir da raiz desse repo, ou `../api-daily-bread/postman/Daily-Bread-API.postman_collection.json` se o workspace tiver os dois projetos lado a lado). Variáveis `baseUrl`, `accessToken`, `refreshToken`; o request **Login** grava tokens na collection.

---

## Licença e uso do texto bíblico

As respostas de `/api/v1/bible/versions` trazem **atribuições** por versão. O produto é **não comercial**; NVI/ARA têm restrições de direitos autorais — manter avisos na UI se necessário.
