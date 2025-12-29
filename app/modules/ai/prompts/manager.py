"""
Prompt Layer - Manager.

YAML tabanlı prompt template yönetim sistemi.
"""

import os
import re
import yaml
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
from functools import lru_cache

from app.modules.ai.core.interfaces import AIFeature
from app.modules.ai.core.exceptions import AIPromptError


@dataclass
class PromptTemplate:
    """Prompt template veri yapısı."""
    name: str
    version: str
    description: str
    system_prompt: str
    user_prompt: str
    roles: List[str]
    required_variables: List[str]
    optional_variables: List[str] = field(default_factory=list)
    max_tokens: int = 500
    cache_enabled: bool = True
    cache_ttl: int = 3600
    validation_rules: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def hash(self) -> str:
        """Template içerik hash'i."""
        content = f"{self.system_prompt}{self.user_prompt}{self.version}"
        return hashlib.md5(content.encode()).hexdigest()[:8]


class PromptValidator:
    """Prompt input validasyonu."""
    
    @staticmethod
    def validate_length(value: str, min_len: int = None, max_len: int = None) -> tuple[bool, Optional[str]]:
        """Uzunluk validasyonu."""
        if min_len and len(value) < min_len:
            return False, f"Minimum {min_len} karakter olmalı"
        if max_len and len(value) > max_len:
            return False, f"Maximum {max_len} karakter olmalı"
        return True, None
    
    @staticmethod
    def validate_pattern(value: str, pattern: str) -> tuple[bool, Optional[str]]:
        """Regex pattern validasyonu."""
        if not re.match(pattern, value):
            return False, f"Geçersiz format. Beklenen: {pattern}"
        return True, None
    
    @staticmethod
    def validate_allowed_values(value: str, allowed: List[str]) -> tuple[bool, Optional[str]]:
        """İzin verilen değerler validasyonu."""
        if value not in allowed:
            return False, f"Geçersiz değer. İzin verilenler: {allowed}"
        return True, None
    
    @staticmethod
    def validate_range(value: float, min_val: float = None, max_val: float = None) -> tuple[bool, Optional[str]]:
        """Sayısal aralık validasyonu."""
        if min_val is not None and value < min_val:
            return False, f"Minimum değer: {min_val}"
        if max_val is not None and value > max_val:
            return False, f"Maximum değer: {max_val}"
        return True, None


class PromptBuilder:
    """Prompt oluşturucu."""
    
    def __init__(self, template: PromptTemplate):
        self.template = template
        self.validator = PromptValidator()
    
    def validate_variables(self, variables: Dict[str, Any]) -> tuple[bool, List[str]]:
        """Değişkenleri doğrula."""
        errors = []
        
        # Zorunlu değişkenleri kontrol et
        for var in self.template.required_variables:
            if var not in variables or variables[var] is None:
                errors.append(f"Zorunlu değişken eksik: {var}")
        
        # Validation kurallarını uygula
        for var_name, rules in self.template.validation_rules.items():
            if var_name not in variables:
                continue
            
            value = variables[var_name]
            
            if 'min_length' in rules or 'max_length' in rules:
                valid, error = self.validator.validate_length(
                    str(value),
                    rules.get('min_length'),
                    rules.get('max_length')
                )
                if not valid:
                    errors.append(f"{var_name}: {error}")
            
            if 'pattern' in rules:
                valid, error = self.validator.validate_pattern(str(value), rules['pattern'])
                if not valid:
                    errors.append(f"{var_name}: {error}")
            
            if 'allowed_values' in rules:
                valid, error = self.validator.validate_allowed_values(str(value), rules['allowed_values'])
                if not valid:
                    errors.append(f"{var_name}: {error}")
            
            if 'min_value' in rules or 'max_value' in rules:
                try:
                    num_value = float(value)
                    valid, error = self.validator.validate_range(
                        num_value,
                        rules.get('min_value'),
                        rules.get('max_value')
                    )
                    if not valid:
                        errors.append(f"{var_name}: {error}")
                except (ValueError, TypeError):
                    errors.append(f"{var_name}: Sayısal değer bekleniyor")
        
        return len(errors) == 0, errors
    
    def build(self, variables: Dict[str, Any]) -> tuple[str, str]:
        """
        Prompt'u oluştur.
        
        Returns:
            (system_prompt, user_prompt) tuple
        """
        # Validasyon
        valid, errors = self.validate_variables(variables)
        if not valid:
            raise AIPromptError(
                message=f"Prompt değişken validasyonu başarısız: {', '.join(errors)}",
                prompt_name=self.template.name
            )
        
        # Template rendering
        system_prompt = self._render_template(self.template.system_prompt, variables)
        user_prompt = self._render_template(self.template.user_prompt, variables)
        
        return system_prompt, user_prompt
    
    def _render_template(self, template: str, variables: Dict[str, Any]) -> str:
        """Template'i render et."""
        result = template
        
        # Basit değişken yerleştirme
        for key, value in variables.items():
            result = result.replace(f"{{{key}}}", str(value) if value else "")
        
        # Jinja-like conditional rendering
        # {% if variable %}...{% endif %}
        result = self._process_conditionals(result, variables)
        
        # Kullanılmayan placeholder'ları temizle
        result = re.sub(r'\{[a-z_]+\}', '', result)
        
        # Çoklu boş satırları tek satıra indir
        result = re.sub(r'\n\s*\n\s*\n', '\n\n', result)
        
        return result.strip()
    
    def _process_conditionals(self, template: str, variables: Dict[str, Any]) -> str:
        """Conditional ifadeleri işle."""
        # Pattern: {% if variable %}...{% endif %}
        pattern = r'\{%\s*if\s+(\w+)\s*%\}(.*?)\{%\s*endif\s*%\}'
        
        def replace_conditional(match):
            var_name = match.group(1)
            content = match.group(2)
            
            if var_name in variables and variables[var_name]:
                return content
            return ""
        
        return re.sub(pattern, replace_conditional, template, flags=re.DOTALL)


class PromptRegistry:
    """Prompt template registry."""
    
    _instance = None
    _templates: Dict[str, PromptTemplate] = {}
    _loaded: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._loaded:
            self._load_templates()
            self._loaded = True
    
    def _load_templates(self) -> None:
        """YAML dosyalarından template'leri yükle."""
        templates_dir = Path(__file__).parent / "templates"
        
        if not templates_dir.exists():
            raise AIPromptError(
                message=f"Template dizini bulunamadı: {templates_dir}",
                prompt_name="registry"
            )
        
        for yaml_file in templates_dir.glob("*.yaml"):
            try:
                with open(yaml_file, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)
                
                if data:
                    template = self._parse_template(data)
                    self._templates[template.name] = template
            except Exception as e:
                print(f"Template yükleme hatası ({yaml_file}): {e}")
    
    def _parse_template(self, data: Dict[str, Any]) -> PromptTemplate:
        """YAML verisinden PromptTemplate oluştur."""
        cache_config = data.get('cache', {})
        
        return PromptTemplate(
            name=data['name'],
            version=data['version'],
            description=data.get('description', ''),
            system_prompt=data['system_prompt'],
            user_prompt=data['user_prompt'],
            roles=data.get('roles', []),
            required_variables=data.get('required_variables', []),
            optional_variables=data.get('optional_variables', []),
            max_tokens=data.get('max_tokens', 500),
            cache_enabled=cache_config.get('enabled', True),
            cache_ttl=cache_config.get('ttl', 3600),
            validation_rules=data.get('validation', {})
        )
    
    def get(self, name: str) -> Optional[PromptTemplate]:
        """Template al."""
        return self._templates.get(name)
    
    def get_for_feature(self, feature: AIFeature) -> Optional[PromptTemplate]:
        """Feature için template al."""
        feature_template_map = {
            AIFeature.QUESTION_HINT: "question_hint",
            AIFeature.TOPIC_EXPLANATION: "topic_explanation",
            AIFeature.STUDY_PLAN: "study_plan",
            AIFeature.ANSWER_EVALUATION: "answer_evaluation",
            AIFeature.PERFORMANCE_ANALYSIS: "performance_analysis",
            AIFeature.QUESTION_GENERATION: "question_generation",
            AIFeature.CONTENT_ENHANCEMENT: "content_enhancement",
            AIFeature.MOTIVATION_MESSAGE: "motivation_message",
        }
        
        template_name = feature_template_map.get(feature)
        return self._templates.get(template_name) if template_name else None
    
    def list_all(self) -> List[str]:
        """Tüm template isimlerini listele."""
        return list(self._templates.keys())
    
    def reload(self) -> None:
        """Template'leri yeniden yükle."""
        self._templates.clear()
        self._load_templates()
    
    def is_role_allowed(self, template_name: str, role: str) -> bool:
        """Rol için template kullanımı izinli mi."""
        template = self.get(template_name)
        if not template:
            return False
        return role in template.roles or role in ['admin', 'super_admin']


class PromptManager:
    """
    Prompt yönetim facade'ı.
    
    Diğer modüller bu sınıfı kullanarak prompt işlemlerini gerçekleştirir.
    """
    
    def __init__(self):
        self.registry = PromptRegistry()
    
    def get_prompt(
        self,
        feature: AIFeature,
        variables: Dict[str, Any],
        role: str
    ) -> tuple[str, str, PromptTemplate]:
        """
        Feature için prompt oluştur.
        
        Returns:
            (system_prompt, user_prompt, template)
        """
        template = self.registry.get_for_feature(feature)
        
        if not template:
            raise AIPromptError(
                message=f"Feature için template bulunamadı: {feature.value}",
                prompt_name=feature.value
            )
        
        if not self.registry.is_role_allowed(template.name, role):
            raise AIPromptError(
                message=f"Bu özellik için yetkiniz yok",
                prompt_name=template.name
            )
        
        builder = PromptBuilder(template)
        system_prompt, user_prompt = builder.build(variables)
        
        return system_prompt, user_prompt, template
    
    def get_template_info(self, feature: AIFeature) -> Optional[Dict[str, Any]]:
        """Template bilgilerini al."""
        template = self.registry.get_for_feature(feature)
        
        if not template:
            return None
        
        return {
            'name': template.name,
            'version': template.version,
            'description': template.description,
            'roles': template.roles,
            'required_variables': template.required_variables,
            'optional_variables': template.optional_variables,
            'max_tokens': template.max_tokens,
            'cache_enabled': template.cache_enabled,
            'cache_ttl': template.cache_ttl
        }
    
    def list_available_features(self, role: str) -> List[Dict[str, Any]]:
        """Rol için kullanılabilir özellikleri listele."""
        available = []
        
        for feature in AIFeature:
            template = self.registry.get_for_feature(feature)
            if template and self.registry.is_role_allowed(template.name, role):
                available.append({
                    'feature': feature.value,
                    'name': template.name,
                    'description': template.description,
                    'max_tokens': template.max_tokens
                })
        
        return available


# Singleton instance
prompt_manager = PromptManager()
