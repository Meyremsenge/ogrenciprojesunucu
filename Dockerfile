# Öğrenci Koçluk Sistemi - Flask Backend
# Multi-stage build for production optimization
# Optimized for 10,000+ concurrent users

# ============== Base Stage ==============
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100

# Create app user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean


# ============== Builder Stage ==============
FROM base as builder

# Install Python dependencies
COPY requirements.txt .
RUN pip install --user --no-warn-script-location -r requirements.txt


# ============== Development Stage ==============
FROM base as development

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Install dev dependencies
RUN pip install --user pytest pytest-cov black flake8 ipython

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run development server
CMD ["python", "run.py"]


# ============== Production Stage ==============
FROM base as production

# Security: non-root user
# Copy dependencies from builder to user directory
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code with proper ownership
COPY --chown=appuser:appgroup . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs /app/instance \
    && chown -R appuser:appgroup /app/uploads /app/logs /app/instance

# Switch to non-root user
USER appuser
ENV PATH=/home/appuser/.local/bin:$PATH

# Environment variables for production
ENV FLASK_ENV=production \
    FLASK_DEBUG=0

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health/ready || exit 1

# Run with Gunicorn using config file
CMD ["gunicorn", "-c", "gunicorn.conf.py", "run:app"]
