# Use Python image
FROM python:3.11

# Set working directory
WORKDIR /app

ENV PYTHONPATH=/app/backend

# Install Node.js
RUN apt-get update && apt-get install -y nodejs npm git

# Copy backend
COPY backend ./backend

# Install backend dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy frontend
COPY frontend ./frontend

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Build frontend
RUN npm run build

# Back to root
WORKDIR /app

# Copy everything else
COPY . .

# Expose port
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]