"""
Health check and metrics endpoints for monitoring.
Supports Kubernetes probes and Prometheus metrics.
"""

from flask import Blueprint, current_app, jsonify
import time
import os
import psutil

from app.extensions import db, redis_cache


health_bp = Blueprint('health', __name__)


# Application start time for uptime calculation
APP_START_TIME = time.time()


@health_bp.route('/health', methods=['GET'])
def health():
    """
    Basic health check endpoint.
    Returns 200 if application is running.
    Used for Kubernetes liveness probe.
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': int(time.time())
    }), 200


@health_bp.route('/health/ready', methods=['GET'])
def readiness():
    """
    Readiness check endpoint.
    Verifies all dependencies are available.
    Used for Kubernetes readiness probe.
    """
    checks = {
        'database': check_database(),
        'redis': check_redis()
    }
    
    all_healthy = all(c['healthy'] for c in checks.values())
    status_code = 200 if all_healthy else 503
    
    return jsonify({
        'status': 'ready' if all_healthy else 'not_ready',
        'timestamp': int(time.time()),
        'checks': checks
    }), status_code


@health_bp.route('/health/live', methods=['GET'])
def liveness():
    """
    Liveness check - lightweight check that app is responding.
    Used for Kubernetes liveness probe.
    """
    return jsonify({
        'status': 'alive',
        'timestamp': int(time.time())
    }), 200


@health_bp.route('/metrics', methods=['GET'])
def metrics():
    """
    Prometheus-compatible metrics endpoint.
    Returns system and application metrics.
    """
    # System metrics
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    
    metrics_data = {
        # Application info
        'app_info': {
            'version': current_app.config.get('APP_VERSION', '1.0.0'),
            'environment': current_app.config.get('ENV', 'production'),
            'uptime_seconds': int(time.time() - APP_START_TIME)
        },
        # Process metrics
        'process': {
            'cpu_percent': process.cpu_percent(),
            'memory_rss_bytes': memory_info.rss,
            'memory_vms_bytes': memory_info.vms,
            'threads': process.num_threads(),
            'open_files': len(process.open_files())
        },
        # Database pool metrics
        'database': get_db_pool_metrics(),
        # Redis metrics
        'redis': get_redis_metrics(),
        # Request counters (if tracking enabled)
        'requests': get_request_metrics()
    }
    
    return jsonify(metrics_data), 200


@health_bp.route('/metrics/prometheus', methods=['GET'])
def prometheus_metrics():
    """
    Returns metrics in Prometheus text format.
    """
    lines = []
    
    # Application uptime
    uptime = int(time.time() - APP_START_TIME)
    lines.append(f'# HELP app_uptime_seconds Application uptime in seconds')
    lines.append(f'# TYPE app_uptime_seconds gauge')
    lines.append(f'app_uptime_seconds {uptime}')
    
    # Process memory
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    lines.append(f'# HELP process_memory_bytes Process memory usage')
    lines.append(f'# TYPE process_memory_bytes gauge')
    lines.append(f'process_memory_bytes{{type="rss"}} {memory_info.rss}')
    lines.append(f'process_memory_bytes{{type="vms"}} {memory_info.vms}')
    
    # CPU
    lines.append(f'# HELP process_cpu_percent Process CPU usage')
    lines.append(f'# TYPE process_cpu_percent gauge')
    lines.append(f'process_cpu_percent {process.cpu_percent()}')
    
    # Database pool
    db_metrics = get_db_pool_metrics()
    if db_metrics:
        lines.append(f'# HELP db_pool_connections Database pool connections')
        lines.append(f'# TYPE db_pool_connections gauge')
        lines.append(f'db_pool_connections{{state="active"}} {db_metrics.get("active", 0)}')
        lines.append(f'db_pool_connections{{state="idle"}} {db_metrics.get("idle", 0)}')
    
    return '\n'.join(lines), 200, {'Content-Type': 'text/plain'}


def check_database() -> dict:
    """Check database connectivity."""
    try:
        db.session.execute('SELECT 1')
        return {'healthy': True, 'latency_ms': 0}
    except Exception as e:
        current_app.logger.error(f"Database health check failed: {e}")
        return {'healthy': False, 'error': str(e)}


def check_redis() -> dict:
    """Check Redis connectivity."""
    try:
        redis_url = current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        import redis
        client = redis.from_url(redis_url)
        start = time.time()
        client.ping()
        latency = (time.time() - start) * 1000
        return {'healthy': True, 'latency_ms': round(latency, 2)}
    except Exception as e:
        current_app.logger.error(f"Redis health check failed: {e}")
        return {'healthy': False, 'error': str(e)}


def get_db_pool_metrics() -> dict:
    """Get database connection pool metrics."""
    try:
        pool = db.engine.pool
        return {
            'pool_size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'active': pool.checkedout(),
            'idle': pool.checkedin()
        }
    except Exception:
        return {}


def get_redis_metrics() -> dict:
    """Get Redis connection info."""
    try:
        redis_url = current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        import redis
        client = redis.from_url(redis_url)
        info = client.info()
        return {
            'connected_clients': info.get('connected_clients', 0),
            'used_memory': info.get('used_memory', 0),
            'used_memory_human': info.get('used_memory_human', 'N/A'),
            'total_commands_processed': info.get('total_commands_processed', 0)
        }
    except Exception:
        return {}


def get_request_metrics() -> dict:
    """Get request statistics (if tracking is enabled)."""
    try:
        redis_url = current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        import redis
        client = redis.from_url(redis_url)
        
        # Get request counters from Redis
        total = client.get('metrics:requests:total') or 0
        errors = client.get('metrics:requests:errors') or 0
        
        return {
            'total': int(total),
            'errors': int(errors),
            'error_rate': round(int(errors) / max(int(total), 1) * 100, 2)
        }
    except Exception:
        return {}
