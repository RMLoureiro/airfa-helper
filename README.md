# Airfa Helper

Airfa Helper é uma aplicação para gestão de banda filarmónica com backend em FastAPI, base de dados PostgreSQL e frontend em Next.js + TypeScript.

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL
- Frontend: Next.js 14, React 18, TypeScript
- Autenticação: JWT com papéis `SUPER_ADMIN`, `ADMIN` e `REGULAR`
- Ficheiros: PDFs do repertório em disco local

## Funcionalidades principais

- Login e área autenticada
- Home com eventos, newsletter e aniversários
- Gestão de membros e perfis
- Eventos com notificações in-app
- Newsletter com feed recente
- Presenças e analytics
- Instrumentos e reports de problemas
- Repertório com PDFs por obra
- Notificações in-app

## Estrutura

- `backend/` - API FastAPI, modelos, migrações e testes
- `frontend/` - aplicação Next.js
- `infra/` - ficheiros auxiliares de infraestrutura

## Requisitos

- Python 3.11+ para o backend
- Node.js 18+ para o frontend
- PostgreSQL 16 local
- No ambiente atual, comandos do backend têm sido executados via WSL

## Variáveis de ambiente

Backend:

- `DATABASE_URL` - string de ligação PostgreSQL
- `SECRET_KEY` - chave JWT
- `SUPER_ADMIN_EMAIL` - email do primeiro super-admin
- `SUPER_ADMIN_PASSWORD` - password do seed
- `SUPER_ADMIN_NAME` - nome do seed
- `REPERTOIRE_FILES_DIR` - pasta local dos PDFs do repertório

Frontend:

- `NEXT_PUBLIC_API_URL` - URL base da API, por exemplo `http://localhost:8000`

## Setup do backend

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Se estiveres a trabalhar no Windows com o backend a correr em WSL, usa uma `DATABASE_URL` semelhante a:

```bash
postgresql://airfa:230422@172.17.160.1:5432/airfa
```

### Migrações

```bash
alembic upgrade head
```

### Seed do super-admin

```bash
python -m app.seed.seed
```

### Arranque da API

```bash
uvicorn app.main:app --reload
```

## Setup do frontend

```bash
cd frontend
npm install
```

### Arranque do frontend

```bash
npm run dev
```

## Testes

Backend:

```bash
cd backend
. .venv/bin/activate
pytest -q tests/test_api_error_responses.py tests/test_api_happy_paths.py
```

## Notas operacionais

- O scheduler de aniversários é iniciado no arranque da API.
- Os PDFs do repertório são gravados em disco local e expostos por pasta por obra.
- A aplicação assume o português de Portugal na interface.

## Como correr localmente (WSL + Windows)

> O backend corre em WSL (Ubuntu) e o frontend em qualquer terminal com Node.js.

### 1. PostgreSQL

Certifica-te que o PostgreSQL está a correr no Windows na porta `5432` com o utilizador `airfa` e a base de dados `airfa`.

### 2. Backend (WSL)

Abre uma sessão WSL e executa:

```bash
cd /mnt/c/Users/Loureiro/Desktop/Dev/airfa-helper/backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

A API fica disponível em **http://localhost:8000**. Documentação interactiva em **http://localhost:8000/docs**.

### 3. Seed da base de dados (primeira vez)

Após o backend estar em execução, num segundo tab WSL:

```bash
cd /mnt/c/Users/Loureiro/Desktop/Dev/airfa-helper/backend
source .venv/bin/activate
python -m app.seed.seed
```

Cria os seguintes utilizadores de teste (password: `admin123`):

| Role | Username (login) | Nome |
|------|-----------------|------|
| SUPER_ADMIN | `superadmin` | Super Admin Airfa |
| ADMIN | `admin` | Admin Airfa |
| REGULAR | `membro` | Membro Regular |
| REGULAR | `membro2` | Membro Regular 2 |

### 4. Frontend (Windows — PowerShell)

Correr o frontend com hot reload:
```powershell
cd C:\Users\Loureiro\Desktop\Dev\airfa-helper\frontend
npm install        # só na primeira vez
npm run dev        # hot reload activo (webpack polling)
```

A aplicação fica disponível em **http://localhost:3000**.

---

## Estado atual

O núcleo funcional está implementado e validado com testes de API para cenários de erro e de sucesso.
