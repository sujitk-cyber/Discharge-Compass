FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt backend/requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/src ./src
COPY backend/artifacts ./artifacts

ENV PYTHONPATH=/app/src

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
