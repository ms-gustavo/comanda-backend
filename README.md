# 🍻 Comanda App – Backend (MVP)

Este repositório contém o **setup inicial** (Fase 0) do backend com NestJS sobre Fastify, Prisma e PostgreSQL.

## 🚀 Como subir localmente (dev)

```bash
# 1) Banco
pnpm i
pnpm db:up

# 2) Variáveis de ambiente
cp .env.example .env
# edite .env conforme necessário

# 3) Prisma
pnpm prisma:format
pnpm prisma:migrate

# 4) Rodar o servidor (watch)
pnpm start:dev

# Healthcheck
curl http://localhost:$PORT/health
```

> Dica: use **pnpm**. Se preferir npm/yarn, remova o script `preinstall`.

## 🧱 O que já vem pronto
- NestJS com **Fastify**, Helmet, CORS com credenciais e compressão
- **Prisma** + schema com `User` e `RefreshToken`
- Interceptor global de logs em **JSON** (compatível com Loki)
- Docker Compose com **PostgreSQL 16**
- Rota `/health`

## 🗺️ Próximos passos (Fase 1 – Auth)
- Módulo Auth com registro, login, refresh, logout e `GET /auth/me`
- Guard JWT HTTP e WS
- Rate-limit no `/auth/login`
