"""
Application factory for Flask app.
Optimized for 10,000+ concurrent users.
"""

import os
import sys
import logging
from flask import Flask, jsonify, g
from datetime import datetime

from app.config import get_config
from app.extensions import init_extensions, db
from app.core.exceptions import AppException
from app.modules.students import students_bp

def create_app(config_class=None):
    """
    Application factory pattern.
    
    Args:
        config_class: Configuration class to use
        
    Returns:
        Flask application instance
    """
    
    app = Flask(__name__)
    
    # Load configuration
    if config_class is None:
        config_class = get_config()

    app.config.from_object(config_class)
    

    app.config.from_object(config_class)
    
    # Validate production environment variables
    _validate_production_config(app)
    
    # Initialize Sentry for production error tracking
    _init_sentry(app)
    
    # Configure structured logging
    _configure_logging(app)
    
    # Initialize extensions
    init_extensions(app)
    
    # Initialize middleware
    _init_middleware(app)
    
    # Register blueprints
    _register_blueprints(app)
    
    # Register error handlers
    _register_error_handlers(app)
    
    # Register CLI commands
    _register_cli_commands(app)
    
    # Add rate limit headers to responses
    @app.after_request
    def add_headers(response):
        # Add rate limit headers if available
        from app.utils.rate_limiter import add_rate_limit_headers
        response = add_rate_limit_headers(response)
        
        # Add security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        return response
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'app': app.config.get('APP_NAME')
        })
    
    # Root endpoint - redirect to API docs
    @app.route('/')
    def index():
        return jsonify({
            'success': True,
            'message': 'Öğrenci Koçluk Sistemi API',
            'version': 'v1',
            'documentation': '/api/v1/docs',
            'endpoints': {
                'auth': '/api/v1/auth',
                'users': '/api/v1/users',
                'courses': '/api/v1/courses',
                'videos': '/api/v1/videos',
                'questions': '/api/v1/questions',
                'exams': '/api/v1/exams',
                'evaluations': '/api/v1/evaluations',
                'live_sessions': '/api/v1/live-sessions',
                'ai': '/api/v1/ai'
            },
            'ai_features': {
                'hint': '/api/v1/ai/hint',
                'explain': '/api/v1/ai/explain',
                'study_plan': '/api/v1/ai/study-plan',
                'evaluate_answer': '/api/v1/ai/evaluate-answer',
                'analyze_performance': '/api/v1/ai/analyze-performance',
                'generate_questions': '/api/v1/ai/generate-questions',
                'quota': '/api/v1/ai/quota',
                'features': '/api/v1/ai/features'
            }
        })
    
    return app


def _configure_logging(app):
    """Configure structured logging for production."""
    from app.middleware.logging import setup_logging
    setup_logging(app)


def _init_middleware(app):
    """Initialize request middleware."""
    from app.middleware.logging import RequestLogger
    
    # Request logging middleware
    request_logger = RequestLogger(app)
    
    app.logger.info('Middleware initialized successfully')


def _register_blueprints(app):
    """Register all blueprints."""
    
    from app.api.v1 import api_v1_bp, register_module_blueprints
    from app.api.health import health_bp
    
    # Yeni modüler blueprint'leri kaydet
    register_module_blueprints(app)
    
    # API v1 blueprint
    app.register_blueprint(api_v1_bp, url_prefix='/api/v1')
    
    # Health check endpoints (for Kubernetes/monitoring)
    app.register_blueprint(health_bp)
    
    app.logger.info('Blueprints registered successfully')


def _validate_production_config(app):
    """Validate critical configuration for production."""
    if app.config.get('FLASK_ENV') == 'production':
        required_env_vars = [
            'SECRET_KEY',
            'JWT_SECRET_KEY',
            'DATABASE_URL',
        ]
        
        missing = []
        for var in required_env_vars:
            value = os.environ.get(var)
            if not value:
                missing.append(var)
            elif var in ['SECRET_KEY', 'JWT_SECRET_KEY']:
                # Check for weak secrets
                if len(value) < 32 or value in ['dev-secret-key', 'jwt-secret-key', 'change-me']:
                    app.logger.error(f'{var} is too weak for production!')
                    missing.append(f'{var} (too weak)')
        
        if missing:
            error_msg = f"CRITICAL: Missing or invalid environment variables for production: {', '.join(missing)}"
            app.logger.error(error_msg)
            if not app.config.get('FLASK_DEBUG'):
                print(f"\n{'='*60}\n{error_msg}\n{'='*60}\n", file=sys.stderr)
                sys.exit(1)


def _init_sentry(app):
    """Initialize Sentry for error tracking."""
    sentry_dsn = app.config.get('SENTRY_DSN')
    
    if sentry_dsn and app.config.get('FLASK_ENV') in ['production', 'staging']:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.flask import FlaskIntegration
            from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
            from sentry_sdk.integrations.celery import CeleryIntegration
            from sentry_sdk.integrations.logging import LoggingIntegration
            
            # Logging integration ayarları
            logging_integration = LoggingIntegration(
                level=logging.INFO,        # Capture info and above as breadcrumbs
                event_level=logging.ERROR  # Send errors as events
            )
            
            sentry_sdk.init(
                dsn=sentry_dsn,
                integrations=[
                    FlaskIntegration(transaction_style="url"),
                    SqlalchemyIntegration(),
                    CeleryIntegration(),
                    logging_integration,
                ],
                environment=app.config.get('SENTRY_ENVIRONMENT', app.config.get('FLASK_ENV')),
                release=app.config.get('APP_VERSION', '1.0.0'),
                traces_sample_rate=app.config.get('SENTRY_TRACES_SAMPLE_RATE', 0.1),
                profiles_sample_rate=0.1,
                sample_rate=1.0,  # Error sampling rate (1.0 = 100%)
                send_default_pii=False,  # KVKK/GDPR compliance
                attach_stacktrace=True,  # Attach stacktrace to messages
                max_breadcrumbs=50,  # Maximum number of breadcrumbs
                before_send=_sentry_before_send,
                before_breadcrumb=_sentry_before_breadcrumb,
            )
            app.logger.info('Sentry initialized successfully')
        except ImportError:
            app.logger.warning('Sentry SDK not installed, skipping initialization')
        except Exception as e:
            app.logger.error(f'Failed to initialize Sentry: {e}')


def _sentry_before_send(event, hint):
    """Filter sensitive data before sending to Sentry."""
    # Remove sensitive headers
    if 'request' in event and 'headers' in event['request']:
        sensitive_headers = ['authorization', 'cookie', 'x-api-key']
        event['request']['headers'] = {
            k: '[FILTERED]' if k.lower() in sensitive_headers else v
            for k, v in event['request']['headers'].items()
        }
    
    # Remove sensitive data from request body
    if 'request' in event and 'data' in event['request']:
        try:
            import json
            data = json.loads(event['request']['data'])
            sensitive_fields = ['password', 'token', 'secret', 'api_key', 'credit_card']
            for field in sensitive_fields:
                if field in data:
                    data[field] = '[FILTERED]'
            event['request']['data'] = json.dumps(data)
        except:
            pass
    
    # Filter user data for KVKK/GDPR compliance
    if 'user' in event:
        if 'email' in event['user']:
            event['user']['email'] = '[FILTERED]'
        if 'ip_address' in event['user']:
            event['user']['ip_address'] = '[FILTERED]'
    
    return event


def _sentry_before_breadcrumb(crumb, hint):
    """Filter sensitive data from breadcrumbs."""
    # Filter SQL queries that might contain sensitive data
    if crumb.get('category') == 'query':
        message = crumb.get('message', '')
        sensitive_tables = ['users', 'tokens', 'sessions']
        for table in sensitive_tables:
            if table in message.lower() and ('insert' in message.lower() or 'update' in message.lower()):
                crumb['message'] = f'[FILTERED SQL on {table}]'
                break
    
    # Filter HTTP breadcrumbs
    if crumb.get('category') == 'http':
        if 'data' in crumb:
            crumb['data'] = {
                k: '[FILTERED]' if k.lower() in ['authorization', 'password', 'token'] else v
                for k, v in crumb.get('data', {}).items()
            }
    
    return crumb


def _register_error_handlers(app):
    """Register global error handlers."""
    
    # ===== AppException Handler (CRITICAL) =====
    @app.errorhandler(AppException)
    def handle_app_exception(error):
        """Handle all custom application exceptions."""
        response = {
            'success': False,
            'error': error.to_dict(),
            'timestamp': datetime.utcnow().isoformat()
        }
        return jsonify(response), error.status_code
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'BAD_REQUEST',
                'message': str(error.description) if hasattr(error, 'description') else 'Bad request'
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required'
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'FORBIDDEN',
                'message': 'You do not have permission to access this resource'
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Resource not found'
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 404
    
    @app.errorhandler(422)
    def unprocessable_entity(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': str(error.description) if hasattr(error, 'description') else 'Validation failed'
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 422
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'RATE_LIMIT_EXCEEDED',
                'message': 'Too many requests. Please try again later.'
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 429
    
    @app.errorhandler(500)
    def internal_server_error(error):
        app.logger.error(f'Internal server error: {error}')
        return jsonify({
            'success': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An internal server error occurred'
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 500
    
    # ===== Generic Exception Handler =====
    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        """Catch-all handler for unhandled exceptions."""
        app.logger.exception(f'Unhandled exception: {error}')
        
        # In production, don't expose error details
        if app.config.get('FLASK_ENV') == 'production':
            message = 'An unexpected error occurred'
        else:
            message = str(error)
        
        return jsonify({
            'success': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': message
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 500


def _register_cli_commands(app):
    """Register custom CLI commands."""
    
    @app.cli.command('init-db')
    def init_db():
        """Initialize the database."""
        db.create_all()
        print('Database tables created.')
    
    @app.cli.command('seed-db')
    def seed_db():
        """Seed the database with initial data."""
        from app.utils.seed_data import seed_database
        seed_database()
        print('Database seeded successfully.')
    
    @app.cli.command('create-admin')
    def create_admin():
        """Create a super admin user."""
        from app.services.user_service import UserService
        
        email = input('Email: ')
        password = input('Password: ')
        first_name = input('First Name: ')
        last_name = input('Last Name: ')
        
        user_service = UserService()
        user = user_service.create_super_admin(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        print(f'Super admin created: {user.email}')
