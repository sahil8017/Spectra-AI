# Build stage: Install dependencies
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies for psycopg2 and other packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Final stage: Runtime
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies (e.g., libpq for postgres)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy only the installed packages from builder
COPY --from=builder /root/.local /root/.local

# Copy the backend code into a subdirectory named 'backend'
# This ensures that 'import backend.xxx' works correctly
COPY . ./backend

# Update PATH to include the user-installed packages
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

# Expose the port FastAPI runs on
EXPOSE 8000

# Start the application using the package notation
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

