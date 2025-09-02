# 📱 API Documentation - Comanda Backend

**Documentação completa para integração com aplicação mobile**

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração Base](#configuração-base)
3. [Autenticação](#autenticação)
4. [Gerenciamento de Comandas](#gerenciamento-de-comandas)
5. [Gerenciamento de Itens](#gerenciamento-de-itens)
6. [Sistema de Rateio](#sistema-de-rateio)
7. [Sistema de Convites](#sistema-de-convites)
8. [Fechamento de Comanda](#fechamento-de-comanda)
9. [Modelos de Dados](#modelos-de-dados)
10. [Códigos de Status](#códigos-de-status)
11. [Headers e Autenticação](#headers-e-autenticação)
12. [Exemplos de Implementação](#exemplos-de-implementação)

---

## 🎯 Visão Geral

A API Comanda Backend é uma solução RESTful construída com **NestJS + Fastify** que permite o gerenciamento colaborativo de comandas de restaurante/bar. O sistema suporta:

- ✅ Autenticação JWT com refresh tokens
- ✅ Criação e gerenciamento de comandas compartilhadas
- ✅ Sistema de convites com QR Code
- ✅ Rateio inteligente de itens entre participantes
- ✅ Fechamento automático com cálculos de taxas
- ✅ Cache inteligente com ETags

---

## 🔧 Configuração Base

### URL Base

```
https://seu-dominio.com
```

### Headers Obrigatórios

```http
Content-Type: application/json
Accept: application/json
```

### Rate Limiting

- **Login**: 5 tentativas por minuto
- **Demais endpoints**: Sem limite específico

---

## 🔐 Autenticação

### 1. Registro de Usuário

**POST** `/auth/register`

```json
{
  "email": "user@example.com",
  "displayName": "João Silva",
  "password": "123456"
}
```

**Resposta (201):**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "João Silva",
  "createdAt": "2025-09-02T10:00:00.000Z"
}
```

### 2. Login

**POST** `/auth/login`

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Resposta (200):**

```json
{
  "accessToken": "jwt_token_here",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "João Silva",
    "createdAt": "2025-09-02T10:00:00.000Z"
  }
}
```

**Cookie automático:** `refresh_token` (HttpOnly, Secure)

### 3. Verificar Usuário Logado

**GET** `/auth/me`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

**Resposta (200):**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "João Silva",
  "createdAt": "2025-09-02T10:00:00.000Z"
}
```

### 4. Renovar Token

**POST** `/auth/refresh`

> ⚠️ **Importante:** Utiliza o cookie `refresh_token` automaticamente

**Resposta (200):**

```json
{
  "accessToken": "new_jwt_token",
  "expiresIn": 3600
}
```

### 5. Logout

**POST** `/auth/logout`

**Resposta (200):**

```json
{
  "ok": true
}
```

---

## 🍽️ Gerenciamento de Comandas

### 1. Listar Minhas Comandas

**GET** `/comandas?role={role}&status={status}&q={search}&cursor={cursor}&limit={limit}`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `role`: `owner` | `participant` | `all` (default: `all`)
- `status`: `OPEN` | `CLOSED` | `CANCELLED`
- `q`: Termo de busca (nome da comanda)
- `cursor`: Cursor para paginação
- `limit`: Itens por página (default: 20, max: 100)

**Resposta (200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Jantar na Pizzaria",
      "status": "OPEN",
      "ownerId": "uuid",
      "createdAt": "2025-09-02T10:00:00.000Z",
      "updatedAt": "2025-09-02T10:30:00.000Z",
      "participantsCount": 4,
      "isOwner": true,
      "isParticipant": false
    }
  ],
  "nextCursor": "cursor_string",
  "hasMore": true
}
```

### 2. Criar Nova Comanda

**POST** `/comandas`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

```json
{
  "name": "Jantar na Pizzaria",
  "participants": ["Maria", "João", "Ana"]
}
```

**Resposta (201):**

```json
{
  "id": "uuid",
  "name": "Jantar na Pizzaria",
  "status": "OPEN",
  "ownerId": "uuid",
  "createdAt": "2025-09-02T10:00:00.000Z",
  "participantsCount": 4
}
```

### 3. Snapshot da Comanda (com Cache)

**GET** `/comandas/{id}/snapshot`

**Headers:**

```http
Authorization: Bearer {accessToken}
If-None-Match: "etag_value"
```

**Resposta (200) ou (304 Not Modified):**

```json
{
  "id": "uuid",
  "name": "Jantar na Pizzaria",
  "status": "OPEN",
  "ownerId": "uuid",
  "createdAt": "2025-09-02T10:00:00.000Z",
  "updatedAt": "2025-09-02T10:30:00.000Z",
  "participants": [
    {
      "id": "uuid",
      "name": "João Silva",
      "userId": "uuid"
    },
    {
      "id": "uuid",
      "name": "Maria",
      "userId": null
    }
  ]
}
```

**Response Headers:**

```http
ETag: "strong_etag"
Cache-Control: public, max-age=0, must-revalidate, stale-while-revalidate=30
```

### 4. Totais da Comanda

**GET** `/comandas/{id}/totals`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

**Resposta (200):**

```json
{
  "subtotal": "85.50",
  "serviceFeePct": "10.00",
  "serviceFee": "8.55",
  "discountPct": "0.00",
  "discount": "0.00",
  "total": "94.05",
  "itemsCount": 8
}
```

---

## 🍕 Gerenciamento de Itens

### 1. Listar Itens da Comanda

**GET** `/comandas/{id}/items`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

**Resposta (200):**

```json
[
  {
    "id": "uuid",
    "name": "Pizza Margherita",
    "price": "45.50",
    "quantity": 2,
    "note": "Sem cebola",
    "comandaId": "uuid",
    "assignedToId": "uuid",
    "assignedTo": {
      "id": "uuid",
      "name": "João Silva"
    },
    "createdAt": "2025-09-02T10:00:00.000Z",
    "updatedAt": "2025-09-02T10:30:00.000Z"
  }
]
```

### 2. Adicionar Item

**POST** `/comandas/{id}/items`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

```json
{
  "name": "Pizza Margherita",
  "price": "45.50",
  "quantity": 2,
  "note": "Sem cebola",
  "assignedToId": "uuid"
}
```

**Resposta (201):**

```json
{
  "id": "uuid",
  "name": "Pizza Margherita",
  "price": "45.50",
  "quantity": 2,
  "note": "Sem cebola",
  "comandaId": "uuid",
  "assignedToId": "uuid",
  "createdAt": "2025-09-02T10:00:00.000Z",
  "updatedAt": "2025-09-02T10:30:00.000Z"
}
```

### 3. Atualizar Item

**PATCH** `/comandas/items/{itemId}`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

```json
{
  "name": "Pizza Margherita Grande",
  "price": "52.00",
  "quantity": 1,
  "note": "Sem cebola, borda recheada",
  "assignedToId": "uuid"
}
```

### 4. Remover Item

**DELETE** `/comandas/items/{itemId}`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

**Resposta (204):** Sem conteúdo

---

## 💰 Sistema de Rateio

### 1. Obter Rateio de um Item

**GET** `/comandas/items/{itemId}/rateio`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

**Resposta (200):**

```json
{
  "itemId": "uuid",
  "entries": [
    {
      "participantId": "uuid",
      "participantName": "João Silva",
      "percentage": "50.00"
    },
    {
      "participantId": "uuid",
      "participantName": "Maria",
      "percentage": "50.00"
    }
  ],
  "totalPercentage": "100.00"
}
```

### 2. Definir Rateio Completo

**PUT** `/comandas/items/{itemId}/rateio`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

```json
{
  "entries": [
    {
      "participantId": "uuid",
      "percentage": 60.0
    },
    {
      "participantId": "uuid",
      "percentage": 40.0
    }
  ]
}
```

**Resposta (200):**

```json
{
  "itemId": "uuid",
  "entries": [
    {
      "participantId": "uuid",
      "participantName": "João Silva",
      "percentage": "60.00"
    },
    {
      "participantId": "uuid",
      "participantName": "Maria",
      "percentage": "40.00"
    }
  ]
}
```

### 3. Remover Participante do Rateio

**DELETE** `/comandas/items/{itemId}/rateio/{participantId}`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

**Resposta (204):** Sem conteúdo

---

## 🎫 Sistema de Convites

### 1. Criar Convite

**POST** `/comandas/{id}/invite`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

```json
{
  "expiresAt": "2025-09-03T10:00:00.000Z",
  "maxUses": 10
}
```

**Resposta (201):**

```json
{
  "id": "uuid",
  "code": "ABC123DEF",
  "comandaId": "uuid",
  "expiresAt": "2025-09-03T10:00:00.000Z",
  "maxUses": 10,
  "uses": 0,
  "createdBy": "uuid",
  "createdAt": "2025-09-02T10:00:00.000Z"
}
```

### 2. Visualizar Convite (Público)

**GET** `/comandas/invite/{code}`

> ⚠️ **Endpoint público** - não requer autenticação

**Resposta (200):**

```json
{
  "code": "ABC123DEF",
  "status": "active",
  "comanda": {
    "id": "uuid",
    "name": "Jantar na Pizzaria",
    "owner": {
      "displayName": "João Silva"
    }
  },
  "expiresAt": "2025-09-03T10:00:00.000Z",
  "maxUses": 10,
  "uses": 3
}
```

**Possíveis status:**

- `active`: Convite válido
- `expired`: Expirado
- `max_uses_reached`: Limite de usos atingido
- `revoked`: Revogado pelo criador

### 3. Aceitar Convite

**POST** `/comandas/invite/{code}/accept`

**Headers (Opcional):**

```http
Authorization: Bearer {accessToken}
```

```json
{
  "displayName": "Maria Silva"
}
```

**Resposta (200):**

```json
{
  "success": true,
  "participantId": "uuid",
  "comandaId": "uuid",
  "message": "Você foi adicionado à comanda!"
}
```

### 4. QR Code do Convite

**GET** `/comandas/{comandaId}/invite/{code}/qrcode.png`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

**Resposta (200):**

```
Content-Type: image/png
```

> Retorna imagem PNG do QR Code

### 5. Revogar Convite

**DELETE** `/comandas/{comandaId}/invite/{code}`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

**Resposta (204):** Sem conteúdo

---

## 🧾 Fechamento de Comanda

### 1. Fechar Comanda

**POST** `/comandas/{id}/close`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

```json
{
  "serviceFeePct": 10,
  "discountPct": 5,
  "extras": [
    {
      "label": "Couvert Artístico",
      "amount": 8.0
    }
  ],
  "roundStrategy": "per_person",
  "roundTo": 0.05
}
```

**Resposta (200):**

```json
{
  "comandaId": "uuid",
  "status": "CLOSED",
  "closedAt": "2025-09-02T15:30:00.000Z",
  "closedById": "uuid",
  "serviceFeePct": "10.00",
  "discountPct": "5.00",
  "extras": [
    {
      "label": "Couvert Artístico",
      "amount": "8.00"
    }
  ],
  "lines": [
    {
      "participantId": "uuid",
      "name": "João Silva",
      "subtotal": "45.50",
      "serviceFee": "4.55",
      "extras": "4.00",
      "discount": "2.73",
      "total": "51.32"
    }
  ],
  "grandTotal": "124.85"
}
```

### 2. Obter Resumo de Fechamento

**GET** `/comandas/{id}/close/summary`

**Headers:**

```http
Authorization: Bearer {accessToken}
```

> Retorna o mesmo formato da resposta do fechamento

---

## 📊 Modelos de Dados

### Usuario

```typescript
{
  id: string;
  email: string;
  displayName: string;
  createdAt: string; // ISO 8601
}
```

### Comanda

```typescript
{
  id: string;
  name: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  ownerId: string;
  serviceFeePct: string; // Decimal
  discountPct: string; // Decimal
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  closedAt?: string; // ISO 8601
  closedById?: string;
  participants: Participant[];
  items?: Item[];
}
```

### Participante

```typescript
{
  id: string;
  name: string;
  userId?: string; // Null se for convidado sem conta
  comandaId: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### Item

```typescript
{
  id: string;
  name: string;
  price: string; // Decimal as string
  quantity: number;
  note?: string;
  comandaId: string;
  assignedToId?: string;
  assignedTo?: Participant;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### Token de Convite

```typescript
{
  id: string;
  code: string;
  comandaId: string;
  expiresAt: string; // ISO 8601
  maxUses?: number;
  uses: number;
  createdBy: string;
  revokedAt?: string; // ISO 8601
  createdAt: string; // ISO 8601
}
```

---

## 🚨 Códigos de Status

### Sucesso

- **200**: OK - Operação realizada com sucesso
- **201**: Created - Recurso criado com sucesso
- **204**: No Content - Operação realizada, sem conteúdo de retorno
- **304**: Not Modified - Recurso não modificado (cache válido)

### Erro do Cliente

- **400**: Bad Request - Dados inválidos ou malformados
- **401**: Unauthorized - Token inválido ou ausente
- **403**: Forbidden - Usuário sem permissão
- **404**: Not Found - Recurso não encontrado
- **409**: Conflict - Conflito de dados (ex: email já existe)
- **422**: Unprocessable Entity - Erro de validação
- **429**: Too Many Requests - Rate limit excedido

### Erro do Servidor

- **500**: Internal Server Error - Erro interno do servidor

---

## 🔑 Headers e Autenticação

### Headers Necessários

**Para endpoints autenticados:**

```http
Authorization: Bearer {accessToken}
Content-Type: application/json
Accept: application/json
```

**Para cache (snapshot):**

```http
If-None-Match: "{etag_value}"
```

### Gerenciamento de Tokens

1. **Access Token**: JWT com duração de 1 hora
2. **Refresh Token**: Cookie HttpOnly com duração de 7 dias
3. **Renovação automática**: Use `/auth/refresh` quando receber 401

---

## 💡 Exemplos de Implementação

### Configuração do Cliente HTTP (JavaScript/TypeScript)

```typescript
class ComandaAPI {
  private baseURL = 'https://sua-api.com';
  private accessToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers, credentials: 'include' });

    // Auto-refresh token em caso de 401
    if (response.status === 401 && this.accessToken) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        return fetch(url, { ...options, headers, credentials: 'include' });
      }
    }

    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      return data;
    }

    throw new Error('Login failed');
  }

  async refreshToken() {
    const response = await this.request('/auth/refresh', { method: 'POST' });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    }

    this.accessToken = null;
    localStorage.removeItem('accessToken');
    return false;
  }

  async getComandasSnapshot(comandaId: string, etag?: string) {
    const headers = etag ? { 'If-None-Match': etag } : {};
    const response = await this.request(`/comandas/${comandaId}/snapshot`, { headers });

    if (response.status === 304) {
      return { notModified: true };
    }

    const data = await response.json();
    const newEtag = response.headers.get('ETag');

    return { data, etag: newEtag };
  }
}
```

### Gerenciamento de Estado (React/React Native)

```typescript
// Hook customizado para comandas
function useComanda(comandaId: string) {
  const [comanda, setComanda] = useState(null);
  const [etag, setEtag] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadComanda() {
      setLoading(true);
      try {
        const result = await api.getComandasSnapshot(comandaId, etag);

        if (!result.notModified) {
          setComanda(result.data);
          setEtag(result.etag);
        }
      } catch (error) {
        console.error('Erro ao carregar comanda:', error);
      } finally {
        setLoading(false);
      }
    }

    loadComanda();
  }, [comandaId]);

  const refreshComanda = useCallback(async () => {
    const result = await api.getComandasSnapshot(comandaId, etag);
    if (!result.notModified) {
      setComanda(result.data);
      setEtag(result.etag);
    }
  }, [comandaId, etag]);

  return { comanda, loading, refresh: refreshComanda };
}
```

### Tratamento de Erros

```typescript
class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any,
  ) {
    super(message);
  }
}

async function handleAPIResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    switch (response.status) {
      case 400:
        throw new APIError(400, 'BAD_REQUEST', 'Dados inválidos', errorData);
      case 401:
        throw new APIError(401, 'UNAUTHORIZED', 'Token inválido ou expirado');
      case 403:
        throw new APIError(403, 'FORBIDDEN', 'Sem permissão para esta ação');
      case 404:
        throw new APIError(404, 'NOT_FOUND', 'Recurso não encontrado');
      case 409:
        throw new APIError(409, 'CONFLICT', 'Conflito de dados', errorData);
      case 422:
        throw new APIError(422, 'VALIDATION_ERROR', 'Erro de validação', errorData);
      case 429:
        throw new APIError(
          429,
          'RATE_LIMIT',
          'Muitas tentativas, tente novamente em alguns minutos',
        );
      default:
        throw new APIError(response.status, 'UNKNOWN', 'Erro desconhecido');
    }
  }

  return response.json();
}
```

---

## 🚀 Boas Práticas para Mobile

### 1. Cache Inteligente

- Use ETags para evitar transferências desnecessárias
- Implemente cache local para melhorar performance offline
- Atualize dados apenas quando necessário

### 2. Gerenciamento de Tokens

- Armazene tokens de forma segura (Keychain/Keystore)
- Implemente refresh automático
- Trate expiração de tokens graciosamente

### 3. Interface de Usuário

- Implemente loading states
- Forneça feedback visual para operações
- Trate estados de erro com mensagens amigáveis

### 4. Sincronização

- Use WebSockets ou polling para atualizações em tempo real
- Implemente retry automático para operações falhadas
- Considere operações offline com sincronização posterior

### 5. Performance

- Implemente paginação adequada
- Use lazy loading para listas grandes
- Otimize imagens (QR codes)

---

## 📞 Suporte

Para dúvidas ou problemas com a API:

1. Verifique os logs de erro no console
2. Confirme se os headers estão corretos
3. Valide os dados de entrada
4. Verifique a conectividade de rede
5. Teste com ferramentas como Postman/Insomnia

---

**Versão da Documentação:** 1.0  
**Data de Atualização:** 02/09/2025  
**Backend Version:** 0.1.0
