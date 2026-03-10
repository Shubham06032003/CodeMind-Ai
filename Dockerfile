# Use Python image
FROM python:3.11

# Set working directory
WORKDIR /app

# Set Python path
ENV PYTHONPATH=/app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y nodejs npm git

# Copy requirements first (for Docker cache)
COPY backend/requirements.txt ./backend/requirements.txt

# Install backend dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend ./backend

# Copy frontend
COPY frontend ./frontend

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Go back
WORKDIR /app

# Expose port
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]