"""
Helper utilities.
"""

from datetime import datetime, date
from decimal import Decimal
import json
import re
from typing import Any, Dict, List, Optional


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    # Convert to lowercase
    text = text.lower()
    
    # Replace Turkish characters
    tr_chars = {
        'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
        'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c'
    }
    for tr_char, en_char in tr_chars.items():
        text = text.replace(tr_char, en_char)
    
    # Remove special characters
    text = re.sub(r'[^\w\s-]', '', text)
    
    # Replace whitespace with hyphens
    text = re.sub(r'[-\s]+', '-', text)
    
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    return text


def format_duration(seconds: int) -> str:
    """Format duration in seconds to human-readable string."""
    if seconds < 60:
        return f'{seconds}s'
    elif seconds < 3600:
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        if remaining_seconds:
            return f'{minutes}m {remaining_seconds}s'
        return f'{minutes}m'
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        if minutes:
            return f'{hours}h {minutes}m'
        return f'{hours}h'


def format_file_size(bytes_size: int) -> str:
    """Format file size in bytes to human-readable string."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_size < 1024:
            return f'{bytes_size:.1f} {unit}'
        bytes_size /= 1024
    return f'{bytes_size:.1f} PB'


def paginate_list(items: List, page: int = 1, per_page: int = 20) -> Dict:
    """Paginate a list of items."""
    total = len(items)
    total_pages = (total + per_page - 1) // per_page
    
    start = (page - 1) * per_page
    end = start + per_page
    
    return {
        'items': items[start:end],
        'page': page,
        'per_page': per_page,
        'total': total,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1
    }


def safe_json_loads(json_str: str, default: Any = None) -> Any:
    """Safely parse JSON string."""
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return default


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for application types."""
    
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, date):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        elif hasattr(obj, 'to_dict'):
            return obj.to_dict()
        return super().default(obj)


def calculate_percentage(value: float, total: float, decimal_places: int = 1) -> float:
    """Calculate percentage with safe division."""
    if total == 0:
        return 0.0
    return round((value / total) * 100, decimal_places)


def truncate_string(text: str, max_length: int = 100, suffix: str = '...') -> str:
    """Truncate string to maximum length."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def get_client_ip(request) -> str:
    """Get client IP address from request."""
    # Check for forwarded headers (behind proxy)
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    return request.remote_addr or '127.0.0.1'


def mask_email(email: str) -> str:
    """Mask email address for privacy."""
    if '@' not in email:
        return email
    
    local, domain = email.split('@')
    
    if len(local) <= 2:
        masked_local = '*' * len(local)
    else:
        masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
    
    return f'{masked_local}@{domain}'


def generate_random_string(length: int = 32) -> str:
    """Generate a random string."""
    import secrets
    return secrets.token_urlsafe(length)[:length]
