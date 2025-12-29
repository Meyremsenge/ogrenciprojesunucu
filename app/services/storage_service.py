"""
Storage Service - Dosya depolama servisi.

Bu servis dosya yükleme ve yönetim işlemlerini yönetir.
"""

from typing import Optional, BinaryIO, Dict, Any, List
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import uuid
import logging

logger = logging.getLogger(__name__)


class StorageProvider:
    """Depolama sağlayıcı tipleri."""
    LOCAL = 'local'
    S3 = 's3'
    GCS = 'gcs'  # Google Cloud Storage
    AZURE = 'azure'


class StorageService:
    """
    Dosya depolama servisi.
    
    Yerel veya bulut depolama (S3, GCS, Azure Blob) ile
    dosya yönetimini sağlar.
    """
    
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    ALLOWED_DOCUMENT_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'}
    ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv', 'webm'}
    
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    
    @classmethod
    def upload_file(
        cls,
        file: BinaryIO,
        filename: str,
        folder: str = 'uploads',
        allowed_extensions: set = None,
        max_size: int = None
    ) -> Dict[str, Any]:
        """
        Dosya yükler.
        
        Args:
            file: Dosya nesnesi
            filename: Orijinal dosya adı
            folder: Hedef klasör
            allowed_extensions: İzin verilen uzantılar
            max_size: Maksimum boyut
            
        Returns:
            Dict: Dosya bilgileri (url, filename, size, etc.)
            
        Raises:
            ValidationError: Geçersiz dosya
        """
        from flask import current_app
        from app.core.exceptions import ValidationError
        
        # Uzantı kontrolü
        ext = cls._get_extension(filename)
        if allowed_extensions and ext not in allowed_extensions:
            raise ValidationError(
                f'Geçersiz dosya türü. İzin verilen: {", ".join(allowed_extensions)}'
            )
        
        # Boyut kontrolü
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        
        max_allowed = max_size or cls.MAX_FILE_SIZE
        if size > max_allowed:
            raise ValidationError(
                f'Dosya boyutu çok büyük. Maksimum: {max_allowed // (1024*1024)}MB'
            )
        
        # Benzersiz dosya adı oluştur
        safe_filename = cls._generate_unique_filename(filename)
        
        # Sağlayıcıya göre yükle
        provider = current_app.config.get('STORAGE_PROVIDER', StorageProvider.LOCAL)
        
        if provider == StorageProvider.LOCAL:
            return cls._upload_local(file, safe_filename, folder, size)
        elif provider == StorageProvider.S3:
            return cls._upload_s3(file, safe_filename, folder, size)
        else:
            return cls._upload_local(file, safe_filename, folder, size)
    
    @classmethod
    def upload_image(
        cls,
        file: BinaryIO,
        filename: str,
        folder: str = 'images'
    ) -> Dict[str, Any]:
        """Resim dosyası yükler."""
        return cls.upload_file(
            file=file,
            filename=filename,
            folder=folder,
            allowed_extensions=cls.ALLOWED_IMAGE_EXTENSIONS
        )
    
    @classmethod
    def upload_document(
        cls,
        file: BinaryIO,
        filename: str,
        folder: str = 'documents'
    ) -> Dict[str, Any]:
        """Doküman yükler."""
        return cls.upload_file(
            file=file,
            filename=filename,
            folder=folder,
            allowed_extensions=cls.ALLOWED_DOCUMENT_EXTENSIONS
        )
    
    @classmethod
    def upload_video(
        cls,
        file: BinaryIO,
        filename: str,
        folder: str = 'videos'
    ) -> Dict[str, Any]:
        """Video yükler."""
        return cls.upload_file(
            file=file,
            filename=filename,
            folder=folder,
            allowed_extensions=cls.ALLOWED_VIDEO_EXTENSIONS,
            max_size=500 * 1024 * 1024  # 500MB
        )
    
    @classmethod
    def delete_file(cls, file_path: str) -> bool:
        """Dosyayı siler."""
        from flask import current_app
        
        try:
            provider = current_app.config.get('STORAGE_PROVIDER', StorageProvider.LOCAL)
            
            if provider == StorageProvider.LOCAL:
                return cls._delete_local(file_path)
            elif provider == StorageProvider.S3:
                return cls._delete_s3(file_path)
            
            return False
            
        except Exception as e:
            logger.error(f'File delete error: {str(e)}')
            return False
    
    @classmethod
    def get_url(cls, file_path: str) -> str:
        """Dosya URL'sini döner."""
        from flask import current_app
        
        provider = current_app.config.get('STORAGE_PROVIDER', StorageProvider.LOCAL)
        
        if provider == StorageProvider.LOCAL:
            base_url = current_app.config.get('BASE_URL', 'http://localhost:5000')
            return f"{base_url}/uploads/{file_path}"
        elif provider == StorageProvider.S3:
            bucket = current_app.config.get('S3_BUCKET')
            region = current_app.config.get('S3_REGION', 'us-east-1')
            return f"https://{bucket}.s3.{region}.amazonaws.com/{file_path}"
        
        return file_path
    
    # =========================================================================
    # Private Methods
    # =========================================================================
    
    @classmethod
    def _get_extension(cls, filename: str) -> str:
        """Dosya uzantısını döner."""
        return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    
    @classmethod
    def _generate_unique_filename(cls, filename: str) -> str:
        """Benzersiz dosya adı üretir."""
        ext = cls._get_extension(filename)
        safe_name = secure_filename(filename.rsplit('.', 1)[0])
        unique_id = uuid.uuid4().hex[:8]
        timestamp = datetime.utcnow().strftime('%Y%m%d')
        
        return f"{timestamp}_{unique_id}_{safe_name}.{ext}"
    
    @classmethod
    def _upload_local(
        cls,
        file: BinaryIO,
        filename: str,
        folder: str,
        size: int
    ) -> Dict[str, Any]:
        """Yerel dosya sistemine yükler."""
        from flask import current_app
        
        upload_dir = os.path.join(
            current_app.config.get('UPLOAD_FOLDER', 'uploads'),
            folder
        )
        
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        relative_path = f"{folder}/{filename}"
        
        return {
            'filename': filename,
            'original_filename': filename,
            'path': relative_path,
            'url': cls.get_url(relative_path),
            'size': size,
            'mime_type': cls._get_mime_type(filename),
            'provider': StorageProvider.LOCAL
        }
    
    @classmethod
    def _upload_s3(
        cls,
        file: BinaryIO,
        filename: str,
        folder: str,
        size: int
    ) -> Dict[str, Any]:
        """AWS S3'e yükler."""
        from flask import current_app
        import boto3
        
        s3 = boto3.client(
            's3',
            aws_access_key_id=current_app.config.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=current_app.config.get('AWS_SECRET_ACCESS_KEY'),
            region_name=current_app.config.get('S3_REGION', 'us-east-1')
        )
        
        bucket = current_app.config.get('S3_BUCKET')
        key = f"{folder}/{filename}"
        
        s3.upload_fileobj(
            file,
            bucket,
            key,
            ExtraArgs={
                'ContentType': cls._get_mime_type(filename),
                'ACL': 'public-read'
            }
        )
        
        return {
            'filename': filename,
            'path': key,
            'url': cls.get_url(key),
            'size': size,
            'mime_type': cls._get_mime_type(filename),
            'provider': StorageProvider.S3
        }
    
    @classmethod
    def _delete_local(cls, file_path: str) -> bool:
        """Yerel dosya siler."""
        from flask import current_app
        
        full_path = os.path.join(
            current_app.config.get('UPLOAD_FOLDER', 'uploads'),
            file_path
        )
        
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        
        return False
    
    @classmethod
    def _delete_s3(cls, file_path: str) -> bool:
        """S3'ten dosya siler."""
        from flask import current_app
        import boto3
        
        s3 = boto3.client(
            's3',
            aws_access_key_id=current_app.config.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=current_app.config.get('AWS_SECRET_ACCESS_KEY'),
            region_name=current_app.config.get('S3_REGION', 'us-east-1')
        )
        
        bucket = current_app.config.get('S3_BUCKET')
        s3.delete_object(Bucket=bucket, Key=file_path)
        
        return True
    
    @classmethod
    def _get_mime_type(cls, filename: str) -> str:
        """MIME tipini döner."""
        import mimetypes
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'
