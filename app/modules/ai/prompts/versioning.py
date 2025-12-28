"""
Enterprise Prompt Management System.

Bu modül, AI promptlarının:
- Koddan tamamen ayrılması
- Versiyonlanması
- A/B test edilebilmesi
- Rollback yapılabilmesi
- Audit log'a kaydedilmesi

özelliklerini sağlar.

KULLANIM:
=========
    from app.modules.ai.prompts.versioning import prompt_version_manager
    
    # Aktif prompt'u al
    prompt = prompt_version_manager.get_active_prompt('question_hint')
    
    # A/B test için variant al
    prompt = prompt_version_manager.get_ab_test_variant('question_hint', user_id=123)
    
    # Rollback yap
    prompt_version_manager.rollback('question_hint', target_version='1.0.0')
"""

import os
import json
import hashlib
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
import random
import yaml
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS & DATA CLASSES
# =============================================================================

class PromptStatus(str, Enum):
    """Prompt durumları."""
    DRAFT = "draft"              # Taslak
    ACTIVE = "active"            # Aktif (production)
    TESTING = "testing"          # A/B test'te
    DEPRECATED = "deprecated"    # Kullanımdan kaldırıldı
    ARCHIVED = "archived"        # Arşivlendi


class PromptChangeType(str, Enum):
    """Prompt değişiklik türleri."""
    CREATED = "created"
    UPDATED = "updated"
    ACTIVATED = "activated"
    DEPRECATED = "deprecated"
    ROLLED_BACK = "rolled_back"
    AB_TEST_STARTED = "ab_test_started"
    AB_TEST_ENDED = "ab_test_ended"


@dataclass
class PromptVersion:
    """Prompt versiyon bilgisi."""
    name: str
    version: str
    status: PromptStatus
    system_prompt: str
    user_prompt: str
    
    # Metadata
    description: str = ""
    author: str = "system"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    # Config
    max_tokens: int = 500
    temperature: float = 0.7
    required_variables: List[str] = field(default_factory=list)
    optional_variables: List[str] = field(default_factory=list)
    roles: List[str] = field(default_factory=list)
    
    # A/B Test
    ab_test_weight: float = 0.0  # 0 = A/B test'te değil
    
    # Validation
    validation_rules: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def content_hash(self) -> str:
        """Prompt içerik hash'i (değişiklik tespiti için)."""
        content = f"{self.system_prompt}|{self.user_prompt}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    @property
    def version_tuple(self) -> Tuple[int, int, int]:
        """Semantic version tuple (karşılaştırma için)."""
        try:
            parts = self.version.split('.')
            return (int(parts[0]), int(parts[1]), int(parts[2]))
        except (ValueError, IndexError):
            return (0, 0, 0)
    
    def to_dict(self) -> Dict[str, Any]:
        """Dict'e çevir."""
        data = asdict(self)
        data['status'] = self.status.value
        data['created_at'] = self.created_at.isoformat()
        data['updated_at'] = self.updated_at.isoformat()
        data['content_hash'] = self.content_hash
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PromptVersion':
        """Dict'ten oluştur."""
        data = data.copy()
        data['status'] = PromptStatus(data.get('status', 'draft'))
        
        if isinstance(data.get('created_at'), str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if isinstance(data.get('updated_at'), str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
        
        # content_hash'i kaldır (property)
        data.pop('content_hash', None)
        
        return cls(**data)


@dataclass
class PromptAuditEntry:
    """Prompt değişiklik audit kaydı."""
    prompt_name: str
    version: str
    change_type: PromptChangeType
    changed_by: str
    changed_at: datetime
    previous_version: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'prompt_name': self.prompt_name,
            'version': self.version,
            'change_type': self.change_type.value,
            'changed_by': self.changed_by,
            'changed_at': self.changed_at.isoformat(),
            'previous_version': self.previous_version,
            'details': self.details
        }


@dataclass
class ABTestConfig:
    """A/B test konfigürasyonu."""
    prompt_name: str
    control_version: str      # A variant (mevcut)
    test_version: str         # B variant (test edilen)
    test_weight: float        # B variant'a gidecek trafik yüzdesi (0.0-1.0)
    started_at: datetime
    ends_at: Optional[datetime] = None
    started_by: str = "system"
    
    # Metrikler
    control_requests: int = 0
    test_requests: int = 0
    control_success_rate: float = 0.0
    test_success_rate: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'prompt_name': self.prompt_name,
            'control_version': self.control_version,
            'test_version': self.test_version,
            'test_weight': self.test_weight,
            'started_at': self.started_at.isoformat(),
            'ends_at': self.ends_at.isoformat() if self.ends_at else None,
            'started_by': self.started_by,
            'control_requests': self.control_requests,
            'test_requests': self.test_requests,
            'control_success_rate': self.control_success_rate,
            'test_success_rate': self.test_success_rate
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ABTestConfig':
        data = data.copy()
        data['started_at'] = datetime.fromisoformat(data['started_at'])
        if data.get('ends_at'):
            data['ends_at'] = datetime.fromisoformat(data['ends_at'])
        return cls(**data)


# =============================================================================
# PROMPT VERSION STORAGE
# =============================================================================

class PromptVersionStorage:
    """
    Prompt versiyon storage.
    
    Dosya yapısı:
    prompts/
    ├── versions/
    │   ├── question_hint/
    │   │   ├── 1.0.0.yaml
    │   │   ├── 1.1.0.yaml
    │   │   ├── 2.0.0.yaml
    │   │   └── metadata.json
    │   ├── topic_explanation/
    │   │   ├── 1.0.0.yaml
    │   │   └── metadata.json
    │   └── ...
    ├── active/
    │   ├── question_hint.yaml -> ../versions/question_hint/1.1.0.yaml
    │   └── ...
    ├── ab_tests.json
    └── audit_log.json
    """
    
    def __init__(self, base_path: Path = None):
        if base_path is None:
            base_path = Path(__file__).parent / "versioned"
        
        self.base_path = base_path
        self.versions_path = base_path / "versions"
        self.active_path = base_path / "active"
        self.ab_tests_file = base_path / "ab_tests.json"
        self.audit_log_file = base_path / "audit_log.json"
        
        # Dizinleri oluştur
        self._ensure_directories()
    
    def _ensure_directories(self) -> None:
        """Gerekli dizinleri oluştur."""
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.versions_path.mkdir(exist_ok=True)
        self.active_path.mkdir(exist_ok=True)
        
        # Boş audit log ve ab_tests dosyalarını oluştur
        if not self.audit_log_file.exists():
            self._write_json(self.audit_log_file, [])
        if not self.ab_tests_file.exists():
            self._write_json(self.ab_tests_file, {})
    
    def _write_json(self, path: Path, data: Any) -> None:
        """JSON dosyasına yaz."""
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _read_json(self, path: Path) -> Any:
        """JSON dosyasından oku."""
        if not path.exists():
            return None
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _write_yaml(self, path: Path, data: Dict[str, Any]) -> None:
        """YAML dosyasına yaz."""
        with open(path, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
    
    def _read_yaml(self, path: Path) -> Dict[str, Any]:
        """YAML dosyasından oku."""
        if not path.exists():
            return None
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    # =========================================================================
    # VERSION OPERATIONS
    # =========================================================================
    
    def save_version(self, prompt: PromptVersion) -> None:
        """Yeni versiyon kaydet."""
        prompt_dir = self.versions_path / prompt.name
        prompt_dir.mkdir(exist_ok=True)
        
        # Version dosyasını kaydet
        version_file = prompt_dir / f"{prompt.version}.yaml"
        self._write_yaml(version_file, prompt.to_dict())
        
        # Metadata güncelle
        self._update_metadata(prompt.name)
        
        logger.info(f"Prompt version saved: {prompt.name} v{prompt.version}")
    
    def get_version(self, name: str, version: str) -> Optional[PromptVersion]:
        """Belirli bir versiyonu al."""
        version_file = self.versions_path / name / f"{version}.yaml"
        data = self._read_yaml(version_file)
        
        if data:
            return PromptVersion.from_dict(data)
        return None
    
    def get_all_versions(self, name: str) -> List[PromptVersion]:
        """Tüm versiyonları al."""
        prompt_dir = self.versions_path / name
        
        if not prompt_dir.exists():
            return []
        
        versions = []
        for yaml_file in prompt_dir.glob("*.yaml"):
            if yaml_file.stem == 'metadata':
                continue
            
            data = self._read_yaml(yaml_file)
            if data:
                versions.append(PromptVersion.from_dict(data))
        
        # Version'a göre sırala (en yenisi önce)
        versions.sort(key=lambda v: v.version_tuple, reverse=True)
        return versions
    
    def get_latest_version(self, name: str) -> Optional[PromptVersion]:
        """En son versiyonu al."""
        versions = self.get_all_versions(name)
        return versions[0] if versions else None
    
    def _update_metadata(self, name: str) -> None:
        """Prompt metadata'sını güncelle."""
        prompt_dir = self.versions_path / name
        metadata_file = prompt_dir / "metadata.json"
        
        versions = self.get_all_versions(name)
        active = self.get_active(name)
        
        metadata = {
            'name': name,
            'versions': [v.version for v in versions],
            'latest_version': versions[0].version if versions else None,
            'active_version': active.version if active else None,
            'total_versions': len(versions),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        self._write_json(metadata_file, metadata)
    
    # =========================================================================
    # ACTIVE VERSION OPERATIONS
    # =========================================================================
    
    def set_active(self, name: str, version: str) -> None:
        """Aktif versiyonu ayarla."""
        prompt = self.get_version(name, version)
        if not prompt:
            raise ValueError(f"Version not found: {name} v{version}")
        
        # Aktif dosyayı oluştur/güncelle
        active_file = self.active_path / f"{name}.yaml"
        
        # Durumu ACTIVE yap
        prompt.status = PromptStatus.ACTIVE
        prompt.updated_at = datetime.utcnow()
        
        self._write_yaml(active_file, prompt.to_dict())
        
        # Orijinal version dosyasını da güncelle
        self.save_version(prompt)
        
        logger.info(f"Active prompt set: {name} v{version}")
    
    def get_active(self, name: str) -> Optional[PromptVersion]:
        """Aktif versiyonu al."""
        active_file = self.active_path / f"{name}.yaml"
        data = self._read_yaml(active_file)
        
        if data:
            return PromptVersion.from_dict(data)
        return None
    
    def list_active_prompts(self) -> List[PromptVersion]:
        """Tüm aktif promptları listele."""
        prompts = []
        
        for yaml_file in self.active_path.glob("*.yaml"):
            data = self._read_yaml(yaml_file)
            if data:
                prompts.append(PromptVersion.from_dict(data))
        
        return prompts
    
    # =========================================================================
    # A/B TEST OPERATIONS
    # =========================================================================
    
    def save_ab_test(self, config: ABTestConfig) -> None:
        """A/B test konfigürasyonu kaydet."""
        ab_tests = self._read_json(self.ab_tests_file) or {}
        ab_tests[config.prompt_name] = config.to_dict()
        self._write_json(self.ab_tests_file, ab_tests)
    
    def get_ab_test(self, name: str) -> Optional[ABTestConfig]:
        """A/B test konfigürasyonu al."""
        ab_tests = self._read_json(self.ab_tests_file) or {}
        data = ab_tests.get(name)
        
        if data:
            return ABTestConfig.from_dict(data)
        return None
    
    def delete_ab_test(self, name: str) -> None:
        """A/B test konfigürasyonunu sil."""
        ab_tests = self._read_json(self.ab_tests_file) or {}
        if name in ab_tests:
            del ab_tests[name]
            self._write_json(self.ab_tests_file, ab_tests)
    
    def list_ab_tests(self) -> List[ABTestConfig]:
        """Tüm aktif A/B testlerini listele."""
        ab_tests = self._read_json(self.ab_tests_file) or {}
        return [ABTestConfig.from_dict(data) for data in ab_tests.values()]
    
    # =========================================================================
    # AUDIT LOG OPERATIONS
    # =========================================================================
    
    def add_audit_entry(self, entry: PromptAuditEntry) -> None:
        """Audit log'a kayıt ekle."""
        audit_log = self._read_json(self.audit_log_file) or []
        audit_log.append(entry.to_dict())
        
        # Son 10000 kaydı tut
        if len(audit_log) > 10000:
            audit_log = audit_log[-10000:]
        
        self._write_json(self.audit_log_file, audit_log)
    
    def get_audit_log(
        self,
        prompt_name: str = None,
        limit: int = 100,
        change_type: PromptChangeType = None
    ) -> List[PromptAuditEntry]:
        """Audit log'u al."""
        audit_log = self._read_json(self.audit_log_file) or []
        
        # Filtrele
        filtered = audit_log
        
        if prompt_name:
            filtered = [e for e in filtered if e['prompt_name'] == prompt_name]
        
        if change_type:
            filtered = [e for e in filtered if e['change_type'] == change_type.value]
        
        # Son N kaydı al
        filtered = filtered[-limit:]
        
        # Yeniden eskiye sırala
        filtered.reverse()
        
        return [
            PromptAuditEntry(
                prompt_name=e['prompt_name'],
                version=e['version'],
                change_type=PromptChangeType(e['change_type']),
                changed_by=e['changed_by'],
                changed_at=datetime.fromisoformat(e['changed_at']),
                previous_version=e.get('previous_version'),
                details=e.get('details', {})
            )
            for e in filtered
        ]


# =============================================================================
# PROMPT VERSION MANAGER
# =============================================================================

class PromptVersionManager:
    """
    Prompt versiyon yöneticisi.
    
    Ana giriş noktası. Tüm prompt operasyonları bu sınıf üzerinden yapılır.
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, storage: PromptVersionStorage = None):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        self.storage = storage or PromptVersionStorage()
        self._cache: Dict[str, PromptVersion] = {}
        self._initialized = True
        
        # Mevcut template'leri migrate et (ilk çalışmada)
        self._migrate_existing_templates()
    
    def _migrate_existing_templates(self) -> None:
        """Mevcut YAML template'leri versioned yapıya migrate et."""
        templates_dir = Path(__file__).parent / "templates"
        
        if not templates_dir.exists():
            return
        
        for yaml_file in templates_dir.glob("*.yaml"):
            name = yaml_file.stem
            
            # Zaten versioned varsa atla
            if self.storage.get_latest_version(name):
                continue
            
            try:
                with open(yaml_file, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)
                
                if not data:
                    continue
                
                # PromptVersion oluştur
                cache_config = data.get('cache', {})
                
                prompt = PromptVersion(
                    name=data.get('name', name),
                    version=data.get('version', '1.0.0'),
                    status=PromptStatus.ACTIVE,
                    system_prompt=data.get('system_prompt', ''),
                    user_prompt=data.get('user_prompt', ''),
                    description=data.get('description', ''),
                    author='migration',
                    max_tokens=data.get('max_tokens', 500),
                    required_variables=data.get('required_variables', []),
                    optional_variables=data.get('optional_variables', []),
                    roles=data.get('roles', []),
                    validation_rules=data.get('validation', {})
                )
                
                # Kaydet ve aktif yap
                self.storage.save_version(prompt)
                self.storage.set_active(prompt.name, prompt.version)
                
                # Audit log
                self._log_change(
                    prompt.name,
                    prompt.version,
                    PromptChangeType.CREATED,
                    'migration',
                    details={'source': str(yaml_file)}
                )
                
                logger.info(f"Migrated template: {name}")
                
            except Exception as e:
                logger.error(f"Failed to migrate template {name}: {e}")
    
    # =========================================================================
    # PROMPT OPERATIONS
    # =========================================================================
    
    def get_active_prompt(self, name: str) -> Optional[PromptVersion]:
        """
        Aktif prompt'u al.
        
        A/B test varsa cache'den, yoksa storage'dan alır.
        """
        # Cache kontrolü
        cache_key = f"active:{name}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        prompt = self.storage.get_active(name)
        
        if prompt:
            self._cache[cache_key] = prompt
        
        return prompt
    
    def get_ab_test_variant(
        self,
        name: str,
        user_id: int,
        session_id: str = None
    ) -> Tuple[PromptVersion, str]:
        """
        A/B test için variant al.
        
        Returns:
            (prompt, variant) - variant: 'control' veya 'test'
        """
        ab_test = self.storage.get_ab_test(name)
        
        if not ab_test:
            # A/B test yok, aktif prompt'u döndür
            prompt = self.get_active_prompt(name)
            return (prompt, 'control') if prompt else (None, None)
        
        # Deterministic selection (aynı user her zaman aynı variant'ı alır)
        hash_input = f"{name}:{user_id}:{session_id or ''}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        selection = (hash_value % 100) / 100.0
        
        if selection < ab_test.test_weight:
            # Test variant
            prompt = self.storage.get_version(name, ab_test.test_version)
            variant = 'test'
        else:
            # Control variant
            prompt = self.storage.get_version(name, ab_test.control_version)
            variant = 'control'
        
        return (prompt, variant)
    
    def create_version(
        self,
        name: str,
        system_prompt: str,
        user_prompt: str,
        author: str,
        version: str = None,
        **kwargs
    ) -> PromptVersion:
        """
        Yeni prompt versiyonu oluştur.
        
        Version otomatik artırılabilir veya manuel verilebilir.
        """
        # Version belirleme
        if version is None:
            latest = self.storage.get_latest_version(name)
            if latest:
                # Patch version'ı artır
                major, minor, patch = latest.version_tuple
                version = f"{major}.{minor}.{patch + 1}"
            else:
                version = "1.0.0"
        
        # Aynı version varsa hata
        existing = self.storage.get_version(name, version)
        if existing:
            raise ValueError(f"Version already exists: {name} v{version}")
        
        # PromptVersion oluştur
        prompt = PromptVersion(
            name=name,
            version=version,
            status=PromptStatus.DRAFT,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            author=author,
            **kwargs
        )
        
        # Kaydet
        self.storage.save_version(prompt)
        
        # Audit log
        previous = self.storage.get_latest_version(name)
        self._log_change(
            name,
            version,
            PromptChangeType.CREATED,
            author,
            previous_version=previous.version if previous and previous.version != version else None
        )
        
        # Cache temizle
        self._invalidate_cache(name)
        
        return prompt
    
    def activate_version(self, name: str, version: str, activated_by: str) -> PromptVersion:
        """Belirli bir versiyonu aktif yap."""
        prompt = self.storage.get_version(name, version)
        
        if not prompt:
            raise ValueError(f"Version not found: {name} v{version}")
        
        # Önceki aktif versiyonu al
        previous = self.storage.get_active(name)
        
        # Yeni versiyonu aktif yap
        self.storage.set_active(name, version)
        
        # Audit log
        self._log_change(
            name,
            version,
            PromptChangeType.ACTIVATED,
            activated_by,
            previous_version=previous.version if previous else None
        )
        
        # Cache temizle
        self._invalidate_cache(name)
        
        return self.storage.get_active(name)
    
    def rollback(
        self,
        name: str,
        target_version: str = None,
        rolled_back_by: str = "system"
    ) -> PromptVersion:
        """
        Önceki versiyona geri dön.
        
        Args:
            name: Prompt adı
            target_version: Hedef versiyon (None ise bir önceki)
            rolled_back_by: Rollback yapan kişi
        """
        current = self.storage.get_active(name)
        
        if not current:
            raise ValueError(f"No active prompt found: {name}")
        
        if target_version is None:
            # Bir önceki versiyonu bul
            versions = self.storage.get_all_versions(name)
            
            # Aktif olmayan en son versiyonu bul
            for v in versions:
                if v.version != current.version:
                    target_version = v.version
                    break
            
            if target_version is None:
                raise ValueError(f"No previous version to rollback: {name}")
        
        # Rollback yap
        self.storage.set_active(name, target_version)
        
        # Audit log
        self._log_change(
            name,
            target_version,
            PromptChangeType.ROLLED_BACK,
            rolled_back_by,
            previous_version=current.version,
            details={'reason': f"Rolled back from v{current.version}"}
        )
        
        # Cache temizle
        self._invalidate_cache(name)
        
        logger.warning(f"Prompt rolled back: {name} v{current.version} -> v{target_version}")
        
        return self.storage.get_active(name)
    
    # =========================================================================
    # A/B TEST OPERATIONS
    # =========================================================================
    
    def start_ab_test(
        self,
        name: str,
        test_version: str,
        test_weight: float = 0.1,
        started_by: str = "system"
    ) -> ABTestConfig:
        """
        A/B test başlat.
        
        Args:
            name: Prompt adı
            test_version: Test edilecek versiyon
            test_weight: Test variant'a gidecek trafik yüzdesi (0.0-1.0)
            started_by: Başlatan kişi
        """
        # Kontrol
        if test_weight < 0 or test_weight > 1:
            raise ValueError("test_weight must be between 0.0 and 1.0")
        
        active = self.storage.get_active(name)
        if not active:
            raise ValueError(f"No active prompt found: {name}")
        
        test_prompt = self.storage.get_version(name, test_version)
        if not test_prompt:
            raise ValueError(f"Test version not found: {name} v{test_version}")
        
        # Zaten A/B test varsa kaldır
        existing = self.storage.get_ab_test(name)
        if existing:
            self.end_ab_test(name, ended_by=started_by)
        
        # A/B test config oluştur
        config = ABTestConfig(
            prompt_name=name,
            control_version=active.version,
            test_version=test_version,
            test_weight=test_weight,
            started_at=datetime.utcnow(),
            started_by=started_by
        )
        
        # Kaydet
        self.storage.save_ab_test(config)
        
        # Audit log
        self._log_change(
            name,
            test_version,
            PromptChangeType.AB_TEST_STARTED,
            started_by,
            details={
                'control_version': active.version,
                'test_weight': test_weight
            }
        )
        
        logger.info(f"A/B test started: {name} (control: v{active.version}, test: v{test_version}, weight: {test_weight})")
        
        return config
    
    def end_ab_test(
        self,
        name: str,
        winner: str = None,
        ended_by: str = "system"
    ) -> Optional[PromptVersion]:
        """
        A/B test'i sonlandır.
        
        Args:
            name: Prompt adı
            winner: Kazanan variant ('control' veya 'test'), None ise sadece kapat
            ended_by: Sonlandıran kişi
        
        Returns:
            Kazanan prompt (winner belirtildiyse)
        """
        config = self.storage.get_ab_test(name)
        
        if not config:
            return None
        
        winner_version = None
        
        if winner == 'test':
            # Test versiyonu kazandı, aktif yap
            self.activate_version(name, config.test_version, ended_by)
            winner_version = config.test_version
        elif winner == 'control':
            winner_version = config.control_version
        
        # A/B test config'i sil
        self.storage.delete_ab_test(name)
        
        # Audit log
        self._log_change(
            name,
            winner_version or config.control_version,
            PromptChangeType.AB_TEST_ENDED,
            ended_by,
            details={
                'control_version': config.control_version,
                'test_version': config.test_version,
                'winner': winner,
                'control_requests': config.control_requests,
                'test_requests': config.test_requests
            }
        )
        
        logger.info(f"A/B test ended: {name} (winner: {winner or 'none'})")
        
        if winner_version:
            return self.storage.get_version(name, winner_version)
        return None
    
    def record_ab_test_result(
        self,
        name: str,
        variant: str,
        success: bool
    ) -> None:
        """A/B test sonucunu kaydet."""
        config = self.storage.get_ab_test(name)
        
        if not config:
            return
        
        if variant == 'control':
            config.control_requests += 1
            if success:
                config.control_success_rate = (
                    (config.control_success_rate * (config.control_requests - 1) + 1)
                    / config.control_requests
                )
        else:
            config.test_requests += 1
            if success:
                config.test_success_rate = (
                    (config.test_success_rate * (config.test_requests - 1) + 1)
                    / config.test_requests
                )
        
        self.storage.save_ab_test(config)
    
    # =========================================================================
    # QUERY OPERATIONS
    # =========================================================================
    
    def list_prompts(self) -> List[Dict[str, Any]]:
        """Tüm promptları listele."""
        prompts = []
        
        for prompt_dir in self.storage.versions_path.iterdir():
            if not prompt_dir.is_dir():
                continue
            
            name = prompt_dir.name
            versions = self.storage.get_all_versions(name)
            active = self.storage.get_active(name)
            ab_test = self.storage.get_ab_test(name)
            
            prompts.append({
                'name': name,
                'active_version': active.version if active else None,
                'latest_version': versions[0].version if versions else None,
                'total_versions': len(versions),
                'has_ab_test': ab_test is not None,
                'description': active.description if active else ''
            })
        
        return prompts
    
    def get_version_history(self, name: str) -> List[Dict[str, Any]]:
        """Prompt versiyon geçmişini al."""
        versions = self.storage.get_all_versions(name)
        active = self.storage.get_active(name)
        
        return [
            {
                'version': v.version,
                'status': v.status.value,
                'is_active': active and v.version == active.version,
                'author': v.author,
                'created_at': v.created_at.isoformat(),
                'content_hash': v.content_hash,
                'description': v.description
            }
            for v in versions
        ]
    
    def get_audit_log(
        self,
        prompt_name: str = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Audit log'u al."""
        entries = self.storage.get_audit_log(prompt_name, limit)
        return [e.to_dict() for e in entries]
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _log_change(
        self,
        name: str,
        version: str,
        change_type: PromptChangeType,
        changed_by: str,
        previous_version: str = None,
        details: Dict[str, Any] = None
    ) -> None:
        """Audit log'a kayıt ekle."""
        entry = PromptAuditEntry(
            prompt_name=name,
            version=version,
            change_type=change_type,
            changed_by=changed_by,
            changed_at=datetime.utcnow(),
            previous_version=previous_version,
            details=details or {}
        )
        
        self.storage.add_audit_entry(entry)
    
    def _invalidate_cache(self, name: str) -> None:
        """Prompt cache'ini temizle."""
        keys_to_remove = [k for k in self._cache if name in k]
        for key in keys_to_remove:
            del self._cache[key]
    
    def clear_cache(self) -> None:
        """Tüm cache'i temizle."""
        self._cache.clear()


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

prompt_version_manager = PromptVersionManager()
