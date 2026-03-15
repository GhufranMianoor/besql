FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
      libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy API source (executed as `api` package from parent dir)
COPY . /app/api

# Set working directory one level up so `api` is importable as a package
WORKDIR /tmp/besql
RUN ln -s /app/api api

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
