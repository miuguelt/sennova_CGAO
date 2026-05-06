# Backend SENNOVA - FastAPI + PostgreSQL
FROM python:3.11-slim

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar requirements primero para cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Crear directorio de almacenamiento persistente
RUN mkdir -p /app/storage && chmod 755 /app/storage

# Copiar código y scripts
COPY app/ ./app/
COPY scripts/ ./scripts/
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Puerto
EXPOSE 8000

# Healthcheck para Docker/Kubernetes/Coolify
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Punto de entrada para asegurar integridad de BD y luego iniciar App
ENTRYPOINT ["./entrypoint.sh"]
