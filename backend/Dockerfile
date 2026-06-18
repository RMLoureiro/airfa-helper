FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY ./app ./app
COPY alembic/ ./alembic/
COPY alembic.ini ./alembic.ini

# Persistent directory for repertoire file uploads
RUN mkdir -p /app/uploads/repertoire

# Entrypoint is placed outside /app so it is not overridden by dev volume mounts
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Run as an unprivileged user. The uploads dir is owned by this user so the app
# can write to it; bind-mounted host volumes must be chowned to UID 10001.
RUN useradd --system --uid 10001 --create-home appuser \
    && chown -R appuser:appuser /app
USER appuser

ENTRYPOINT ["entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]