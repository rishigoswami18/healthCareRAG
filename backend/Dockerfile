FROM python:3.10-slim

WORKDIR /workspace

# Install system dependencies (build-essential needed for some C extensions if compiled)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies, ensuring offline fallback runs cleanly if libraries compile
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./backend

# Set python path to allow imports from workspace root
ENV PYTHONPATH=/workspace

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
