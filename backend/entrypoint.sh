#!/bin/sh
set -e

echo "[entrypoint] Waiting for database to be ready..."
until python -c "
import os, sys
try:
    import psycopg2
    psycopg2.connect(os.environ['DATABASE_URL']).close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
    echo "[entrypoint] Database not ready, retrying in 2 seconds..."
    sleep 2
done

echo "[entrypoint] Running database migrations..."
alembic upgrade head

if [ "${RUN_SEED:-false}" = "true" ]; then
    echo "[entrypoint] Running seed data..."
    python -m app.seed.seed
fi

echo "[entrypoint] Starting application..."
exec "$@"
