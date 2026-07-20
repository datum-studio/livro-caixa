# Livro-caixa de freelas — Datum Studio

App para controlar clientes, trabalhos (único ou mensal), pagamentos com
histórico retroativo, e gerar recibos em imagem para enviar por WhatsApp.
Dados salvos no Firebase (Firestore), site publicado no GitHub Pages —
sem tela de login.

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e crie um projeto novo
   (ex.: `livro-caixa-datum`).
2. **Firestore Database** → "Criar banco de dados" → modo produção →
   escolha a região (ex.: `southamerica-east1`).
3. Em **Configurações do projeto** (ícone de engrenagem) → "Seus apps"
   → clique no ícone `</>` para adicionar um app Web → dê um nome →
   copie o objeto `firebaseConfig` que aparece.
4. Cole esses valores em `src/firebase.js`, substituindo os
   placeholders (`SUA_API_KEY`, etc).

## 2. Regras do Firestore

Em **Firestore Database → Regras**, cole isto e publique:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /livro-caixa/{docId} {
      allow read, write: if true;
    }
  }
}
```

**Importante:** como você pediu, não há login — qualquer pessoa que
souber a URL do site (e o projeto do Firebase) consegue ler e editar
os dados. Isso é aceitável porque só você tem o link, mas não
compartilhe a URL publicamente. Se um dia quiser travar o acesso com
senha, é só eu adicionar de volta o login por e-mail/senha.

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## 4. Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `livro-caixa-datum`) e suba
   este projeto.
2. Em `vite.config.js`, confirme que `base` está com o nome exato do
   repositório: `base: "/livro-caixa-datum/"`.
3. Instale e rode o deploy:

```bash
npm run build
npm run deploy
```

Isso publica a pasta `dist/` na branch `gh-pages` (pacote `gh-pages`,
já incluso no `package.json`).

4. No GitHub, em **Settings → Pages**, confirme que a fonte é a
   branch `gh-pages`. O site fica em:
   `https://<seu-usuario>.github.io/livro-caixa-datum/`

## Recibos em imagem

Em cada pagamento lançado, clique no ícone de recibo (ao lado da
lixeira) para abrir uma prévia. O recibo mostra: cliente, referente a
qual trabalho, observação (se houver), data e valor pago, com um
carimbo "PAGO" — visual simples e profissional, sem poluição.
Clique em "Baixar imagem" e ele gera um PNG (nome já com cliente e
data) pronto para anexar direto numa conversa do WhatsApp.

## Estrutura dos dados no Firestore

Coleção `livro-caixa`, documento único `principal`, com um campo
`payload`:

```json
{
  "clients": [{ "id": "...", "name": "..." }],
  "jobs": [
    {
      "id": "...",
      "clientId": "...",
      "description": "...",
      "paymentType": "unico | mensal",
      "totalValue": 1500,
      "monthlyValue": null,
      "startDate": "2026-01-15"
    }
  ],
  "payments": [
    { "id": "...", "jobId": "...", "value": 500, "date": "2026-02-01", "note": "..." }
  ]
}
```

Trabalhos **mensais** têm `monthlyValue` fixo; o app calcula quantos
meses já passaram desde `startDate` e soma quanto seria devido no
total, subtraindo os pagamentos já lançados. Se um mês pagar menos
que o combinado, a diferença aparece como saldo devedor acumulado
para o mês seguinte.
