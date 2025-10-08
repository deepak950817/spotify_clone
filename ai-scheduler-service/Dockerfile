# FROM python:3.10-slim
# WORKDIR /app
# COPY requirements.txt .
# RUN pip install -r requirements.txt
# COPY . .
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

# Dockerfile - python slim base
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# system deps for python-dateutil, scikit-learn binary wheels, ortools
RUN apt-get update && apt-get install -y build-essential gcc libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# use a single worker by default; for production increase with a process manager
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
