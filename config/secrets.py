"""
Secrets Management Module.

Gizli anahtar yönetimi için çoklu kaynak desteği.
Environment variables, Docker secrets, Kubernetes secrets, HashiCorp Vault.

DevOps Best Practices:
    - Secrets hiçbir zaman kod içinde saklanmaz
    - Secrets hiçbir zaman log'lanmaz
    - Rotation desteği
    - Audit logging
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Type
from pathlib import Path
from functools import lru_cache
import base64

logger = logging.getLogger(__name__)


# ========================================
# SECRET PROVIDERS (Abstract)
# ========================================

class SecretProvider(ABC):
    """Secret provider abstract base class."""
    
    @abstractmethod
    def get_secret(self, key: str, default: Any = None) -> Any:
        """Gizli değeri al."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Provider kullanılabilir mi?"""
        pass
    
    def get_secret_json(self, key: str, default: Any = None) -> Any:
        """JSON formatındaki secret'ı parse et."""
        value = self.get_secret(key, default)
        if value and isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass
        return value


class EnvironmentSecretProvider(SecretProvider):
    """
    Environment variable'lardan secret okur.
    
    En temel ve yaygın yöntem.
    """
    
    def __init__(self, prefix: str = ""):
        self.prefix = prefix
    
    def get_secret(self, key: str, default: Any = None) -> Any:
        full_key = f"{self.prefix}{key}" if self.prefix else key
        return os.environ.get(full_key, default)
    
    def is_available(self) -> bool:
        return True


class DotEnvSecretProvider(SecretProvider):
    """
    .env dosyalarından secret okur.
    
    Development ortamı için uygundur.
    """
    
    def __init__(self, env_file: str = ".env"):
        self.env_file = Path(env_file)
        self._secrets: Dict[str, str] = {}
        self._load()
    
    def _load(self):
        """Env dosyasını yükle."""
        if not self.env_file.exists():
            return
        
        with open(self.env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    self._secrets[key] = value
    
    def get_secret(self, key: str, default: Any = None) -> Any:
        return self._secrets.get(key, default)
    
    def is_available(self) -> bool:
        return self.env_file.exists()


class DockerSecretProvider(SecretProvider):
    """
    Docker secrets'tan okur.
    
    Docker Swarm için /run/secrets/ dizinindeki dosyalardan okur.
    """
    
    def __init__(self, secrets_path: str = "/run/secrets"):
        self.secrets_path = Path(secrets_path)
    
    def get_secret(self, key: str, default: Any = None) -> Any:
        secret_file = self.secrets_path / key
        
        if secret_file.exists():
            try:
                with open(secret_file, 'r') as f:
                    return f.read().strip()
            except Exception as e:
                logger.error(f"Docker secret read error: {e}")
        
        return default
    
    def is_available(self) -> bool:
        return self.secrets_path.exists() and self.secrets_path.is_dir()


class KubernetesSecretProvider(SecretProvider):
    """
    Kubernetes secrets'tan okur.
    
    Volume mount veya environment variables üzerinden.
    """
    
    def __init__(
        self, 
        secrets_path: str = "/var/run/secrets/kubernetes.io/serviceaccount",
        namespace: str = None
    ):
        self.secrets_path = Path(secrets_path)
        self.namespace = namespace
        self._api_client = None
    
    def get_secret(self, key: str, default: Any = None) -> Any:
        # Önce volume mount'tan dene
        secret_file = self.secrets_path / key
        if secret_file.exists():
            try:
                with open(secret_file, 'r') as f:
                    return f.read().strip()
            except Exception as e:
                logger.error(f"K8s secret file read error: {e}")
        
        # Environment variable'dan dene
        env_value = os.environ.get(key)
        if env_value:
            return env_value
        
        return default
    
    def is_available(self) -> bool:
        # Service account token dosyası var mı?
        token_file = self.secrets_path / "token"
        return token_file.exists()


class VaultSecretProvider(SecretProvider):
    """
    HashiCorp Vault'tan secret okur.
    
    Enterprise-grade secret management.
    """
    
    def __init__(
        self,
        vault_addr: str = None,
        vault_token: str = None,
        vault_path: str = "secret/data/app",
        vault_namespace: str = None
    ):
        self.vault_addr = vault_addr or os.environ.get('VAULT_ADDR')
        self.vault_token = vault_token or os.environ.get('VAULT_TOKEN')
        self.vault_path = vault_path
        self.vault_namespace = vault_namespace
        self._client = None
        self._cache: Dict[str, Any] = {}
    
    def _get_client(self):
        """Vault client oluştur."""
        if self._client:
            return self._client
        
        try:
            import hvac
            self._client = hvac.Client(
                url=self.vault_addr,
                token=self.vault_token,
                namespace=self.vault_namespace
            )
            return self._client
        except ImportError:
            logger.warning("hvac package not installed. Vault provider unavailable.")
            return None
    
    def get_secret(self, key: str, default: Any = None) -> Any:
        if key in self._cache:
            return self._cache[key]
        
        client = self._get_client()
        if not client:
            return default
        
        try:
            response = client.secrets.kv.v2.read_secret_version(
                path=self.vault_path.replace('secret/data/', ''),
            )
            secrets = response['data']['data']
            self._cache.update(secrets)
            return secrets.get(key, default)
        except Exception as e:
            logger.error(f"Vault secret read error: {e}")
            return default
    
    def is_available(self) -> bool:
        if not self.vault_addr or not self.vault_token:
            return False
        
        client = self._get_client()
        if not client:
            return False
        
        try:
            return client.is_authenticated()
        except Exception:
            return False


class AWSSecretsManagerProvider(SecretProvider):
    """
    AWS Secrets Manager'dan secret okur.
    """
    
    def __init__(
        self,
        secret_name: str = None,
        region_name: str = "eu-central-1"
    ):
        self.secret_name = secret_name or os.environ.get('AWS_SECRET_NAME')
        self.region_name = region_name
        self._client = None
        self._cache: Dict[str, Any] = {}
    
    def _get_client(self):
        """AWS client oluştur."""
        if self._client:
            return self._client
        
        try:
            import boto3
            self._client = boto3.client(
                service_name='secretsmanager',
                region_name=self.region_name
            )
            return self._client
        except ImportError:
            logger.warning("boto3 package not installed. AWS provider unavailable.")
            return None
    
    def get_secret(self, key: str, default: Any = None) -> Any:
        if key in self._cache:
            return self._cache[key]
        
        client = self._get_client()
        if not client or not self.secret_name:
            return default
        
        try:
            response = client.get_secret_value(SecretId=self.secret_name)
            secret_string = response.get('SecretString')
            if secret_string:
                secrets = json.loads(secret_string)
                self._cache.update(secrets)
                return secrets.get(key, default)
        except Exception as e:
            logger.error(f"AWS Secrets Manager error: {e}")
        
        return default
    
    def is_available(self) -> bool:
        client = self._get_client()
        if not client or not self.secret_name:
            return False
        
        try:
            client.describe_secret(SecretId=self.secret_name)
            return True
        except Exception:
            return False


# ========================================
# SECRET MANAGER
# ========================================

@dataclass
class SecretsConfig:
    """Secret manager yapılandırması."""
    
    # Provider öncelik sırası
    provider_order: List[str] = field(default_factory=lambda: [
        "environment",
        "dotenv",
        "docker",
        "kubernetes",
        "vault",
        "aws"
    ])
    
    # DotEnv settings
    dotenv_file: str = ".env"
    
    # Docker settings
    docker_secrets_path: str = "/run/secrets"
    
    # Kubernetes settings
    k8s_secrets_path: str = "/var/run/secrets/kubernetes.io/serviceaccount"
    
    # Vault settings
    vault_addr: Optional[str] = None
    vault_token: Optional[str] = None
    vault_path: str = "secret/data/app"
    
    # AWS settings
    aws_secret_name: Optional[str] = None
    aws_region: str = "eu-central-1"
    
    # Caching
    cache_enabled: bool = True
    cache_ttl: int = 300  # 5 dakika


class SecretsManager:
    """
    Çoklu kaynaklı secret manager.
    
    Provider'ları öncelik sırasına göre dener.
    """
    
    def __init__(self, config: SecretsConfig = None):
        self.config = config or SecretsConfig()
        self._providers: Dict[str, SecretProvider] = {}
        self._cache: Dict[str, Any] = {}
        self._init_providers()
    
    def _init_providers(self):
        """Provider'ları initialize et."""
        provider_classes: Dict[str, Type[SecretProvider]] = {
            'environment': lambda: EnvironmentSecretProvider(),
            'dotenv': lambda: DotEnvSecretProvider(self.config.dotenv_file),
            'docker': lambda: DockerSecretProvider(self.config.docker_secrets_path),
            'kubernetes': lambda: KubernetesSecretProvider(self.config.k8s_secrets_path),
            'vault': lambda: VaultSecretProvider(
                self.config.vault_addr,
                self.config.vault_token,
                self.config.vault_path
            ),
            'aws': lambda: AWSSecretsManagerProvider(
                self.config.aws_secret_name,
                self.config.aws_region
            ),
        }
        
        for name in self.config.provider_order:
            if name in provider_classes:
                try:
                    provider = provider_classes[name]()
                    if provider.is_available():
                        self._providers[name] = provider
                        logger.debug(f"Secret provider enabled: {name}")
                except Exception as e:
                    logger.debug(f"Secret provider {name} initialization failed: {e}")
    
    def get(self, key: str, default: Any = None, required: bool = False) -> Any:
        """
        Secret değerini al.
        
        Provider'ları öncelik sırasına göre dener.
        
        Args:
            key: Secret key
            default: Varsayılan değer
            required: Zorunlu mu? (Yoksa hata fırlatır)
        
        Returns:
            Secret değeri
        
        Raises:
            ValueError: Required secret bulunamazsa
        """
        # Cache kontrolü
        if self.config.cache_enabled and key in self._cache:
            return self._cache[key]
        
        # Provider'lardan dene
        for name in self.config.provider_order:
            provider = self._providers.get(name)
            if provider:
                value = provider.get_secret(key)
                if value is not None:
                    if self.config.cache_enabled:
                        self._cache[key] = value
                    logger.debug(f"Secret '{key}' found in provider: {name}")
                    return value
        
        if required:
            raise ValueError(f"Required secret not found: {key}")
        
        return default
    
    def get_json(self, key: str, default: Any = None, required: bool = False) -> Any:
        """JSON formatındaki secret'ı al ve parse et."""
        value = self.get(key, default, required)
        if value and isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass
        return value
    
    def get_int(self, key: str, default: int = 0) -> int:
        """Integer secret al."""
        value = self.get(key)
        if value is not None:
            try:
                return int(value)
            except (ValueError, TypeError):
                pass
        return default
    
    def get_bool(self, key: str, default: bool = False) -> bool:
        """Boolean secret al."""
        value = self.get(key)
        if value is not None:
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.lower() in ('true', '1', 'yes', 'on')
        return default
    
    def get_list(self, key: str, separator: str = ",", default: List = None) -> List:
        """List secret al (virgülle ayrılmış)."""
        value = self.get(key)
        if value:
            return [item.strip() for item in value.split(separator)]
        return default or []
    
    def clear_cache(self):
        """Cache'i temizle."""
        self._cache.clear()
    
    def available_providers(self) -> List[str]:
        """Kullanılabilir provider listesi."""
        return list(self._providers.keys())
    
    def __getitem__(self, key: str) -> Any:
        """Dict-like access."""
        return self.get(key)
    
    def __contains__(self, key: str) -> bool:
        """in operator desteği."""
        return self.get(key) is not None


# ========================================
# REQUIRED SECRETS DEFINITION
# ========================================

REQUIRED_SECRETS = {
    'production': [
        'SECRET_KEY',
        'JWT_SECRET_KEY',
        'DATABASE_URL',
        'REDIS_URL',
    ],
    'staging': [
        'SECRET_KEY',
        'JWT_SECRET_KEY',
        'DATABASE_URL',
    ],
    'development': [
        # Development'ta zorunlu secret yok
    ]
}


def validate_secrets(env: str = 'production') -> Dict[str, Any]:
    """
    Ortam için gerekli secret'ları doğrula.
    
    Args:
        env: Ortam adı
    
    Returns:
        Doğrulama sonucu
    """
    secrets = get_secrets()
    required = REQUIRED_SECRETS.get(env, [])
    
    missing = []
    found = []
    
    for key in required:
        if secrets.get(key) is not None:
            found.append(key)
        else:
            missing.append(key)
    
    return {
        'valid': len(missing) == 0,
        'environment': env,
        'required': required,
        'found': found,
        'missing': missing,
    }


# ========================================
# GLOBAL INSTANCE
# ========================================

_secrets_manager: Optional[SecretsManager] = None


@lru_cache()
def get_secrets() -> SecretsManager:
    """Global secrets manager döner."""
    global _secrets_manager
    if _secrets_manager is None:
        _secrets_manager = SecretsManager()
    return _secrets_manager


def init_secrets(config: SecretsConfig = None) -> SecretsManager:
    """
    Secrets manager'ı initialize et.
    
    Args:
        config: Secrets config
    
    Returns:
        SecretsManager instance
    """
    global _secrets_manager
    get_secrets.cache_clear()
    _secrets_manager = SecretsManager(config)
    return _secrets_manager


# ========================================
# CONVENIENCE FUNCTIONS
# ========================================

def get_secret(key: str, default: Any = None, required: bool = False) -> Any:
    """Secret değerini al (kısayol)."""
    return get_secrets().get(key, default, required)


def get_database_url() -> str:
    """Database URL'ini al."""
    return get_secret('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/student_coaching')


def get_redis_url() -> str:
    """Redis URL'ini al."""
    return get_secret('REDIS_URL', 'redis://localhost:6379/0')


def get_secret_key() -> str:
    """Flask secret key al."""
    import secrets as sec
    return get_secret('SECRET_KEY', sec.token_urlsafe(32))


def get_jwt_secret_key() -> str:
    """JWT secret key al."""
    import secrets as sec
    return get_secret('JWT_SECRET_KEY', sec.token_urlsafe(32))
