"""
Custom exceptions for the application.
"""


class AppException(Exception):
    """Base application exception."""
    
    def __init__(self, message: str, code: str = 'APP_ERROR', status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)
    
    def to_dict(self):
        return {
            'success': False,
            'error': {
                'code': self.code,
                'message': self.message
            }
        }


class ValidationError(AppException):
    """Validation error exception."""
    
    def __init__(self, message: str, field: str = None):
        super().__init__(message, 'VALIDATION_ERROR', 400)
        self.field = field
    
    def to_dict(self):
        result = super().to_dict()
        if self.field:
            result['error']['field'] = self.field
        return result


class NotFoundError(AppException):
    """Resource not found exception."""
    
    def __init__(self, message: str = 'Resource not found'):
        super().__init__(message, 'NOT_FOUND', 404)


class AuthenticationError(AppException):
    """Authentication error exception."""
    
    def __init__(self, message: str = 'Authentication required'):
        super().__init__(message, 'UNAUTHORIZED', 401)


class AuthorizationError(AppException):
    """Authorization error exception."""
    
    def __init__(self, message: str = 'Permission denied'):
        super().__init__(message, 'FORBIDDEN', 403)


class ConflictError(AppException):
    """Conflict error exception."""
    
    def __init__(self, message: str = 'Resource conflict'):
        super().__init__(message, 'CONFLICT', 409)


class RateLimitError(AppException):
    """Rate limit exceeded exception."""
    
    def __init__(self, message: str = 'Rate limit exceeded'):
        super().__init__(message, 'RATE_LIMIT_EXCEEDED', 429)


class ExternalServiceError(AppException):
    """External service error exception."""
    
    def __init__(self, service: str, message: str):
        super().__init__(f'{service}: {message}', 'EXTERNAL_SERVICE_ERROR', 502)
        self.service = service
