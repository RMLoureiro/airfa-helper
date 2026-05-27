# Airfa Helper

Management application for a philharmonic band. Built with **FastAPI** (Python), **PostgreSQL**, and **Next.js** (TypeScript).

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.11+ | Required for the backend |
| Node.js | 20+ | Required for the frontend (if running locally) |
| Bun | 1.3+ | Used as the frontend package manager |
| PostgreSQL | 16 | Can be run via Docker |
| Docker & Docker Compose | Any recent version | Recommended for running the full stack |

---

## Project Structure

```
airfa-helper/
├── backend/      # FastAPI application
├── frontend/     # Next.js application
└── infra/        # Docker Compose configuration
```

---

## Running with Docker Compose (Recommended)

### Local development

```bash
cd infra
docker compose up --build
```

This starts PostgreSQL (port `5432`), the backend API (port `8000`), and the frontend (port `3000`) with hot reload on both. On first start the database is migrated and seeded automatically.

### Production (VPS)

```bash
# 1. Create your environment file from the template
cp infra/.env.example infra/.env
# Edit infra/.env — fill in all passwords, SECRET_KEY, your domain URLs.

# 2. First deploy only: enable seed to create the initial admin account
#    Set RUN_SEED=true in infra/.env

# 3. Build and start
cd infra
docker compose -f docker-compose.prod.yml up -d --build

# 4. After the first start, set RUN_SEED=false in infra/.env and restart
docker compose -f docker-compose.prod.yml up -d
```

> **Note:** `NEXT_PUBLIC_API_URL` is baked into the frontend image at build time (Next.js limitation). If the API URL changes, rebuild the frontend image.

---

## Local Development (without Docker)

### 1. Start the Database

Either run PostgreSQL locally or spin up only the DB container:

```bash
cd infra
docker compose up db -d
```

Default database credentials:
- **Host:** `localhost:5432`
- **Database:** `airfa`
- **User:** `airfa`
- **Password:** `airfa` (Docker)

---

### 2. Backend Setup

```bash
cd backend
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

**Apply database migrations:**

```bash
alembic upgrade head
```

**Run the development server:**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

---

### 3. Run the Seed

The seed populates the database with sample users, events, instruments, repertoire, and other data.

From the `backend/` directory:

```bash
python -m app.seed.seed
```

#### Seed Accounts

| Username | Password | Role |
|----------|----------|------|
| `superadmin` | `admin123` | Super Admin |
| `admin` | `admin123` | Admin |
| `membro` | `admin123` | Regular member |
| `membro2` | `admin123` | Regular member |

> Passwords can be overridden via environment variables before running the seed:
> - `SEED_SUPER_ADMIN_PASSWORD`
> - `SEED_ADMIN_PASSWORD`
> - `SEED_REGULAR_PASSWORD`

#### Role Permissions

| Feature | Super Admin | Admin | Regular |
|---------|------------|-------|---------|
| Manage members | ✅ | ✅ | ❌ |
| Manage events | ✅ | ✅ | ❌ |
| Manage instruments | ✅ | ✅ | ❌ |
| Manage repertoire | ✅ | ✅ | ❌ |
| Mark attendances | ✅ | ✅ | ❌ |
| View all data | ✅ | ✅ | ✅ |
| Report instrument issues | ✅ | ✅ | ✅ |

---

### 4. Frontend Setup

```bash
cd frontend
```

**Install dependencies:**

```bash
bun install
```

**Run the development server:**

```bash
bun run dev
```

The frontend will be available at `http://localhost:3000`.

> The frontend expects the backend to be running at `http://localhost:8000`. This is configurable via the `NEXT_PUBLIC_API_URL` environment variable.

---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Auto-detected | Full PostgreSQL connection string |
| `SECRET_KEY` | `supersecret` | JWT signing secret — **change in production** |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Comma-separated list of allowed origins |
| `RUN_SEED` | `false` | Set to `true` to run the seed on startup |
| `SUPER_ADMIN_USERNAME` | `superadmin` | Username for the super admin account (seed) |
| `SUPER_ADMIN_NAME` | `Super Admin Airfa` | Display name for the super admin (seed) |
| `SEED_SUPER_ADMIN_PASSWORD` | `admin123` | Super admin password set by seed |
| `SEED_ADMIN_PASSWORD` | `admin123` | Admin password set by seed |
| `SEED_REGULAR_PASSWORD` | `admin123` | Regular member password set by seed |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |

---

## Running Tests

### Backend

From the `backend/` directory:

```bash
pytest
```

### Frontend (E2E with Playwright)

From the `frontend/` directory:

```bash
bun run test:e2e
```

This builds the app and then runs all Playwright tests.

---

## Database Migrations

Create a new migration after changing models:

```bash
cd backend
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

---

## Tech Stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy, Alembic, PostgreSQL, APScheduler, JWT (python-jose), bcrypt
- **Frontend:** Next.js 14, React 18, TypeScript
- **Testing:** pytest (backend), Playwright (frontend E2E)
- **Infrastructure:** Docker, Docker Compose (`docker-compose.yml` for dev, `docker-compose.prod.yml` for production)
