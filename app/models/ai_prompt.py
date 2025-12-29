"""
AI Prompt Templates Model

AI prompt şablonları için veritabanı modeli.
Versiyonlama, A/B testing ve performans takibi desteği.
"""

from datetime import datetime
from typing import Dict, Any, Optional, List
import hashlib
import json

from app.extensions import db


class PromptTemplateStatus:
    """Prompt template durumları."""
    DRAFT = 'draft'
    ACTIVE = 'active'
    TESTING = 'testing'  # A/B test
    DEPRECATED = 'deprecated'
    ARCHIVED = 'archived'


class AIPromptTemplate(db.Model):
    """
    AI Prompt şablonu modeli.
    
    Prompt'ların versiyonlanması, performans takibi ve A/B testing desteği sağlar.
    
    Indexes:
        - name, version: Prompt sorgulama
        - status: Aktif prompt'ları filtreleme
        - feature: Feature bazlı sorgulama
        - created_at: Zaman bazlı sorgulama
    
    Foreign Keys:
        - created_by -> users.id: Oluşturan kullanıcı
        - updated_by -> users.id: Güncelleyen kullanıcı
    """
    
    __tablename__ = 'ai_prompt_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Tanımlayıcı bilgiler
    name = db.Column(db.String(100), nullable=False, index=True)
    version = db.Column(db.String(20), nullable=False, default='1.0.0')
    feature = db.Column(db.String(50), nullable=False, index=True)  # question_hint, topic_explanation, etc.
    
    # Prompt içeriği
    system_prompt = db.Column(db.Text, nullable=False)
    user_prompt_template = db.Column(db.Text, nullable=False)
    
    # Değişkenler
    required_variables = db.Column(db.JSON, default=list)  # ['question_text', 'difficulty']
    optional_variables = db.Column(db.JSON, default=list)  # ['subject', 'topic']
    
    # Model ayarları
    model_name = db.Column(db.String(50), default='gpt-4o-mini')
    max_tokens = db.Column(db.Integer, default=500)
    temperature = db.Column(db.Float, default=0.7)
    
    # Durum ve erişim
    status = db.Column(db.String(20), default=PromptTemplateStatus.DRAFT, index=True)
    roles_allowed = db.Column(db.JSON, default=list)  # ['student', 'teacher', 'admin']
    is_default = db.Column(db.Boolean, default=False)
    
    # A/B Testing
    ab_test_group = db.Column(db.String(20))  # 'A', 'B', 'C' veya None
    ab_test_weight = db.Column(db.Float, default=1.0)  # Yüzdelik ağırlık
    
    # Performans metrikleri (cache - periyodik güncelleme)
    usage_count = db.Column(db.Integer, default=0)
    avg_tokens_used = db.Column(db.Float, default=0.0)
    avg_response_time_ms = db.Column(db.Float, default=0.0)
    avg_feedback_rating = db.Column(db.Float, default=0.0)
    success_rate = db.Column(db.Float, default=0.0)  # Başarılı yanıt oranı
    
    # Açıklama ve notlar
    description = db.Column(db.Text)
    changelog = db.Column(db.Text)  # Bu versiyondaki değişiklikler
    
    # Hash (değişiklik kontrolü için)
    content_hash = db.Column(db.String(64))
    
    # Audit
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_prompts')
    updater = db.relationship('User', foreign_keys=[updated_by])
    usage_logs = db.relationship('AIPromptUsageLog', backref='template', lazy='dynamic')
    
    # Unique constraint: name + version kombinasyonu benzersiz olmalı
    __table_args__ = (
        db.UniqueConstraint('name', 'version', name='uq_prompt_name_version'),
        db.Index('ix_prompt_feature_status', 'feature', 'status'),
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._update_content_hash()
    
    def _update_content_hash(self):
        """İçerik hash'ini güncelle."""
        content = f"{self.system_prompt}{self.user_prompt_template}"
        self.content_hash = hashlib.sha256(content.encode()).hexdigest()[:64]
    
    def render(self, variables: Dict[str, Any]) -> Dict[str, str]:
        """
        Prompt'u render et.
        
        Args:
            variables: Değişken değerleri
            
        Returns:
            {'system': rendered_system, 'user': rendered_user}
        """
        # Required değişkenleri kontrol et
        missing = set(self.required_variables or []) - set(variables.keys())
        if missing:
            raise ValueError(f"Missing required variables: {missing}")
        
        # System prompt render
        system = self.system_prompt
        
        # User prompt render
        user = self.user_prompt_template
        for key, value in variables.items():
            user = user.replace(f"{{{key}}}", str(value))
        
        return {
            'system': system,
            'user': user
        }
    
    def increment_usage(self, tokens_used: int = 0, response_time_ms: float = 0):
        """Kullanım sayacını artır ve metrikleri güncelle."""
        n = self.usage_count
        self.usage_count += 1
        
        # Running average
        if n > 0:
            self.avg_tokens_used = (self.avg_tokens_used * n + tokens_used) / (n + 1)
            self.avg_response_time_ms = (self.avg_response_time_ms * n + response_time_ms) / (n + 1)
        else:
            self.avg_tokens_used = float(tokens_used)
            self.avg_response_time_ms = float(response_time_ms)
    
    def activate(self):
        """Template'i aktifleştir."""
        self.status = PromptTemplateStatus.ACTIVE
    
    def deprecate(self):
        """Template'i deprecate et."""
        self.status = PromptTemplateStatus.DEPRECATED
    
    def create_new_version(self, new_version: str, changelog: str = None) -> 'AIPromptTemplate':
        """
        Yeni versiyon oluştur.
        
        Args:
            new_version: Yeni versiyon numarası
            changelog: Değişiklik notları
            
        Returns:
            Yeni template instance
        """
        new_template = AIPromptTemplate(
            name=self.name,
            version=new_version,
            feature=self.feature,
            system_prompt=self.system_prompt,
            user_prompt_template=self.user_prompt_template,
            required_variables=self.required_variables,
            optional_variables=self.optional_variables,
            model_name=self.model_name,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            roles_allowed=self.roles_allowed,
            description=self.description,
            changelog=changelog,
            status=PromptTemplateStatus.DRAFT
        )
        return new_template
    
    def to_dict(self, include_content: bool = True) -> Dict[str, Any]:
        """Dictionary'e dönüştür."""
        data = {
            'id': self.id,
            'name': self.name,
            'version': self.version,
            'feature': self.feature,
            'status': self.status,
            'model_name': self.model_name,
            'max_tokens': self.max_tokens,
            'temperature': self.temperature,
            'roles_allowed': self.roles_allowed,
            'is_default': self.is_default,
            'usage_count': self.usage_count,
            'avg_feedback_rating': self.avg_feedback_rating,
            'success_rate': self.success_rate,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_content:
            data['system_prompt'] = self.system_prompt
            data['user_prompt_template'] = self.user_prompt_template
            data['required_variables'] = self.required_variables
            data['optional_variables'] = self.optional_variables
        
        return data
    
    @classmethod
    def get_active_template(cls, feature: str, role: str = None) -> Optional['AIPromptTemplate']:
        """
        Aktif template'i getir.
        
        Args:
            feature: Feature adı
            role: Kullanıcı rolü (opsiyonel erişim kontrolü için)
            
        Returns:
            Aktif template veya None
        """
        query = cls.query.filter(
            cls.feature == feature,
            cls.status == PromptTemplateStatus.ACTIVE
        )
        
        # Önce varsayılanı dene
        template = query.filter(cls.is_default == True).first()
        
        if not template:
            # Son aktif template'i al
            template = query.order_by(cls.created_at.desc()).first()
        
        # Rol kontrolü
        if template and role and template.roles_allowed:
            if role not in template.roles_allowed:
                return None
        
        return template
    
    @classmethod
    def get_for_ab_test(cls, feature: str) -> Optional['AIPromptTemplate']:
        """A/B test için rastgele template seç."""
        import random
        
        templates = cls.query.filter(
            cls.feature == feature,
            cls.status == PromptTemplateStatus.TESTING,
            cls.ab_test_group.isnot(None)
        ).all()
        
        if not templates:
            return cls.get_active_template(feature)
        
        # Ağırlıklı rastgele seçim
        total_weight = sum(t.ab_test_weight for t in templates)
        r = random.uniform(0, total_weight)
        
        cumulative = 0
        for template in templates:
            cumulative += template.ab_test_weight
            if r <= cumulative:
                return template
        
        return templates[-1]


class AIPromptUsageLog(db.Model):
    """
    Prompt kullanım logu.
    
    Her prompt kullanımının detaylı kaydı.
    Performans analizi ve A/B test sonuçları için.
    
    Indexes:
        - template_id: Template bazlı sorgulama
        - user_id: Kullanıcı bazlı sorgulama
        - created_at: Zaman bazlı sorgulama (partitioning için)
    """
    
    __tablename__ = 'ai_prompt_usage_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # İlişkiler
    template_id = db.Column(db.Integer, db.ForeignKey('ai_prompt_templates.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    session_id = db.Column(db.Integer, db.ForeignKey('ai_chat_sessions.id'), nullable=True)
    
    # Kullanım detayları
    variables_used = db.Column(db.JSON)  # Kullanılan değişkenler (PII olmadan)
    
    # Performans
    tokens_input = db.Column(db.Integer, default=0)
    tokens_output = db.Column(db.Integer, default=0)
    response_time_ms = db.Column(db.Integer, default=0)
    
    # Sonuç
    success = db.Column(db.Boolean, default=True)
    error_type = db.Column(db.String(50))  # Hata türü (varsa)
    error_message = db.Column(db.String(500))
    
    # Feedback
    feedback_rating = db.Column(db.Integer)  # 1-5
    feedback_helpful = db.Column(db.Boolean)
    
    # A/B Test
    ab_test_group = db.Column(db.String(20))
    
    # Zaman
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # İlişkiler
    user = db.relationship('User', backref=db.backref('prompt_usage_logs', lazy='dynamic'))
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'template_id': self.template_id,
            'tokens_input': self.tokens_input,
            'tokens_output': self.tokens_output,
            'response_time_ms': self.response_time_ms,
            'success': self.success,
            'feedback_rating': self.feedback_rating,
            'ab_test_group': self.ab_test_group,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AIUsageSummary(db.Model):
    """
    AI kullanım özeti (günlük/aylık).
    
    Performans raporları ve maliyet takibi için aggregate veriler.
    OLAP sorguları için optimize edilmiş yapı.
    
    Indexes:
        - user_id, period_type, period_date: Kullanıcı bazlı sorgulama
        - period_type, period_date: Dönem bazlı sorgulama
    """
    
    __tablename__ = 'ai_usage_summaries'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Kullanıcı (None = sistem geneli)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Dönem
    period_type = db.Column(db.String(10), nullable=False)  # 'daily', 'monthly', 'yearly'
    period_date = db.Column(db.Date, nullable=False)  # Dönemin başlangıç tarihi
    
    # Kullanım metrikleri
    total_requests = db.Column(db.Integer, default=0)
    successful_requests = db.Column(db.Integer, default=0)
    failed_requests = db.Column(db.Integer, default=0)
    
    # Token kullanımı
    total_tokens_input = db.Column(db.BigInteger, default=0)
    total_tokens_output = db.Column(db.BigInteger, default=0)
    
    # Maliyet (USD cinsinden)
    estimated_cost = db.Column(db.Numeric(10, 6), default=0)
    
    # Performans
    avg_response_time_ms = db.Column(db.Float, default=0)
    max_response_time_ms = db.Column(db.Integer, default=0)
    
    # Feature bazlı breakdown (JSON)
    feature_breakdown = db.Column(db.JSON, default=dict)
    # Örnek: {'question_hint': {'requests': 100, 'tokens': 5000}, ...}
    
    # Model bazlı breakdown (JSON)
    model_breakdown = db.Column(db.JSON, default=dict)
    # Örnek: {'gpt-4o-mini': {'requests': 150, 'tokens': 10000}, ...}
    
    # Feedback ortalaması
    avg_feedback_rating = db.Column(db.Float, default=0)
    feedback_count = db.Column(db.Integer, default=0)
    
    # Zaman
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('user_id', 'period_type', 'period_date', name='uq_usage_summary'),
        db.Index('ix_usage_summary_period', 'period_type', 'period_date'),
    )
    
    # İlişkiler
    user = db.relationship('User', backref=db.backref('ai_usage_summaries', lazy='dynamic'))
    
    @property
    def total_tokens(self) -> int:
        """Toplam token."""
        return (self.total_tokens_input or 0) + (self.total_tokens_output or 0)
    
    @property
    def success_rate(self) -> float:
        """Başarı oranı."""
        if self.total_requests == 0:
            return 0.0
        return (self.successful_requests / self.total_requests) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'period_type': self.period_type,
            'period_date': self.period_date.isoformat() if self.period_date else None,
            'total_requests': self.total_requests,
            'successful_requests': self.successful_requests,
            'failed_requests': self.failed_requests,
            'total_tokens': self.total_tokens,
            'estimated_cost': float(self.estimated_cost) if self.estimated_cost else 0,
            'avg_response_time_ms': self.avg_response_time_ms,
            'success_rate': self.success_rate,
            'feature_breakdown': self.feature_breakdown,
            'avg_feedback_rating': self.avg_feedback_rating,
        }
    
    @classmethod
    def get_or_create_daily(cls, user_id: int = None, date: 'date' = None) -> 'AIUsageSummary':
        """Günlük özet al veya oluştur."""
        from datetime import date as date_type
        if date is None:
            date = date_type.today()
        
        summary = cls.query.filter_by(
            user_id=user_id,
            period_type='daily',
            period_date=date
        ).first()
        
        if not summary:
            summary = cls(
                user_id=user_id,
                period_type='daily',
                period_date=date
            )
            db.session.add(summary)
        
        return summary
    
    @classmethod
    def get_or_create_monthly(cls, user_id: int = None, date: 'date' = None) -> 'AIUsageSummary':
        """Aylık özet al veya oluştur."""
        from datetime import date as date_type
        if date is None:
            date = date_type.today()
        
        # Ayın ilk günü
        month_start = date.replace(day=1)
        
        summary = cls.query.filter_by(
            user_id=user_id,
            period_type='monthly',
            period_date=month_start
        ).first()
        
        if not summary:
            summary = cls(
                user_id=user_id,
                period_type='monthly',
                period_date=month_start
            )
            db.session.add(summary)
        
        return summary
    
    def add_request(
        self,
        feature: str,
        model: str,
        tokens_input: int,
        tokens_output: int,
        response_time_ms: int,
        success: bool = True,
        cost: float = 0
    ):
        """İstek ekle ve metrikleri güncelle."""
        self.total_requests += 1
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
        
        self.total_tokens_input += tokens_input
        self.total_tokens_output += tokens_output
        self.estimated_cost = float(self.estimated_cost or 0) + cost
        
        # Running average for response time
        n = self.total_requests - 1
        if n > 0:
            self.avg_response_time_ms = (self.avg_response_time_ms * n + response_time_ms) / self.total_requests
        else:
            self.avg_response_time_ms = float(response_time_ms)
        
        self.max_response_time_ms = max(self.max_response_time_ms or 0, response_time_ms)
        
        # Feature breakdown güncelle
        feature_data = self.feature_breakdown or {}
        if feature not in feature_data:
            feature_data[feature] = {'requests': 0, 'tokens': 0}
        feature_data[feature]['requests'] += 1
        feature_data[feature]['tokens'] += tokens_input + tokens_output
        self.feature_breakdown = feature_data
        
        # Model breakdown güncelle
        model_data = self.model_breakdown or {}
        if model not in model_data:
            model_data[model] = {'requests': 0, 'tokens': 0, 'cost': 0}
        model_data[model]['requests'] += 1
        model_data[model]['tokens'] += tokens_input + tokens_output
        model_data[model]['cost'] = model_data[model].get('cost', 0) + cost
        self.model_breakdown = model_data


class AIDataRetentionPolicy(db.Model):
    """
    AI veri saklama politikası.
    
    KVKK/GDPR uyumlu veri saklama süreleri ve kuralları.
    """
    
    __tablename__ = 'ai_data_retention_policies'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Politika adı
    name = db.Column(db.String(100), unique=True, nullable=False)
    
    # Hedef tablo/veri türü
    target_table = db.Column(db.String(100), nullable=False)
    
    # Saklama süreleri (gün)
    retention_days = db.Column(db.Integer, nullable=False)  # Ne kadar süre saklanacak
    anonymization_days = db.Column(db.Integer)  # Ne zaman anonimleştirilecek (varsa)
    deletion_days = db.Column(db.Integer)  # Ne zaman silinecek
    
    # İşlem türü
    action = db.Column(db.String(50), nullable=False)  # anonymize, delete, archive
    
    # Yasal dayanak
    legal_basis = db.Column(db.String(100))  # KVKK madde, GDPR article
    
    # Aktif mi
    is_active = db.Column(db.Boolean, default=True)
    
    # Zamanlama
    run_schedule = db.Column(db.String(50), default='daily')  # cron expression veya preset
    last_run_at = db.Column(db.DateTime)
    next_run_at = db.Column(db.DateTime)
    
    # Notlar
    description = db.Column(db.Text)
    
    # Audit
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'target_table': self.target_table,
            'retention_days': self.retention_days,
            'anonymization_days': self.anonymization_days,
            'deletion_days': self.deletion_days,
            'action': self.action,
            'legal_basis': self.legal_basis,
            'is_active': self.is_active,
            'run_schedule': self.run_schedule,
            'last_run_at': self.last_run_at.isoformat() if self.last_run_at else None,
        }
    
    @classmethod
    def initialize_defaults(cls):
        """Varsayılan politikaları oluştur."""
        defaults = [
            {
                'name': 'chat_sessions_anonymization',
                'target_table': 'ai_chat_sessions',
                'retention_days': 90,
                'anonymization_days': 90,
                'deletion_days': 180,
                'action': 'anonymize',
                'legal_basis': 'KVKK Madde 7 - Kişisel verilerin silinmesi',
                'description': 'Chat oturumları 90 gün sonra anonimleştirilir, 180 gün sonra silinir.'
            },
            {
                'name': 'usage_logs_retention',
                'target_table': 'ai_usage_logs',
                'retention_days': 365,
                'deletion_days': 365,
                'action': 'delete',
                'legal_basis': 'KVKK Madde 4 - İşleme amacıyla bağlantılı ve sınırlı olma',
                'description': 'Kullanım logları 1 yıl sonra silinir.'
            },
            {
                'name': 'prompt_usage_logs_aggregation',
                'target_table': 'ai_prompt_usage_logs',
                'retention_days': 30,
                'action': 'aggregate',
                'legal_basis': 'KVKK Madde 28 - İstatistik amacıyla işleme',
                'description': 'Prompt kullanım logları 30 gün sonra aggregate edilir.'
            },
        ]
        
        for policy_data in defaults:
            existing = cls.query.filter_by(name=policy_data['name']).first()
            if not existing:
                policy = cls(**policy_data)
                db.session.add(policy)
        
        db.session.commit()
