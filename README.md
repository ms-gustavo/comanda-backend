<body>
  <main class="container">
    <header>
      <h1>🍻 Comanda API</h1>
      <p class="lead">
        API para gerenciamento de <strong>comandas de bar/restaurante</strong>, construída com <strong>NestJS + Fastify + Prisma/PostgreSQL</strong>.
        Permite criar comandas, adicionar participantes e itens, dividir valores (rateio) e compartilhar acesso via <strong>Invite Token + QRCode</strong>.
      </p>
      <p>
        <span class="tag">NestJS</span>
        <span class="tag">Fastify</span>
        <span class="tag">Prisma</span>
        <span class="tag">PostgreSQL</span>
        <span class="tag">JWT Auth</span>
      </p>
    </header>

  <section>
      <h2>🚀 Stack</h2>
      <ul>
        <li><strong>Backend:</strong> NestJS + Fastify</li>
        <li><strong>ORM:</strong> Prisma + PostgreSQL</li>
        <li><strong>Auth:</strong> JWT (access + refresh), cookies HttpOnly</li>
        <li><strong>Validação:</strong> class-validator / DTOs</li>
        <li><strong>Realtime (próximo passo):</strong> Socket.IO</li>
        <li><strong>Extras:</strong> Logging JSON, Rate-limit, Exception filter global</li>
      </ul>
    </section>

  <section>
      <h2>📂 Estrutura</h2>
      <pre><code>src/

├─ app.module.ts
├─ auth/ # autenticação
│ ├─ auth.controller.ts
│ ├─ auth.service.ts
│ ├─ jwt.guard.ts
│ ├─ dto/
│ │ ├─ login.dto.ts
│ │ └─ register.dto.ts
├─ comanda/ # módulo principal
│ ├─ comanda.controller.ts
│ ├─ comanda.service.ts
│ ├─ comanda.repository.ts
│ ├─ dto/
│ │ ├─ create-comanda.dto.ts
│ │ ├─ create-item.dto.ts
│ │ ├─ update-item.dto.ts
│ │ ├─ put-item-rateio.dto.ts
│ │ ├─ create-invite.dto.ts
│ │ └─ accept-invite.dto.ts
├─ common/
│ ├─ filters/http-exception.filter.ts
│ ├─ interceptors/json-logger.interceptor.ts
│ └─ utils/etag.util.ts
└─ prisma/
├─ schema.prisma
├─ prisma.module.ts
└─ prisma.service.ts</code></pre>
</section>

  <section>
      <h2>🧰 Como rodar local</h2>
      <ol>
        <li>Tenha um PostgreSQL disponível e ajuste <code>DATABASE_URL</code> no <code>.env</code>.</li>
        <li>Instale dependências:
          <pre><code>pnpm install</code></pre>
        </li>
        <li>Rode as migrações e gere o client Prisma:
          <pre><code>npx prisma migrate dev

npx prisma generate</code></pre>
</li>
<li>Suba o servidor em desenvolvimento:
<pre><code>pnpm start:dev</code></pre>
</li>
</ol>
</section>

  <section>
      <h2>🔑 Autenticação</h2>
      <p>Fluxo implementado:</p>
      <ul>
        <li><code>POST /auth/register</code> → cria usuário com senha hasheada (argon2).</li>
        <li><code>POST /auth/login</code> → retorna <em>accessToken</em> (JWT) + grava <em>refresh_token</em> em cookie HttpOnly.</li>
        <li><code>GET /auth/me</code> → retorna usuário autenticado.</li>
        <li><code>POST /auth/refresh</code> → rotaciona refresh e retorna novo access token.</li>
        <li><code>POST /auth/logout</code> → revoga refresh token e limpa cookie.</li>
      </ul>
      <p>Extras: rate-limit no login (5 req/min), ExceptionFilter global padronizando JSON de erro.</p>
    </section>

  <section>
      <h2>📌 Endpoints principais</h2>

  <h3>Comandas</h3>
      <ul>
        <li><code>POST /comandas</code> — cria comanda (owner = usuário logado).</li>
        <li><code>GET /comandas</code> — lista comandas do usuário (owner + participant), filtros <code>role</code>, <code>status</code>, <code>q</code>, paginação por <strong>cursor</strong>.</li>
        <li><code>GET /comandas/:id/snapshot</code> — snapshot da comanda com <strong>ETag forte</strong> e <code>Cache-Control: stale-while-revalidate</code>.</li>
        <li><code>GET /comandas/:id/totals</code> — totais reais por participante, não atribuídos e geral.</li>
      </ul>

  <h3>Itens</h3>
      <ul>
        <li><code>POST /comandas/:id/items</code> — adiciona item (preço, qty, note, opcionalmente <code>assignedToId</code>).</li>
        <li><code>GET /comandas/:id/items</code> — lista itens da comanda.</li>
        <li><code>PATCH /items/:itemId</code> — atualiza item.</li>
        <li><code>DELETE /items/:itemId</code> — remove item.</li>
      </ul>

  <h3>Rateio</h3>
      <ul>
        <li><code>GET /items/:itemId/rateio</code> — lista rateio do item.</li>
        <li><code>PUT /items/:itemId/rateio</code> — substitui rateio (soma obrigatória = 100%).</li>
        <li><code>DELETE /items/:itemId/rateio/:participantId</code> — remove participante do rateio.</li>
        <li><em>Regra:</em> se item tem rateio, o rateio prevalece sobre <code>assignedToId</code>.</li>
      </ul>

  <h3>Invite Token + QR</h3>
      <ul>
        <li><code>POST /comandas/:id/invite</code> (owner only) — cria/rotaciona convite (<code>ttlHours</code>, <code>maxUses</code>, <code>keepExisting</code>).</li>
        <li><code>GET /invite/:code</code> (público) — preview do convite.</li>
        <li><code>POST /invite/:code/accept</code> — entrar na comanda (autenticado → vincula <code>userId</code>; anônimo → exige <code>displayName</code>).</li>
        <li><code>DELETE /comandas/:id/invite/:code</code> (owner only) — revoga convite.</li>
        <li><code>GET /comandas/:id/invite/:code/qrcode.png</code> — QR PNG do link público.</li>
      </ul>
    </section>

  <section>
      <h2>🗄️ Banco de Dados (Prisma Schema – resumo)</h2>
      <pre><code>model User {

id String @id @default(uuid())
email String @unique
password String
comandas Comanda[]
}

enum ComandaStatus {
OPEN
CLOSED
}

model Comanda {
id String @id @default(uuid())
name String
status ComandaStatus @default(OPEN)
ownerId String
owner User @relation(fields: [ownerId], references: [id])
participants Participant[]
items Item[]
inviteTokens InviteToken[]
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([ownerId])
@@index([createdAt])
}

model Participant {
id String @id @default(uuid())
name String
userId String?
comandaId String
comanda Comanda @relation(fields: [comandaId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([comandaId])
@@index([userId])
@@unique([comandaId, name])
}

model Item {
id String @id @default(uuid())
name String
price Decimal @db.Decimal(10, 2)
quantity Int @default(1)
note String?
comandaId String
comanda Comanda @relation(fields: [comandaId], references: [id], onDelete: Cascade)
assignedToId String?
assignedTo Participant? @relation(fields: [assignedToId], references: [id])

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([comandaId])
@@index([assignedToId])
}

model RateioEntry {
id String @id @default(uuid())
itemId String
item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
participantId String
participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
percentage Decimal @db.Decimal(5, 2)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([itemId, participantId])
@@index([participantId])
}

model InviteToken {
id String @id @default(uuid())
code String @unique
comandaId String
comanda Comanda @relation(fields: [comandaId], references: [id], onDelete: Cascade)
expiresAt DateTime
maxUses Int?
uses Int @default(0)
createdBy String
revokedAt DateTime?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([comandaId])
@@index([expiresAt])
}</code></pre>
</section>

  <section>
      <h2>⚙️ Variáveis de ambiente</h2>
      <pre><code>
        
# HTTP

PORT=
NODE_ENV=
CORS_ORIGINS=

# JWT

JWT_ACCESS_SECRET=
JWT_ACCESS_TTL=
JWT_REFRESH_SECRET=
JWT_REFRESH_TTL=

# Database

DATABASE_URL=

# App

APP_PUBLIC_URL=
FRONTEND_PUBLIC_URL=
INVITE_DEFAULT_TTL_HOURS=24</code></pre>
</section>

  <section>
      <h2>🧪 Testes manuais (checklist)</h2>
      <div class="grid cols-2">
        <div class="card">
          <h3>Auth</h3>
          <ul>
            <li>Registrar, login, refresh, logout.</li>
            <li>Rate-limit no login após 5 tentativas.</li>
          </ul>
        </div>
        <div class="card">
          <h3>Comandas</h3>
          <ul>
            <li>Criar comanda, listar (<code>role=owner|participant|all</code>).</li>
            <li>Snapshot com ETag (testar <code>If-None-Match</code>).</li>
            <li>Totals com e sem itens.</li>
          </ul>
        </div>
        <div class="card">
          <h3>Itens</h3>
          <ul>
            <li>Adicionar / listar / atualizar / deletar item.</li>
            <li>Totals reflete automaticamente.</li>
          </ul>
        </div>
        <div class="card">
          <h3>Rateio</h3>
          <ul>
            <li>50/50 e 33.33/33.33/33.34 (soma 100%).</li>
            <li>Totals distribuem conforme rateio.</li>
          </ul>
        </div>
        <div class="card">
          <h3>Invite</h3>
          <ul>
            <li>Criar convite (<code>maxUses=2</code>).</li>
            <li>Aceitar logado e anônimo (<code>displayName</code>).</li>
            <li>Tentar 3ª vez → erro de limite.</li>
            <li>Baixar QR e abrir link público.</li>
          </ul>
        </div>
      </div>
    </section>

  <section>
      <h2>🔮 Próximos passos</h2>
      <ul>
        <li>Realtime (Socket.IO) → broadcast de alterações.</li>
        <li>Fechamento da comanda → serviço/taxa, divisão igual/restante e resumo final.</li>
        <li>Exportar/compartilhar resumo (PDF/CSV).</li>
        <li>Frontend Web (React + Zustand) e Mobile (Expo).</li>
      </ul>
    </section>

  <section>
      <h2>📜 Licença</h2>
      <p>MIT — use à vontade 🍻</p>
    </section>

  <hr />

  <section>
      <h2>🧾 Comandos úteis</h2>
      <pre><code>
        
# Dependências

pnpm install

# Prisma

npx prisma migrate dev
npx prisma generate
pnpm db:status # (se existir no package.json)
pnpm db:studio # Prisma Studio

# Dev

pnpm start:dev</code></pre>
</section>

  </main>
</body>
</html>
