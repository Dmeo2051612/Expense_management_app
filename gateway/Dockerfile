FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY server.py ./server.py

EXPOSE 8081

CMD ["gunicorn", "--workers", "2", "--bind", "0.0.0.0:8081", "--timeout", "30", "server:app"]
