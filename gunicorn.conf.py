"""
Gunicorn configuration for production deployment.
Optimized for 10,000+ concurrent users.

Production Best Practices:
- gevent async workers for high concurrency
- Memory leak prevention with max_requests
- Graceful restarts and health monitoring
- Structured logging with statsd
"""

import multiprocessing
import os
import sys

# =============================================================================
# SERVER SOCKET
# =============================================================================
bind = os.getenv('GUNICORN_BIND', '0.0.0.0:5000')
backlog = 2048  # Pending connection queue size

# =============================================================================
# WORKER PROCESSES
# =============================================================================
# Formula: (2 * CPU) + 1 for I/O bound apps
# For gevent, can go higher since workers are async
workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))

# Worker class - gevent for async I/O (requires gevent package)
# Options: sync, eventlet, gevent, tornado, gthread
worker_class = os.getenv('GUNICORN_WORKER_CLASS', 'gevent')

# Connections per worker (gevent/eventlet only)
worker_connections = int(os.getenv('GUNICORN_WORKER_CONNECTIONS', 1000))

# Threads per worker (gthread only)
threads = int(os.getenv('GUNICORN_THREADS', 1))

# =============================================================================
# WORKER LIFECYCLE
# =============================================================================
# Worker timeout - time to handle a single request
timeout = int(os.getenv('GUNICORN_TIMEOUT', 30))

# Graceful timeout - time for graceful shutdown
graceful_timeout = int(os.getenv('GUNICORN_GRACEFUL_TIMEOUT', 30))

# Keep-alive connections (Nginx upstream)
keepalive = int(os.getenv('GUNICORN_KEEPALIVE', 5))

# Max requests before worker restart (memory leak prevention)
max_requests = int(os.getenv('GUNICORN_MAX_REQUESTS', 10000))

# Random jitter to prevent thundering herd
max_requests_jitter = int(os.getenv('GUNICORN_MAX_REQUESTS_JITTER', 1000))

# =============================================================================
# APPLICATION LOADING
# =============================================================================
# Preload app for memory efficiency (copy-on-write with fork)
# Note: May cause issues with some database drivers
preload_app = os.getenv('GUNICORN_PRELOAD', 'true').lower() == 'true'

# Reload on code changes (development only)
reload = os.getenv('GUNICORN_RELOAD', 'false').lower() == 'true'

# =============================================================================
# SERVER MECHANICS
# =============================================================================
daemon = False  # Run in foreground for Docker
pidfile = os.getenv('GUNICORN_PIDFILE', None)
user = os.getenv('GUNICORN_USER', None)
group = os.getenv('GUNICORN_GROUP', None)
umask = 0o022
tmp_upload_dir = None

# =============================================================================
# LOGGING
# =============================================================================
accesslog = os.getenv('GUNICORN_ACCESS_LOG', '-')  # stdout
errorlog = os.getenv('GUNICORN_ERROR_LOG', '-')  # stderr
loglevel = os.getenv('GUNICORN_LOG_LEVEL', 'info')

# Access log format with response time
# %D = request time in microseconds
# %(h)s = remote address, %(l)s = -, %(u)s = user, %(t)s = time
# %(r)s = request line, %(s)s = status, %(b)s = response length
access_log_format = os.getenv(
    'GUNICORN_ACCESS_LOG_FORMAT',
    '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)sμs'
)

# Capture stdout/stderr from workers
capture_output = True

# Enable access log
disable_redirect_access_to_syslog = True

# =============================================================================
# PROCESS NAMING
# =============================================================================
proc_name = os.getenv('GUNICORN_PROC_NAME', 'student_coaching_api')

# =============================================================================
# SSL CONFIGURATION (if terminating at Gunicorn)
# =============================================================================
# In production, SSL should be terminated at Nginx/Load Balancer
keyfile = os.getenv('GUNICORN_SSL_KEYFILE', None)
certfile = os.getenv('GUNICORN_SSL_CERTFILE', None)
ca_certs = os.getenv('GUNICORN_SSL_CA_CERTS', None)
ssl_version = 2  # TLSv1
cert_reqs = 0  # CERT_NONE
ciphers = None

# =============================================================================
# STATSD METRICS (Optional)
# =============================================================================
# Enable for production monitoring
statsd_host = os.getenv('STATSD_HOST', None)
statsd_port = int(os.getenv('STATSD_PORT', 8125))
statsd_prefix = os.getenv('STATSD_PREFIX', 'gunicorn')

# =============================================================================
# FORWARDED HEADERS (Behind proxy)
# =============================================================================
forwarded_allow_ips = os.getenv('GUNICORN_FORWARDED_ALLOW_IPS', '*')
secure_scheme_headers = {
    'X-FORWARDED-PROTOCOL': 'ssl',
    'X-FORWARDED-PROTO': 'https',
    'X-FORWARDED-SSL': 'on'
}

# =============================================================================
# SERVER HOOKS
# =============================================================================

def on_starting(server):
    """Called just before the master process is initialized."""
    print(f"[Gunicorn] Starting with {workers} workers, class: {worker_class}")


def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    print("[Gunicorn] Reloading workers...")


def when_ready(server):
    """Called just after the server is started."""
    print(f"[Gunicorn] Server ready at {bind}")


def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass


def post_fork(server, worker):
    """Called just after a worker has been forked."""
    # Re-seed random number generator after fork
    import random
    random.seed()
    
    # PostgreSQL connection pool should be re-initialized after fork
    # This is handled by SQLAlchemy's pool_pre_ping
    

def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    print(f"[Gunicorn] Worker {worker.pid} initialized")


def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT."""
    print(f"[Gunicorn] Worker {worker.pid} received interrupt")


def worker_abort(worker):
    """Called when a worker receives SIGABRT."""
    print(f"[Gunicorn] Worker {worker.pid} aborted!")


def pre_exec(server):
    """Called just before a new master process is forked."""
    print("[Gunicorn] Master process forking...")


def child_exit(server, worker):
    """Called in the master process after a worker exits."""
    print(f"[Gunicorn] Worker {worker.pid} exited (master)")


def worker_exit(server, worker):
    """Called in the worker process just after exiting."""
    # Cleanup resources
    pass


def nworkers_changed(server, new_value, old_value):
    """Called when num workers has been changed."""
    print(f"[Gunicorn] Workers changed: {old_value} -> {new_value}")


def on_exit(server):
    """Called just before exiting Gunicorn."""
    print("[Gunicorn] Server shutting down...")


def on_exit(server):
    """Called just before exiting Gunicorn."""
    pass
