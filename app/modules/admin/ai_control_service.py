"""
Admin Module - AI Control Service.

AI sisteminin admin/super admin tarafından yönetilmesi için servis.

YETKİ FARKLARI:
===============

ADMIN:
------
- Günlük AI kullanım limitlerini görüntüleme
- AI kullanım istatistiklerini görüntüleme
- Kullanıcı bazlı AI kota yönetimi
- AI violation raporlarını görüntüleme
- Prompt template'leri görüntüleme

SUPER ADMIN:
------------
- Yukarıdaki tüm yetkiler +
- AI özelliğini açma/kapama (global)
- AI Kill Switch (acil devre dışı bırakma)
- Günlük/aylık AI limitlerini değiştirme
- Prompt template versiyonlarını yönetme
- AI model konfigürasyonu değiştirme
- AI provider değiştirme (OpenAI, Anthropic, vb.)
- AI güvenlik ayarları
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, date
from enum import Enum

from sqlalchemy import func, desc, and_

from app.extensions import db
from app.models.ai import AIUsageLog, AIQuota, AIConfiguration, AIViolation
from app.models.user import User, Role
from app.modules.admin.models import AdminActionLog, AdminActionType
from app.core.exceptions import (
    NotFoundError, ValidationError, AuthorizationError, ForbiddenError
)


class AIControlKey(str, Enum):
    """AI kontrol konfigürasyon anahtarları."""
    # Global Switches
    AI_ENABLED = 'ai_enabled'                        # AI aktif mi
    AI_KILL_SWITCH = 'ai_kill_switch'                # Acil kapatma
    AI_MAINTENANCE_MODE = 'ai_maintenance_mode'      # Bakım modu
    
    # Limits
    GLOBAL_DAILY_LIMIT = 'global_daily_limit'        # Günlük toplam AI istek limiti
    GLOBAL_MONTHLY_LIMIT = 'global_monthly_limit'    # Aylık toplam AI istek limiti
    MAX_TOKENS_PER_REQUEST = 'max_tokens_per_request'
    COOLDOWN_SECONDS = 'cooldown_seconds'
    
    # Role Limits
    STUDENT_DAILY_LIMIT = 'student_daily_limit'
    STUDENT_MONTHLY_LIMIT = 'student_monthly_limit'
    TEACHER_DAILY_LIMIT = 'teacher_daily_limit'
    TEACHER_MONTHLY_LIMIT = 'teacher_monthly_limit'
    
    # Features
    ENABLED_FEATURES = 'enabled_features'            # Aktif AI özellikleri
    DISABLED_FEATURES = 'disabled_features'          # Devre dışı özellikler
    
    # Provider Config
    AI_PROVIDER = 'ai_provider'                      # openai, anthropic, mock
    AI_MODEL = 'ai_model'                            # gpt-4, claude-3, vb.
    AI_TEMPERATURE = 'ai_temperature'                # Model temperature
    
    # Security
    CONTENT_FILTER_LEVEL = 'content_filter_level'    # strict, moderate, minimal
    LOG_ALL_REQUESTS = 'log_all_requests'            # Tüm istekleri logla
    LOG_PROMPTS = 'log_prompts'                      # Prompt'ları logla


class AIControlService:
    """
    AI sistemini kontrol eden servis.
    
    ÖNEMLİ: Bu servis sadece admin ve super_admin tarafından kullanılır.
    Super admin'e özgü işlemler check_super_admin ile korunur.
    """
    
    # ==========================================================================
    # YETKİ KONTROL
    # ==========================================================================
    
    @classmethod
    def check_super_admin(cls, user_id: int) -> bool:
        """Super admin kontrolü."""
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError('Kullanıcı', user_id)
        
        if not user.role or user.role.name != Role.SUPER_ADMIN:
            raise AuthorizationError(
                'Bu işlem sadece Super Admin tarafından yapılabilir'
            )
        return True
    
    @classmethod
    def check_admin_or_super(cls, user_id: int) -> str:
        """Admin veya Super Admin kontrolü. Role name döner."""
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError('Kullanıcı', user_id)
        
        if not user.role or user.role.name not in [Role.ADMIN, Role.SUPER_ADMIN]:
            raise AuthorizationError(
                'Bu işlem sadece Admin veya Super Admin tarafından yapılabilir'
            )
        return user.role.name
    
    # ==========================================================================
    # GLOBAL SWITCHES (SADECE SUPER ADMIN)
    # ==========================================================================
    
    @classmethod
    def set_ai_enabled(cls, enabled: bool, admin_id: int, reason: str = None) -> Dict[str, Any]:
        """
        AI özelliğini global olarak aç/kapa.
        
        SADECE SUPER ADMIN
        """
        cls.check_super_admin(admin_id)
        
        config = AIConfiguration.set_value(
            key=AIControlKey.AI_ENABLED.value,
            value={'enabled': enabled, 'updated_at': datetime.utcnow().isoformat()},
            description='AI global açma/kapama',
            user_id=admin_id
        )
        
        # Log
        cls._log_action(
            admin_id=admin_id,
            action='ai_toggle',
            target='global',
            description=f'AI {"aktif" if enabled else "devre dışı"} edildi. Sebep: {reason or "Belirtilmedi"}',
            new_values={'enabled': enabled, 'reason': reason}
        )
        
        db.session.commit()
        
        return {
            'ai_enabled': enabled,
            'updated_at': datetime.utcnow().isoformat(),
            'reason': reason
        }
    
    @classmethod
    def activate_kill_switch(cls, admin_id: int, reason: str, duration_hours: int = None) -> Dict[str, Any]:
        """
        AI KILL SWITCH - Acil devre dışı bırakma.
        
        Bu fonksiyon AI sistemini ANINDA devre dışı bırakır.
        Güvenlik ihlali, maliyet aşımı veya beklenmeyen davranış durumlarında kullanılır.
        
        SADECE SUPER ADMIN
        
        Args:
            admin_id: İşlemi yapan super admin
            reason: Kapatma nedeni (zorunlu)
            duration_hours: Ne kadar süreyle kapalı kalacak (None = manuel açılana kadar)
        """
        cls.check_super_admin(admin_id)
        
        if not reason or len(reason.strip()) < 10:
            raise ValidationError('Kill switch nedeni en az 10 karakter olmalıdır')
        
        expires_at = None
        if duration_hours:
            expires_at = datetime.utcnow() + timedelta(hours=duration_hours)
        
        config = AIConfiguration.set_value(
            key=AIControlKey.AI_KILL_SWITCH.value,
            value={
                'active': True,
                'activated_at': datetime.utcnow().isoformat(),
                'activated_by': admin_id,
                'reason': reason,
                'expires_at': expires_at.isoformat() if expires_at else None
            },
            description='AI Acil Kapatma (Kill Switch)',
            user_id=admin_id
        )
        
        # AI'yı da kapat
        AIConfiguration.set_value(
            key=AIControlKey.AI_ENABLED.value,
            value={'enabled': False, 'updated_at': datetime.utcnow().isoformat()},
            user_id=admin_id
        )
        
        # Kritik log
        cls._log_action(
            admin_id=admin_id,
            action='ai_kill_switch',
            target='global',
            description=f'AI KILL SWITCH AKTİF! Sebep: {reason}',
            new_values={
                'kill_switch_active': True,
                'reason': reason,
                'duration_hours': duration_hours,
                'expires_at': expires_at.isoformat() if expires_at else None
            },
            is_critical=True
        )
        
        db.session.commit()
        
        return {
            'kill_switch_active': True,
            'activated_at': datetime.utcnow().isoformat(),
            'reason': reason,
            'expires_at': expires_at.isoformat() if expires_at else 'Manuel açılana kadar'
        }
    
    @classmethod
    def deactivate_kill_switch(cls, admin_id: int, reason: str = None) -> Dict[str, Any]:
        """
        Kill switch'i kapat ve AI'yı yeniden aktif et.
        
        SADECE SUPER ADMIN
        """
        cls.check_super_admin(admin_id)
        
        AIConfiguration.set_value(
            key=AIControlKey.AI_KILL_SWITCH.value,
            value={
                'active': False,
                'deactivated_at': datetime.utcnow().isoformat(),
                'deactivated_by': admin_id,
                'reason': reason
            },
            user_id=admin_id
        )
        
        # Log
        cls._log_action(
            admin_id=admin_id,
            action='ai_kill_switch_deactivate',
            target='global',
            description=f'AI Kill Switch devre dışı bırakıldı. Sebep: {reason or "Belirtilmedi"}',
            new_values={'kill_switch_active': False, 'reason': reason}
        )
        
        db.session.commit()
        
        return {
            'kill_switch_active': False,
            'deactivated_at': datetime.utcnow().isoformat(),
            'reason': reason
        }
    
    @classmethod
    def get_ai_status(cls, admin_id: int) -> Dict[str, Any]:
        """
        AI sisteminin genel durumunu döner.
        
        Admin ve Super Admin erişebilir.
        """
        cls.check_admin_or_super(admin_id)
        
        ai_enabled = AIConfiguration.get_value(AIControlKey.AI_ENABLED.value, {'enabled': True})
        kill_switch = AIConfiguration.get_value(AIControlKey.AI_KILL_SWITCH.value, {'active': False})
        maintenance = AIConfiguration.get_value(AIControlKey.AI_MAINTENANCE_MODE.value, {'active': False})
        
        # Kill switch süresi dolmuş mu kontrol et
        if kill_switch.get('active') and kill_switch.get('expires_at'):
            expires = datetime.fromisoformat(kill_switch['expires_at'])
            if datetime.utcnow() > expires:
                kill_switch['active'] = False
                kill_switch['expired'] = True
        
        return {
            'ai_enabled': ai_enabled.get('enabled', True),
            'kill_switch_active': kill_switch.get('active', False),
            'kill_switch_reason': kill_switch.get('reason') if kill_switch.get('active') else None,
            'kill_switch_expires_at': kill_switch.get('expires_at') if kill_switch.get('active') else None,
            'maintenance_mode': maintenance.get('active', False),
            'last_updated': ai_enabled.get('updated_at'),
            'operational': ai_enabled.get('enabled', True) and not kill_switch.get('active', False) and not maintenance.get('active', False)
        }
    
    # ==========================================================================
    # LİMİT YÖNETİMİ
    # ==========================================================================
    
    @classmethod
    def get_ai_limits(cls, admin_id: int) -> Dict[str, Any]:
        """
        Mevcut AI limitlerini döner.
        
        Admin ve Super Admin erişebilir.
        """
        cls.check_admin_or_super(admin_id)
        
        return {
            'global': {
                'daily_limit': AIConfiguration.get_value(AIControlKey.GLOBAL_DAILY_LIMIT.value, 100000),
                'monthly_limit': AIConfiguration.get_value(AIControlKey.GLOBAL_MONTHLY_LIMIT.value, 2000000),
                'max_tokens_per_request': AIConfiguration.get_value(AIControlKey.MAX_TOKENS_PER_REQUEST.value, 1000),
                'cooldown_seconds': AIConfiguration.get_value(AIControlKey.COOLDOWN_SECONDS.value, 30),
            },
            'student': {
                'daily_tokens': AIConfiguration.get_value(AIControlKey.STUDENT_DAILY_LIMIT.value, 1000),
                'monthly_tokens': AIConfiguration.get_value(AIControlKey.STUDENT_MONTHLY_LIMIT.value, 20000),
            },
            'teacher': {
                'daily_tokens': AIConfiguration.get_value(AIControlKey.TEACHER_DAILY_LIMIT.value, 5000),
                'monthly_tokens': AIConfiguration.get_value(AIControlKey.TEACHER_MONTHLY_LIMIT.value, 100000),
            }
        }
    
    @classmethod
    def update_ai_limits(
        cls,
        admin_id: int,
        limit_type: str,  # 'global', 'student', 'teacher'
        limits: Dict[str, int]
    ) -> Dict[str, Any]:
        """
        AI limitlerini güncelle.
        
        SADECE SUPER ADMIN
        """
        cls.check_super_admin(admin_id)
        
        valid_limit_types = ['global', 'student', 'teacher']
        if limit_type not in valid_limit_types:
            raise ValidationError(f'Geçersiz limit tipi. Geçerli: {valid_limit_types}')
        
        updated = {}
        
        if limit_type == 'global':
            if 'daily_limit' in limits:
                AIConfiguration.set_value(
                    AIControlKey.GLOBAL_DAILY_LIMIT.value,
                    limits['daily_limit'],
                    user_id=admin_id
                )
                updated['daily_limit'] = limits['daily_limit']
            
            if 'monthly_limit' in limits:
                AIConfiguration.set_value(
                    AIControlKey.GLOBAL_MONTHLY_LIMIT.value,
                    limits['monthly_limit'],
                    user_id=admin_id
                )
                updated['monthly_limit'] = limits['monthly_limit']
                
            if 'max_tokens_per_request' in limits:
                AIConfiguration.set_value(
                    AIControlKey.MAX_TOKENS_PER_REQUEST.value,
                    limits['max_tokens_per_request'],
                    user_id=admin_id
                )
                updated['max_tokens_per_request'] = limits['max_tokens_per_request']
                
        elif limit_type == 'student':
            if 'daily_tokens' in limits:
                AIConfiguration.set_value(
                    AIControlKey.STUDENT_DAILY_LIMIT.value,
                    limits['daily_tokens'],
                    user_id=admin_id
                )
                updated['daily_tokens'] = limits['daily_tokens']
            
            if 'monthly_tokens' in limits:
                AIConfiguration.set_value(
                    AIControlKey.STUDENT_MONTHLY_LIMIT.value,
                    limits['monthly_tokens'],
                    user_id=admin_id
                )
                updated['monthly_tokens'] = limits['monthly_tokens']
                
        elif limit_type == 'teacher':
            if 'daily_tokens' in limits:
                AIConfiguration.set_value(
                    AIControlKey.TEACHER_DAILY_LIMIT.value,
                    limits['daily_tokens'],
                    user_id=admin_id
                )
                updated['daily_tokens'] = limits['daily_tokens']
            
            if 'monthly_tokens' in limits:
                AIConfiguration.set_value(
                    AIControlKey.TEACHER_MONTHLY_LIMIT.value,
                    limits['monthly_tokens'],
                    user_id=admin_id
                )
                updated['monthly_tokens'] = limits['monthly_tokens']
        
        # Log
        cls._log_action(
            admin_id=admin_id,
            action='ai_limits_update',
            target=limit_type,
            description=f'{limit_type} AI limitleri güncellendi',
            new_values=updated
        )
        
        db.session.commit()
        
        return {
            'limit_type': limit_type,
            'updated': updated,
            'updated_at': datetime.utcnow().isoformat()
        }
    
    # ==========================================================================
    # KULLANICI KOTA YÖNETİMİ
    # ==========================================================================
    
    @classmethod
    def get_user_quota(cls, admin_id: int, user_id: int) -> Dict[str, Any]:
        """Kullanıcının AI kota bilgisini döner."""
        cls.check_admin_or_super(admin_id)
        
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError('Kullanıcı', user_id)
        
        quota = AIQuota.query.filter_by(user_id=user_id).first()
        
        if not quota:
            return {
                'user_id': user_id,
                'user_name': user.full_name,
                'quota': None,
                'message': 'Kullanıcının henüz AI kullanımı yok'
            }
        
        return {
            'user_id': user_id,
            'user_name': user.full_name,
            'user_role': user.role.name if user.role else 'unknown',
            'quota': quota.to_dict(),
            'is_blocked': quota.is_blocked,
            'block_reason': quota.block_reason
        }
    
    @classmethod
    def reset_user_quota(cls, admin_id: int, user_id: int, reset_type: str = 'daily') -> Dict[str, Any]:
        """
        Kullanıcının AI kotasını sıfırla.
        
        Admin ve Super Admin erişebilir.
        
        Args:
            reset_type: 'daily', 'monthly', 'all'
        """
        cls.check_admin_or_super(admin_id)
        
        quota = AIQuota.query.filter_by(user_id=user_id).first()
        if not quota:
            raise NotFoundError('Kullanıcı kotası', user_id)
        
        if reset_type == 'daily':
            quota.daily_tokens_used = 0
            quota.daily_requests_count = 0
            quota.daily_reset_at = date.today()
        elif reset_type == 'monthly':
            quota.monthly_tokens_used = 0
            quota.monthly_requests_count = 0
            quota.monthly_reset_at = date.today().replace(day=1)
        elif reset_type == 'all':
            quota.daily_tokens_used = 0
            quota.daily_requests_count = 0
            quota.monthly_tokens_used = 0
            quota.monthly_requests_count = 0
            quota.daily_reset_at = date.today()
            quota.monthly_reset_at = date.today().replace(day=1)
        else:
            raise ValidationError('Geçersiz reset tipi. Geçerli: daily, monthly, all')
        
        # Log
        cls._log_action(
            admin_id=admin_id,
            action='ai_quota_reset',
            target='user',
            target_id=user_id,
            description=f'Kullanıcı AI kotası sıfırlandı ({reset_type})'
        )
        
        db.session.commit()
        
        return {
            'user_id': user_id,
            'reset_type': reset_type,
            'quota': quota.to_dict()
        }
    
    @classmethod
    def block_user_ai(
        cls,
        admin_id: int,
        user_id: int,
        reason: str,
        duration_hours: int = None
    ) -> Dict[str, Any]:
        """
        Kullanıcının AI erişimini engelle.
        
        Admin ve Super Admin erişebilir.
        """
        cls.check_admin_or_super(admin_id)
        
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError('Kullanıcı', user_id)
        
        quota = AIQuota.query.filter_by(user_id=user_id).first()
        if not quota:
            quota = AIQuota(user_id=user_id)
            db.session.add(quota)
        
        quota.is_blocked = True
        quota.block_reason = reason
        
        if duration_hours:
            quota.blocked_until = datetime.utcnow() + timedelta(hours=duration_hours)
        else:
            quota.blocked_until = None  # Süresiz
        
        # Log
        cls._log_action(
            admin_id=admin_id,
            action='ai_user_block',
            target='user',
            target_id=user_id,
            description=f'Kullanıcı AI erişimi engellendi: {reason}'
        )
        
        db.session.commit()
        
        return {
            'user_id': user_id,
            'blocked': True,
            'reason': reason,
            'blocked_until': quota.blocked_until.isoformat() if quota.blocked_until else 'Süresiz'
        }
    
    @classmethod
    def unblock_user_ai(cls, admin_id: int, user_id: int) -> Dict[str, Any]:
        """Kullanıcının AI engelini kaldır."""
        cls.check_admin_or_super(admin_id)
        
        quota = AIQuota.query.filter_by(user_id=user_id).first()
        if not quota:
            raise NotFoundError('Kullanıcı kotası', user_id)
        
        quota.is_blocked = False
        quota.block_reason = None
        quota.blocked_until = None
        
        cls._log_action(
            admin_id=admin_id,
            action='ai_user_unblock',
            target='user',
            target_id=user_id,
            description='Kullanıcı AI engeli kaldırıldı'
        )
        
        db.session.commit()
        
        return {'user_id': user_id, 'blocked': False}
    
    # ==========================================================================
    # PROMPT TEMPLATE YÖNETİMİ
    # ==========================================================================
    
    @classmethod
    def get_prompt_templates(cls, admin_id: int) -> List[Dict[str, Any]]:
        """
        Tüm prompt template'lerini listele.
        
        Admin: Sadece görüntüleme
        Super Admin: Görüntüleme + düzenleme
        """
        role = cls.check_admin_or_super(admin_id)
        
        templates = AIConfiguration.query.filter(
            AIConfiguration.key.like('prompt_template_%')
        ).all()
        
        result = []
        for t in templates:
            template_data = {
                'key': t.key,
                'name': t.key.replace('prompt_template_', ''),
                'description': t.description,
                'updated_at': t.updated_at.isoformat() if t.updated_at else None,
                'updated_by': t.updated_by,
            }
            
            # Super admin template içeriğini de görebilir
            if role == Role.SUPER_ADMIN:
                template_data['value'] = t.value
            
            result.append(template_data)
        
        return result
    
    @classmethod
    def get_prompt_template(cls, admin_id: int, template_name: str) -> Dict[str, Any]:
        """Belirli bir prompt template'i getir."""
        role = cls.check_admin_or_super(admin_id)
        
        key = f'prompt_template_{template_name}'
        config = AIConfiguration.query.filter_by(key=key).first()
        
        if not config:
            raise NotFoundError('Prompt template', template_name)
        
        result = {
            'key': config.key,
            'name': template_name,
            'description': config.description,
            'updated_at': config.updated_at.isoformat() if config.updated_at else None,
        }
        
        if role == Role.SUPER_ADMIN:
            result['value'] = config.value
            result['versions'] = config.value.get('versions', []) if isinstance(config.value, dict) else []
        
        return result
    
    @classmethod
    def update_prompt_template(
        cls,
        admin_id: int,
        template_name: str,
        content: str,
        description: str = None
    ) -> Dict[str, Any]:
        """
        Prompt template'i güncelle (versiyon kontrolü ile).
        
        SADECE SUPER ADMIN
        """
        cls.check_super_admin(admin_id)
        
        key = f'prompt_template_{template_name}'
        config = AIConfiguration.query.filter_by(key=key).first()
        
        # Versiyon geçmişi
        versions = []
        current_content = None
        
        if config and isinstance(config.value, dict):
            versions = config.value.get('versions', [])
            current_content = config.value.get('current')
            
            # Mevcut içeriği versiyonlara ekle
            if current_content:
                versions.append({
                    'content': current_content,
                    'created_at': config.updated_at.isoformat() if config.updated_at else datetime.utcnow().isoformat(),
                    'created_by': config.updated_by
                })
                # Son 10 versiyonu tut
                versions = versions[-10:]
        
        new_value = {
            'current': content,
            'versions': versions,
            'version_number': len(versions) + 1
        }
        
        AIConfiguration.set_value(
            key=key,
            value=new_value,
            description=description,
            user_id=admin_id
        )
        
        cls._log_action(
            admin_id=admin_id,
            action='prompt_template_update',
            target='prompt_template',
            target_id=template_name,
            description=f'Prompt template güncellendi: {template_name}'
        )
        
        db.session.commit()
        
        return {
            'name': template_name,
            'version': len(versions) + 1,
            'updated_at': datetime.utcnow().isoformat()
        }
    
    @classmethod
    def rollback_prompt_template(
        cls,
        admin_id: int,
        template_name: str,
        version_index: int
    ) -> Dict[str, Any]:
        """
        Prompt template'i önceki versiyona geri al.
        
        SADECE SUPER ADMIN
        """
        cls.check_super_admin(admin_id)
        
        key = f'prompt_template_{template_name}'
        config = AIConfiguration.query.filter_by(key=key).first()
        
        if not config:
            raise NotFoundError('Prompt template', template_name)
        
        if not isinstance(config.value, dict):
            raise ValidationError('Template versiyon geçmişi bulunamadı')
        
        versions = config.value.get('versions', [])
        
        if version_index < 0 or version_index >= len(versions):
            raise ValidationError(f'Geçersiz versiyon. Mevcut: 0-{len(versions)-1}')
        
        # Rollback
        target_version = versions[version_index]
        current_content = config.value.get('current')
        
        # Mevcut içeriği versiyonlara ekle
        if current_content:
            versions.append({
                'content': current_content,
                'created_at': datetime.utcnow().isoformat(),
                'created_by': admin_id,
                'note': 'Rollback öncesi otomatik yedek'
            })
        
        new_value = {
            'current': target_version['content'],
            'versions': versions[-10:],
            'version_number': len(versions) + 1,
            'rollback_from': version_index
        }
        
        config.value = new_value
        config.updated_by = admin_id
        
        cls._log_action(
            admin_id=admin_id,
            action='prompt_template_rollback',
            target='prompt_template',
            target_id=template_name,
            description=f'Prompt template rollback: {template_name} -> v{version_index}'
        )
        
        db.session.commit()
        
        return {
            'name': template_name,
            'rolled_back_to': version_index,
            'new_version': len(versions) + 1
        }
    
    # ==========================================================================
    # ÖZELLİK YÖNETİMİ
    # ==========================================================================
    
    @classmethod
    def get_ai_features(cls, admin_id: int) -> Dict[str, Any]:
        """AI özelliklerinin durumunu döner."""
        cls.check_admin_or_super(admin_id)
        
        enabled = AIConfiguration.get_value(AIControlKey.ENABLED_FEATURES.value, [])
        disabled = AIConfiguration.get_value(AIControlKey.DISABLED_FEATURES.value, [])
        
        all_features = [
            'question_hint',
            'topic_explanation',
            'study_plan',
            'answer_evaluation',
            'performance_analysis',
            'question_generation',
            'content_enhancement',
            'class_performance',
            'usage_analytics',
            'motivation_message',
            'video_qa',
            'session_review',
        ]
        
        feature_status = {}
        for feature in all_features:
            if feature in disabled:
                feature_status[feature] = 'disabled'
            elif not enabled or feature in enabled:
                feature_status[feature] = 'enabled'
            else:
                feature_status[feature] = 'disabled'
        
        return {
            'features': feature_status,
            'enabled_count': sum(1 for s in feature_status.values() if s == 'enabled'),
            'disabled_count': sum(1 for s in feature_status.values() if s == 'disabled'),
        }
    
    @classmethod
    def toggle_ai_feature(
        cls,
        admin_id: int,
        feature_name: str,
        enabled: bool
    ) -> Dict[str, Any]:
        """
        Belirli bir AI özelliğini aç/kapat.
        
        SADECE SUPER ADMIN
        """
        cls.check_super_admin(admin_id)
        
        disabled_features = AIConfiguration.get_value(AIControlKey.DISABLED_FEATURES.value, [])
        
        if enabled:
            # Aktif et (disabled listesinden çıkar)
            if feature_name in disabled_features:
                disabled_features.remove(feature_name)
        else:
            # Devre dışı bırak
            if feature_name not in disabled_features:
                disabled_features.append(feature_name)
        
        AIConfiguration.set_value(
            AIControlKey.DISABLED_FEATURES.value,
            disabled_features,
            user_id=admin_id
        )
        
        cls._log_action(
            admin_id=admin_id,
            action='ai_feature_toggle',
            target='feature',
            target_id=feature_name,
            description=f'AI özelliği {"aktif" if enabled else "devre dışı"}: {feature_name}'
        )
        
        db.session.commit()
        
        return {
            'feature': feature_name,
            'enabled': enabled,
            'updated_at': datetime.utcnow().isoformat()
        }
    
    # ==========================================================================
    # İSTATİSTİKLER VE RAPORLAR
    # ==========================================================================
    
    @classmethod
    def get_ai_usage_stats(cls, admin_id: int, days: int = 30) -> Dict[str, Any]:
        """
        AI kullanım istatistikleri.
        
        Admin ve Super Admin erişebilir.
        """
        cls.check_admin_or_super(admin_id)
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Toplam istatistikler
        total_stats = db.session.query(
            func.count(AIUsageLog.id).label('total_requests'),
            func.sum(AIUsageLog.tokens_used).label('total_tokens'),
            func.avg(AIUsageLog.processing_time_ms).label('avg_processing_time')
        ).filter(
            AIUsageLog.created_at >= start_date
        ).first()
        
        # Günlük kullanım
        daily_usage = db.session.query(
            func.date(AIUsageLog.created_at).label('date'),
            func.count(AIUsageLog.id).label('requests'),
            func.sum(AIUsageLog.tokens_used).label('tokens')
        ).filter(
            AIUsageLog.created_at >= start_date
        ).group_by(
            func.date(AIUsageLog.created_at)
        ).order_by(
            func.date(AIUsageLog.created_at)
        ).all()
        
        # Feature bazlı kullanım
        feature_usage = db.session.query(
            AIUsageLog.feature,
            func.count(AIUsageLog.id).label('count'),
            func.sum(AIUsageLog.tokens_used).label('tokens')
        ).filter(
            AIUsageLog.created_at >= start_date
        ).group_by(
            AIUsageLog.feature
        ).order_by(
            desc('count')
        ).all()
        
        # Aktif kullanıcı sayısı
        active_users = db.session.query(
            func.count(func.distinct(AIUsageLog.user_id))
        ).filter(
            AIUsageLog.created_at >= start_date
        ).scalar()
        
        return {
            'period_days': days,
            'total': {
                'requests': total_stats.total_requests or 0,
                'tokens': int(total_stats.total_tokens or 0),
                'avg_processing_time_ms': round(total_stats.avg_processing_time or 0, 2),
                'active_users': active_users or 0,
            },
            'daily': [
                {
                    'date': d.date.isoformat(),
                    'requests': d.requests,
                    'tokens': d.tokens
                }
                for d in daily_usage
            ],
            'by_feature': [
                {
                    'feature': f.feature,
                    'count': f.count,
                    'tokens': f.tokens
                }
                for f in feature_usage
            ]
        }
    
    @classmethod
    def get_ai_violations(cls, admin_id: int, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """
        AI ihlal raporları.
        
        Admin ve Super Admin erişebilir.
        """
        cls.check_admin_or_super(admin_id)
        
        query = AIViolation.query.order_by(desc(AIViolation.created_at))
        
        # Pagination
        total = query.count()
        violations = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            'violations': [v.to_dict() for v in violations],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }
    
    # ==========================================================================
    # YARDIMCI METODLAR
    # ==========================================================================
    
    @classmethod
    def _log_action(
        cls,
        admin_id: int,
        action: str,
        target: str,
        description: str,
        target_id: Any = None,
        new_values: Dict = None,
        is_critical: bool = False
    ):
        """Admin işlem logu oluştur."""
        try:
            log = AdminActionLog(
                admin_id=admin_id,
                action_type=action,
                target_type=target,
                target_id=str(target_id) if target_id else None,
                description=description,
                new_values=new_values,
                ip_address=None,  # Request context'ten alınabilir
                is_critical=is_critical
            )
            db.session.add(log)
        except Exception:
            pass  # Log hatası ana işlemi etkilememeli


# =============================================================================
# AI STATUS CHECK (Diğer servisler için)
# =============================================================================

def is_ai_operational() -> tuple[bool, Optional[str]]:
    """
    AI sisteminin çalışır durumda olup olmadığını kontrol et.
    
    Diğer servisler bu fonksiyonu kullanarak AI'ı çağırmadan önce
    kontrol yapabilir.
    
    Returns:
        (operational, reason) - False ise reason neden kapalı olduğunu belirtir
    """
    # AI aktif mi?
    ai_enabled = AIConfiguration.get_value(AIControlKey.AI_ENABLED.value, {'enabled': True})
    if not ai_enabled.get('enabled', True):
        return False, 'AI sistemi devre dışı'
    
    # Kill switch aktif mi?
    kill_switch = AIConfiguration.get_value(AIControlKey.AI_KILL_SWITCH.value, {'active': False})
    if kill_switch.get('active', False):
        # Süresi dolmuş mu?
        if kill_switch.get('expires_at'):
            expires = datetime.fromisoformat(kill_switch['expires_at'])
            if datetime.utcnow() <= expires:
                return False, f'AI acil kapatma aktif: {kill_switch.get("reason", "Belirtilmemiş")}'
        else:
            return False, f'AI acil kapatma aktif: {kill_switch.get("reason", "Belirtilmemiş")}'
    
    # Bakım modu
    maintenance = AIConfiguration.get_value(AIControlKey.AI_MAINTENANCE_MODE.value, {'active': False})
    if maintenance.get('active', False):
        return False, 'AI sistemi bakımda'
    
    return True, None
