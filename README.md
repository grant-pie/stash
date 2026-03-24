# Stash — Code Snippet Manager

A full-stack code snippet manager built with React 19, NestJS, PostgreSQL, and Tailwind CSS.

---

## Project structure

```
stash/
├── client/          # React 19 + Vite + Tailwind frontend
└── server/          # NestJS + TypeORM + PostgreSQL backend
```

---

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (running locally or via Docker)
- npm or pnpm

---

## Server setup

```bash
cd server

# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env — set DB credentials and JWT_SECRET

# 3. Start in development mode (auto-reloads, auto-syncs DB schema)
npm run start:dev
```

The API will be available at `http://localhost:3000/api`.

### Environment variables (`.env`)

| Variable        | Description                        | Default       |
|-----------------|------------------------------------|---------------|
| `DB_HOST`       | PostgreSQL host                    | `localhost`   |
| `DB_PORT`       | PostgreSQL port                    | `5432`        |
| `DB_USERNAME`   | PostgreSQL user                    | `postgres`    |
| `DB_PASSWORD`   | PostgreSQL password                | —             |
| `DB_NAME`       | Database name                      | `stash`       |
| `JWT_SECRET`    | Secret key for signing JWTs        | —             |
| `JWT_EXPIRES_IN`| Token expiry (e.g. `7d`)           | `7d`          |
| `PORT`          | HTTP port for the API              | `3000`        |

> **Note:** `synchronize: true` is enabled in development — TypeORM will create/update tables automatically. Disable this in production and use migrations instead.

---

## Client setup

```bash
cd client

# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

The Vite dev server proxies all `/api` requests to `http://localhost:3000`, so no CORS configuration is needed during development.

---

## API endpoints

### Auth

| Method | Path              | Description          |
|--------|-------------------|----------------------|
| POST   | `/api/auth/register` | Register a new user |
| POST   | `/api/auth/login`    | Log in, get JWT     |

### Snippets (JWT required)

| Method | Path                    | Description                      |
|--------|-------------------------|----------------------------------|
| GET    | `/api/snippets`         | List snippets (filterable)       |
| GET    | `/api/snippets/:id`     | Get a single snippet             |
| POST   | `/api/snippets`         | Create a snippet                 |
| PATCH  | `/api/snippets/:id`     | Update a snippet                 |
| DELETE | `/api/snippets/:id`     | Delete a snippet                 |

#### Snippet filter query params

| Param      | Description                           |
|------------|---------------------------------------|
| `search`   | Search by title or description        |
| `language` | Filter by language (exact match)      |
| `tag`      | Filter by tag (substring match)       |

---

## Tech stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 19, TypeScript, Vite          |
| Styling    | Tailwind CSS 3                      |
| Routing    | React Router v6                     |
| HTTP       | Axios (with JWT interceptor)        |
| Highlighting | highlight.js                      |
| Backend    | NestJS 10, TypeScript               |
| Auth       | JWT via `@nestjs/jwt` + Passport    |
| Database   | PostgreSQL                          |
| ORM        | TypeORM 0.3                         |

---

## Development notes

- Passwords are hashed with **bcrypt** (10 rounds).
- The `password` column uses `select: false` on the User entity so it is never accidentally returned in API responses.
- The axios instance stores the JWT in `localStorage` and attaches it as a `Bearer` token on every request. A 401 response clears the token and fires an `auth:logout` event that the `AuthContext` listens to.
- `synchronize: true` is only active when `NODE_ENV !== 'production'`.
