"""
Security utilities.

Password hashing, token generation ve encryption utilities.
"""

import secrets
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Optional, Tuple
import re

from flask import current_app
from flask_bcrypt import generate_password_hash, check_password_hash


# ============================================================================
# Password Utilities
# ============================================================================

def hash_password(password: str) -> str:
    """
    Şifreyi bcrypt ile hashler.
    
    Args:
        password: Plain text şifre
    
    Returns:
        Hashed şifre
    """
    return generate_password_hash(password).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """
    Şifreyi hash ile karşılaştırır.
    
    Args:
        password: Plain text şifre
        password_hash: Hashlenmiş şifre
    
    Returns:
        True eğer eşleşiyorsa
    """
    return check_password_hash(password_hash, password)


def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    """
    Şifre güçlülüğünü kontrol eder.
    
    Args:
        password: Kontrol edilecek şifre
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, 'Şifre en az 8 karakter olmalıdır'
    
    if len(password) > 128:
        return False, 'Şifre en fazla 128 karakter olabilir'
    
    if not re.search(r'[A-Z]', password):
        return False, 'Şifre en az bir büyük harf içermelidir'
    
    if not re.search(r'[a-z]', password):
        return False, 'Şifre en az bir küçük harf içermelidir'
    
    if not re.search(r'\d', password):
        return False, 'Şifre en az bir rakam içermelidir'
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, 'Şifre en az bir özel karakter içermelidir'
    
    # Yaygın şifreleri kontrol et
    common_passwords = ['password', '123456', 'qwerty', 'admin']
    if password.lower() in common_passwords:
        return False, 'Bu şifre çok yaygın, lütfen başka bir şifre seçin'
    
    return True, None


# ============================================================================
# Token Utilities
# ============================================================================

def generate_token(length: int = 32) -> str:
    """
    Kriptografik olarak güvenli rastgele token üretir.
    
    Args:
        length: Token uzunluğu (byte olarak)
    
    Returns:
        URL-safe token string
    """
    return secrets.token_urlsafe(length)


def generate_verification_code(length: int = 6) -> str:
    """
    Sayısal doğrulama kodu üretir.
    
    Args:
        length: Kod uzunluğu
    
    Returns:
        Sayısal kod string
    """
    return ''.join(secrets.choice('0123456789') for _ in range(length))


def generate_api_key() -> str:
    """
    API key üretir.
    
    Returns:
        API key string (prefix ile)
    """
    prefix = 'sk_'  # secret key prefix
    key = secrets.token_urlsafe(32)
    return f'{prefix}{key}'


def hash_token(token: str) -> str:
    """
    Token'ı SHA256 ile hashler (database'de saklamak için).
    
    Args:
        token: Plain text token
    
    Returns:
        Hashed token
    """
    return hashlib.sha256(token.encode()).hexdigest()


# ============================================================================
# Encryption Utilities
# ============================================================================

def encode_base64(data: str) -> str:
    """Base64 encode."""
    return base64.urlsafe_b64encode(data.encode()).decode()


def decode_base64(data: str) -> str:
    """Base64 decode."""
    # Padding ekle
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data.encode()).decode()


def mask_email(email: str) -> str:
    """
    E-posta adresini maskeler.
    
    Args:
        email: E-posta adresi
    
    Returns:
        Maskelenmiş e-posta (örn: j***@example.com)
    """
    if not email or '@' not in email:
        return email
    
    local, domain = email.rsplit('@', 1)
    
    if len(local) <= 2:
        masked_local = local[0] + '*'
    else:
        masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
    
    return f'{masked_local}@{domain}'


def mask_phone(phone: str) -> str:
    """
    Telefon numarasını maskeler.
    
    Args:
        phone: Telefon numarası
    
    Returns:
        Maskelenmiş numara (örn: +90 *** *** 34 56)
    """
    if not phone:
        return phone
    
    # Sadece rakamları al
    digits = re.sub(r'\D', '', phone)
    
    if len(digits) < 4:
        return phone
    
    return digits[:2] + '*' * (len(digits) - 4) + digits[-2:]


# ============================================================================
# Validation Utilities
# ============================================================================

def is_valid_email(email: str) -> bool:
    """E-posta formatını doğrular."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def is_valid_phone(phone: str) -> bool:
    """Türkiye telefon numarasını doğrular."""
    # +90 veya 0 ile başlayan 10-11 haneli numara
    pattern = r'^(\+90|0)?[5][0-9]{9}$'
    digits = re.sub(r'\D', '', phone)
    return bool(re.match(pattern, '+' + digits if not digits.startswith('0') else digits))


def is_valid_tc_kimlik(tc: str) -> bool:
    """
    TC Kimlik numarasını doğrular.
    
    Args:
        tc: TC Kimlik numarası
    
    Returns:
        True eğer geçerliyse
    """
    if not tc or len(tc) != 11:
        return False
    
    if not tc.isdigit():
        return False
    
    if tc[0] == '0':
        return False
    
    # Algoritma kontrolü
    digits = [int(d) for d in tc]
    
    # İlk 10 hanenin toplamının mod 10'u 11. haneye eşit olmalı
    if sum(digits[:10]) % 10 != digits[10]:
        return False
    
    # Tek basamaklar toplamının 7 katı - çift basamaklar toplamının mod 10'u 10. haneye eşit olmalı
    odd_sum = sum(digits[0:9:2])
    even_sum = sum(digits[1:8:2])
    
    if (odd_sum * 7 - even_sum) % 10 != digits[9]:
        return False
    
    return True


def sanitize_filename(filename: str) -> str:
    """
    Dosya adını güvenli hale getirir.
    
    Args:
        filename: Orijinal dosya adı
    
    Returns:
        Sanitize edilmiş dosya adı
    """
    # Tehlikeli karakterleri kaldır
    filename = re.sub(r'[^\w\s\-\.]', '', filename)
    
    # Boşlukları alt çizgi yap
    filename = re.sub(r'\s+', '_', filename)
    
    # Birden fazla alt çizgiyi teke indir
    filename = re.sub(r'_+', '_', filename)
    
    # Başta ve sonda alt çizgi/nokta olmamalı
    filename = filename.strip('_.')
    
    return filename[:255] if filename else 'unnamed'
