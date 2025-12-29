"""
Ortak validation kuralları.

Tüm modüller tarafından kullanılabilecek validatorlar.
"""

import re
from typing import Any, Optional
from marshmallow import ValidationError


def validate_email(value: str) -> str:
    """
    E-posta formatını doğrular.
    
    Args:
        value: E-posta adresi
    
    Returns:
        Normalize edilmiş e-posta
    
    Raises:
        ValidationError: Geçersiz format
    """
    if not value:
        return value
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, value):
        raise ValidationError('Geçersiz e-posta formatı')
    
    return value.lower().strip()


def validate_phone_tr(value: str) -> str:
    """
    Türkiye telefon numarasını doğrular.
    
    Args:
        value: Telefon numarası
    
    Returns:
        Normalize edilmiş numara (+905XXXXXXXXX formatında)
    
    Raises:
        ValidationError: Geçersiz numara
    """
    if not value:
        return value
    
    # Sadece rakamları al
    digits = re.sub(r'\D', '', value)
    
    # 0 ile başlıyorsa kaldır
    if digits.startswith('0'):
        digits = digits[1:]
    
    # 90 ile başlamıyorsa ekle
    if not digits.startswith('90'):
        digits = '90' + digits
    
    # Türkiye mobil numarası kontrolü
    if not re.match(r'^905[0-9]{9}$', digits):
        raise ValidationError('Geçersiz telefon numarası. Örnek: 05XX XXX XX XX')
    
    return '+' + digits


def validate_tc_kimlik(value: str) -> str:
    """
    TC Kimlik numarasını doğrular.
    
    Args:
        value: TC Kimlik numarası
    
    Returns:
        TC Kimlik numarası
    
    Raises:
        ValidationError: Geçersiz numara
    """
    if not value:
        return value
    
    # Sadece rakamlar
    if not value.isdigit():
        raise ValidationError('TC Kimlik numarası sadece rakam içermelidir')
    
    if len(value) != 11:
        raise ValidationError('TC Kimlik numarası 11 haneli olmalıdır')
    
    if value[0] == '0':
        raise ValidationError('TC Kimlik numarası 0 ile başlayamaz')
    
    # Algoritma kontrolü
    digits = [int(d) for d in value]
    
    # 10. hane kontrolü
    odd_sum = sum(digits[0:9:2])
    even_sum = sum(digits[1:8:2])
    if (odd_sum * 7 - even_sum) % 10 != digits[9]:
        raise ValidationError('Geçersiz TC Kimlik numarası')
    
    # 11. hane kontrolü
    if sum(digits[:10]) % 10 != digits[10]:
        raise ValidationError('Geçersiz TC Kimlik numarası')
    
    return value


def validate_password_strength(value: str) -> str:
    """
    Şifre güçlülüğünü kontrol eder.
    
    Args:
        value: Şifre
    
    Returns:
        Şifre
    
    Raises:
        ValidationError: Zayıf şifre
    """
    if not value:
        return value
    
    errors = []
    
    if len(value) < 8:
        errors.append('En az 8 karakter')
    
    if len(value) > 128:
        errors.append('En fazla 128 karakter')
    
    if not re.search(r'[A-Z]', value):
        errors.append('En az bir büyük harf')
    
    if not re.search(r'[a-z]', value):
        errors.append('En az bir küçük harf')
    
    if not re.search(r'\d', value):
        errors.append('En az bir rakam')
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
        errors.append('En az bir özel karakter (!@#$%^&*)')
    
    if errors:
        raise ValidationError(f'Şifre gereksinimleri: {", ".join(errors)}')
    
    return value


def validate_slug(value: str) -> str:
    """
    URL-safe slug doğrulaması.
    
    Args:
        value: Slug
    
    Returns:
        Normalize edilmiş slug
    
    Raises:
        ValidationError: Geçersiz slug
    """
    if not value:
        return value
    
    # Küçük harfe çevir
    value = value.lower()
    
    # Sadece harf, rakam ve tire
    if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', value):
        raise ValidationError('Slug sadece küçük harf, rakam ve tire içerebilir')
    
    if len(value) < 3:
        raise ValidationError('Slug en az 3 karakter olmalıdır')
    
    if len(value) > 100:
        raise ValidationError('Slug en fazla 100 karakter olabilir')
    
    return value


def validate_url(value: str) -> str:
    """
    URL formatını doğrular.
    
    Args:
        value: URL
    
    Returns:
        URL
    
    Raises:
        ValidationError: Geçersiz URL
    """
    if not value:
        return value
    
    pattern = r'^https?://[^\s<>"{}|\\^`\[\]]+$'
    if not re.match(pattern, value):
        raise ValidationError('Geçersiz URL formatı')
    
    return value


def validate_youtube_url(value: str) -> str:
    """
    YouTube URL formatını doğrular.
    
    Args:
        value: YouTube URL
    
    Returns:
        URL
    
    Raises:
        ValidationError: Geçersiz YouTube URL
    """
    if not value:
        return value
    
    patterns = [
        r'^https?://(?:www\.)?youtube\.com/watch\?v=[\w-]+',
        r'^https?://(?:www\.)?youtube\.com/embed/[\w-]+',
        r'^https?://youtu\.be/[\w-]+'
    ]
    
    if not any(re.match(p, value) for p in patterns):
        raise ValidationError('Geçersiz YouTube URL formatı')
    
    return value


def validate_date_range(start_date: Any, end_date: Any) -> None:
    """
    Tarih aralığını doğrular.
    
    Args:
        start_date: Başlangıç tarihi
        end_date: Bitiş tarihi
    
    Raises:
        ValidationError: Geçersiz aralık
    """
    if start_date and end_date and start_date > end_date:
        raise ValidationError('Başlangıç tarihi bitiş tarihinden sonra olamaz')


def validate_positive_integer(value: int) -> int:
    """
    Pozitif tam sayı doğrulaması.
    
    Args:
        value: Sayı
    
    Returns:
        Sayı
    
    Raises:
        ValidationError: Negatif veya sıfır
    """
    if value is not None and value <= 0:
        raise ValidationError('Pozitif bir sayı girilmelidir')
    return value


def validate_percentage(value: float) -> float:
    """
    Yüzde değeri doğrulaması (0-100).
    
    Args:
        value: Yüzde değeri
    
    Returns:
        Değer
    
    Raises:
        ValidationError: Aralık dışı
    """
    if value is not None and (value < 0 or value > 100):
        raise ValidationError('Yüzde değeri 0-100 arasında olmalıdır')
    return value


def validate_file_extension(filename: str, allowed: list) -> str:
    """
    Dosya uzantısını doğrular.
    
    Args:
        filename: Dosya adı
        allowed: İzin verilen uzantılar (örn: ['pdf', 'docx'])
    
    Returns:
        Dosya adı
    
    Raises:
        ValidationError: İzin verilmeyen uzantı
    """
    if not filename:
        return filename
    
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    
    if ext not in allowed:
        raise ValidationError(f'İzin verilen dosya türleri: {", ".join(allowed)}')
    
    return filename
