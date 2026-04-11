# Prompt: tela inicial + upload de plano + listagem (frontend)

Use o texto abaixo como especificação para implementar a interface (React, Vue, Angular ou HTML estático). Ajuste apenas stack e estilo visual conforme o projeto.

---

## Contexto

Existe uma API REST Spring Boot em **`http://localhost:9090`** (desenvolvimento). O frontend pode rodar em outra porta (ex.: `http://localhost:5173`). Se houver erro de CORS no navegador, o backend precisará permitir a origem do frontend (configurar CORS no Spring ou proxy no Vite/Webpack).

## Contrato da API (obrigatório seguir)

### 1. Upload de PDF (importar plano)

- **Método:** `POST`
- **URL:** `http://localhost:9090/api/v1/reading-plans`
- **Content-Type:** `multipart/form-data` — **não** definir manualmente o header `Content-Type` no cliente HTTP quando usar `FormData`; a biblioteca deve incluir o boundary automaticamente.
- **Campo do formulário:** o nome do campo deve ser exatamente **`file`** (minúsculo), como em `@RequestPart("file")` no backend.
- **Valor:** um único arquivo; o backend valida extensão `.pdf`.
- **Resposta de sucesso:** HTTP **201 Created** com JSON, por exemplo:
  ```json
  {
    "id": 1,
    "originalFilename": "plano.pdf",
    "importedAt": "2026-04-11T12:00:00Z",
    "daysImported": 90
  }
  ```
- **Resposta de erro:** HTTP **400** com JSON `{ "error": "mensagem" }` (PDF sem texto, formato inválido, arquivo vazio, etc.).

**Exemplo com `fetch` (JavaScript):**

```javascript
const formData = new FormData();
formData.append("file", arquivoPdf, arquivoPdf.name);

const res = await fetch("http://localhost:9090/api/v1/reading-plans", {
  method: "POST",
  body: formData,
  // Não enviar headers: { "Content-Type": "multipart/form-data" }
});

if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(err.error || res.statusText);
}
const data = await res.json();
```

### 2. Listar planos disponíveis

- **Método:** `GET`
- **URL:** `http://localhost:9090/api/v1/reading-plans`
- **Resposta:** array JSON de resumos, por exemplo:
  ```json
  [
    {
      "id": 1,
      "originalFilename": "plano.pdf",
      "importedAt": "2026-04-11T12:00:00Z",
      "dayCount": 90
    }
  ]
  ```

### 3. Detalhe de um plano (opcional para a primeira versão da tela de “planos disponíveis”)

- **Método:** `GET`
- **URL:** `http://localhost:9090/api/v1/reading-plans/{id}`
- **Resposta:** plano com lista de dias (`days`), cada item com `dayNumber`, `bookName`, `readingText`, `completed`, etc.

---

## Comportamento da interface (UX)

1. **Tela inicial (boas-vindas)**  
   - Mensagem de boas-vindas clara e amigável.  
   - **Dois botões principais:**
     - **“Enviar plano”** (ou “Importar PDF”) — abre o fluxo de upload.
     - **“Ver planos disponíveis”** — navega ou exibe a lista de planos (chama `GET /api/v1/reading-plans`).

2. **Modal / pop-up de upload** (ao clicar em “Enviar plano”)  
   - Abre um **modal** sobre a tela inicial (overlay + foco acessível: `role="dialog"`, `aria-modal="true"`, botão fechar e fechar com ESC se possível).  
   - Dentro do modal:
     - Um **input de arquivo** restrito a PDF: `accept="application/pdf,.pdf"`.  
     - Exibir o **nome do arquivo** após seleção (e opcionalmente tamanho).  
     - Botão **“Enviar”** ou **“Importar”** — só habilitado quando um arquivo `.pdf` estiver selecionado.  
     - Ao clicar em enviar: chamar o `POST` descrito acima com `FormData` e campo **`file`**.  
     - Estado de **loading** no botão durante a requisição (desabilitar duplo envio).  
     - **Sucesso (201):** mostrar feedback breve (toast ou mensagem no modal), depois **fechar o modal** e voltar à **mesma tela inicial** com os dois botões.  
     - **Erro (400 ou rede):** exibir a mensagem `error` do JSON ou texto genérico; **não** fechar o modal automaticamente para o usuário corrigir ou tentar de novo.  
     - Botão **“Cancelar”** / **“Fechar”** fecha o modal sem enviar e restaura a tela inicial.

3. **Tela ou seção “Planos disponíveis”** (ao clicar no segundo botão)  
   - Chamar `GET /api/v1/reading-plans`.  
   - Listar cada plano (nome do arquivo, data de importação, quantidade de dias).  
   - Opcional: link ou botão “Ver detalhes” que chama `GET /api/v1/reading-plans/{id}` e mostra os dias em tabela ou lista.  
   - Estado vazio: mensagem amigável quando não houver planos.

4. **Navegação**  
   - Após upload bem-sucedido, o usuário volta à **tela inicial com os dois botões**; pode então abrir “Ver planos disponíveis” para ver o plano recém-importado.

---

## Checklist técnico (evitar bugs com o backend)

| Item | Detalhe |
|------|---------|
| Nome do campo | Sempre **`file`** no `FormData.append("file", ...)` |
| Header multipart | Não sobrescrever `Content-Type` manualmente no POST |
| Base URL | Configurável por variável de ambiente (ex.: `VITE_API_URL`) para produção |
| CORS | Se o front e o back forem origens diferentes, habilitar CORS no Spring ou usar proxy de desenvolvimento |
| PDF | Apenas arquivos com texto selecionável funcionam; PDF só imagem retorna 400 com mensagem no `error` |

---

## Entregáveis sugeridos

- Componentes: `WelcomeScreen`, `UploadPlanModal`, `PlansList` (ou rotas equivalentes).  
- Serviço HTTP centralizado (`api.ts` / `readingPlanService.js`) com as três operações acima.  
- Tratamento de erro e loading em todas as chamadas.  
- Estilo responsivo e acessível (contraste, foco visível, labels no input de arquivo).

---

*Este documento reflete o backend do projeto `bread` (porta **9090**, endpoints `/api/v1/reading-plans`).*
