"""
Request logging and monitoring middleware.
Provides structured logging for all API requests.
"""

import time
import uuid
from functools import wraps
from typing import Callable

from flask import request, g, current_app
import logging


class RequestLogger:
    """
    Middleware for structured request logging.
    Captures timing, status codes, and request context.
    """
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize middleware with Flask app."""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        app.teardown_request(self.teardown_request)
    
    def before_request(self):
        """Called before each request."""
        # Generate unique request ID
        g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        g.request_start_time = time.time()
        
        # Log request start (debug level)
        current_app.logger.debug(
            f"Request started",
            extra={
                'request_id': g.request_id,
                'method': request.method,
                'path': request.path,
                'remote_addr': self._get_client_ip()
            }
        )
    
    def after_request(self, response):
        """Called after each request, before response is sent."""
        # Calculate request duration
        duration = 0
        if hasattr(g, 'request_start_time'):
            duration = time.time() - g.request_start_time
        
        # Add request ID to response headers
        if hasattr(g, 'request_id'):
            response.headers['X-Request-ID'] = g.request_id
        
        # Add timing header
        response.headers['X-Response-Time'] = f"{duration*1000:.2f}ms"
        
        # Log request completion
        log_data = {
            'request_id': getattr(g, 'request_id', 'unknown'),
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'remote_addr': self._get_client_ip(),
            'user_agent': request.user_agent.string[:100] if request.user_agent else None,
            'content_length': response.content_length
        }
        
        # Add user ID if available
        try:
            from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                log_data['user_id'] = user_id
        except:
            pass
        
        # Choose log level based on status code
        if response.status_code >= 500:
            current_app.logger.error("Request completed with error", extra=log_data)
        elif response.status_code >= 400:
            current_app.logger.warning("Request completed with client error", extra=log_data)
        else:
            current_app.logger.info("Request completed", extra=log_data)
        
        # Track slow requests
        if duration > 1.0:  # More than 1 second
            current_app.logger.warning(
                f"Slow request detected: {duration*1000:.2f}ms",
                extra=log_data
            )
        
        # Increment request counter in Redis - sadece üretimde veya etkinleştirilmişse
        if not current_app.debug or current_app.config.get('REQUEST_LOGGING_ENABLED', False):
            self._track_request_metrics(response.status_code)
        
        # Log to database - sadece etkinleştirilmişse (performans için opsiyonel)
        if current_app.config.get('REQUEST_LOGGING_ENABLED', False):
            self._log_request_to_db(response, duration)
        
        return response
    
    def _log_request_to_db(self, response, duration: float):
        """Log request to database for reporting."""
        try:
            from app.services.log_service import PerformanceService
            
            user_id = None
            try:
                from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
                verify_jwt_in_request(optional=True)
                user_id = get_jwt_identity()
            except:
                pass
            
            PerformanceService.record_request(
                endpoint=request.endpoint or request.path,
                http_method=request.method,
                duration_ms=duration * 1000,
                status_code=response.status_code,
                response_size=response.content_length,
                user_id=user_id
            )
        except Exception:
            pass  # Don't let logging break the request
    
    def teardown_request(self, exception=None):
        """Called at the end of request, even if exception occurred."""
        if exception:
            current_app.logger.exception(
                f"Request failed with exception",
                extra={
                    'request_id': getattr(g, 'request_id', 'unknown'),
                    'error': str(exception)
                }
            )
            
            # Log error to database
            self._log_exception_to_db(exception)
    
    def _log_exception_to_db(self, exception):
        """Log exception to database."""
        try:
            from app.services.log_service import ErrorService, ErrorSeverity
            
            ErrorService.log_error(
                error=exception,
                severity=ErrorSeverity.ERROR,
                tags=['unhandled', 'request']
            )
        except Exception:
            pass  # Don't let error logging break the request
    
    def _get_client_ip(self) -> str:
        """Get real client IP, handling proxies."""
        # Check for forwarded headers
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        if request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        return request.remote_addr or 'unknown'
    
    def _track_request_metrics(self, status_code: int):
        """Track request metrics in Redis."""
        try:
            redis_url = current_app.config.get('REDIS_URL')
            if not redis_url:
                return
            
            import redis
            client = redis.from_url(
                redis_url,
                socket_connect_timeout=0.5,
                socket_timeout=0.5
            )
            
            # Increment counters
            pipe = client.pipeline()
            pipe.incr('metrics:requests:total')
            pipe.incr(f'metrics:requests:status:{status_code}')
            
            if status_code >= 500:
                pipe.incr('metrics:requests:errors')
            
            # Execute async-like (don't wait for result)
            pipe.execute()
        except Exception:
            pass  # Don't let metrics tracking break the request


class StructuredFormatter(logging.Formatter):
    """
    Structured JSON log formatter for production use.
    Compatible with ELK stack, CloudWatch, etc.
    """
    
    def format(self, record):
        import json
        from datetime import datetime
        
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add extra fields
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'duration_ms'):
            log_data['duration_ms'] = record.duration_ms
        if hasattr(record, 'status'):
            log_data['status'] = record.status
        if hasattr(record, 'method'):
            log_data['method'] = record.method
        if hasattr(record, 'path'):
            log_data['path'] = record.path
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


def setup_logging(app):
    """Configure structured logging for the application."""
    # Remove default handlers
    app.logger.handlers.clear()
    
    # Create handler
    handler = logging.StreamHandler()
    
    # Use structured formatter in production
    if app.config.get('ENV') == 'production':
        handler.setFormatter(StructuredFormatter())
    else:
        # Use readable format in development
        handler.setFormatter(logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
        ))
    
    # Set log level
    log_level = app.config.get('LOG_LEVEL', 'INFO')
    handler.setLevel(getattr(logging, log_level, logging.INFO))
    
    app.logger.addHandler(handler)
    app.logger.setLevel(getattr(logging, log_level, logging.INFO))
    
    # Reduce noise from libraries
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy').setLevel(logging.WARNING)


def log_execution_time(func_name: str = None):
    """
    Decorator to log function execution time.
    
    Usage:
        @log_execution_time('heavy_calculation')
        def calculate_report():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            result = func(*args, **kwargs)
            duration = time.time() - start
            
            name = func_name or func.__name__
            current_app.logger.debug(
                f"Function {name} executed in {duration*1000:.2f}ms"
            )
            
            return result
        return wrapper
    return decorator
