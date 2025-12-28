"""
AI Feature Flag Service.

Bu modül AI özelliklerinin kontrollü açılmasını sağlar:
- Gradual rollout (yavaş yavaş açma)
- Canary deployment
- A/B testing
- Kill switch
"""

import hashlib
import logging
from typing import Dict, Any, Optional, List, Set
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
import threading

from flask import current_app

from app.extensions import db
from app.models.ai import AIConfiguration
from app.models.user import User, Role
from config.ai_production import (
    FeatureFlagConfig, 
    RolloutStage, 
    get_ai_production_config,
    reload_ai_config
)


logger = logging.getLogger(__name__)


class AIFeature(str, Enum):
    """AI özellikleri."""
    QUESTION_HINT = 'question_hint'
    TOPIC_EXPLANATION = 'topic_explanation'
    STUDY_PLAN = 'study_plan'
    PERFORMANCE_ANALYSIS = 'performance_analysis'
    CONTENT_ENHANCEMENT = 'content_enhancement'
    EVALUATION_FEEDBACK = 'evaluation_feedback'
    POST_SESSION_QA = 'post_session_qa'  # Canlı ders sonrası
    CHAT = 'chat'                        # Genel chat


@dataclass
class RolloutStatus:
    """Rollout durumu."""
    feature: str
    stage: RolloutStage
    percentage: int
    enabled: bool
    enabled_for_user: bool
    reason: Optional[str] = None


class AIFeatureFlagService:
    """
    AI Feature Flag yönetim servisi.
    
    Kullanım:
        # Özellik kontrol
        if AIFeatureFlagService.is_enabled('question_hint', user_id):
            # AI'yı kullan
            pass
        
        # Rollout değiştir
        AIFeatureFlagService.set_rollout_stage(RolloutStage.BETA, percentage=25)
    """
    
    # In-memory cache
    _cache: Dict[str, Any] = {}
    _cache_lock = threading.Lock()
    _cache_ttl = 60  # saniye
    _cache_time: Optional[datetime] = None
    
    # Kill switch state
    _kill_switch_active = False
    _kill_switch_reason: Optional[str] = None
    _kill_switch_time: Optional[datetime] = None
    
    # ==========================================================================
    # KILL SWITCH
    # ==========================================================================
    
    @classmethod
    def activate_kill_switch(cls, reason: str, admin_id: int) -> Dict[str, Any]:
        """
        Acil AI kapatma.
        
        TÜM AI ÖZELLİKLERİ ANINDA DEVRE DIŞI KALIR.
        """
        cls._kill_switch_active = True
        cls._kill_switch_reason = reason
        cls._kill_switch_time = datetime.utcnow()
        
        # Veritabanına kaydet
        config = AIConfiguration.query.filter_by(
            key='ai_kill_switch'
        ).first()
        
        if not config:
            config = AIConfiguration(
                key='ai_kill_switch',
                value='true',
                description='Emergency AI shutdown'
            )
            db.session.add(config)
        else:
            config.value = 'true'
            config.updated_at = datetime.utcnow()
        
        # Kill switch log
        kill_log = AIConfiguration(
            key='ai_kill_switch_log',
            value=f'{datetime.utcnow().isoformat()}|{admin_id}|{reason}',
            description='Kill switch activation log'
        )
        db.session.add(kill_log)
        db.session.commit()
        
        logger.critical(f"AI KILL SWITCH ACTIVATED by admin {admin_id}: {reason}")
        
        # Cache temizle
        cls._clear_cache()
        
        return {
            'kill_switch_active': True,
            'reason': reason,
            'activated_at': cls._kill_switch_time.isoformat(),
            'activated_by': admin_id
        }
    
    @classmethod
    def deactivate_kill_switch(cls, admin_id: int) -> Dict[str, Any]:
        """Kill switch'i devre dışı bırak."""
        cls._kill_switch_active = False
        downtime = None
        
        if cls._kill_switch_time:
            downtime = (datetime.utcnow() - cls._kill_switch_time).total_seconds()
        
        cls._kill_switch_reason = None
        cls._kill_switch_time = None
        
        # Veritabanını güncelle
        config = AIConfiguration.query.filter_by(key='ai_kill_switch').first()
        if config:
            config.value = 'false'
            config.updated_at = datetime.utcnow()
            db.session.commit()
        
        logger.info(f"AI kill switch deactivated by admin {admin_id}")
        
        # Cache temizle
        cls._clear_cache()
        
        return {
            'kill_switch_active': False,
            'deactivated_by': admin_id,
            'downtime_seconds': downtime
        }
    
    @classmethod
    def is_kill_switch_active(cls) -> bool:
        """Kill switch aktif mi?"""
        # Önce in-memory kontrol
        if cls._kill_switch_active:
            return True
        
        # Veritabanından kontrol (cache ile)
        cached = cls._get_from_cache('kill_switch')
        if cached is not None:
            return cached
        
        config = AIConfiguration.query.filter_by(key='ai_kill_switch').first()
        is_active = config and config.value == 'true'
        
        cls._set_cache('kill_switch', is_active)
        
        return is_active
    
    # ==========================================================================
    # FEATURE CONTROL
    # ==========================================================================
    
    @classmethod
    def is_enabled(
        cls,
        feature: str,
        user_id: Optional[int] = None,
        user_role: Optional[str] = None
    ) -> RolloutStatus:
        """
        AI özelliği aktif mi kontrol et.
        
        Args:
            feature: Özellik adı (question_hint, topic_explanation, vb.)
            user_id: Kullanıcı ID (rollout için)
            user_role: Kullanıcı rolü (whitelist için)
        """
        # Kill switch kontrolü - her şeyi devre dışı bırakır
        if cls.is_kill_switch_active():
            return RolloutStatus(
                feature=feature,
                stage=RolloutStage.DISABLED,
                percentage=0,
                enabled=False,
                enabled_for_user=False,
                reason='Kill switch active'
            )
        
        # Config al
        config = get_ai_production_config()
        flags = config.feature_flags
        
        # Feature bazlı devre dışı kontrolü
        if feature in flags.disabled_features:
            return RolloutStatus(
                feature=feature,
                stage=flags.rollout_stage,
                percentage=flags.rollout_percentage,
                enabled=False,
                enabled_for_user=False,
                reason=f'Feature "{feature}" is disabled'
            )
        
        # Feature bazlı aktif kontrolü
        if flags.enabled_features and feature not in flags.enabled_features:
            return RolloutStatus(
                feature=feature,
                stage=flags.rollout_stage,
                percentage=flags.rollout_percentage,
                enabled=False,
                enabled_for_user=False,
                reason=f'Feature "{feature}" not in enabled list'
            )
        
        # Rollout stage kontrolü
        if flags.rollout_stage == RolloutStage.DISABLED:
            return RolloutStatus(
                feature=feature,
                stage=RolloutStage.DISABLED,
                percentage=0,
                enabled=False,
                enabled_for_user=False,
                reason='AI rollout is disabled'
            )
        
        # Kullanıcı bazlı kontrol
        enabled_for_user = False
        reason = None
        
        if user_id and user_role:
            enabled_for_user = flags.is_user_eligible(user_id, user_role)
            
            if not enabled_for_user:
                if user_id in flags.blacklisted_user_ids:
                    reason = 'User is blacklisted'
                elif flags.rollout_stage == RolloutStage.INTERNAL_ONLY:
                    reason = 'Only internal users have access'
                else:
                    reason = f'User not in {flags.rollout_percentage}% rollout'
        
        return RolloutStatus(
            feature=feature,
            stage=flags.rollout_stage,
            percentage=flags.rollout_percentage,
            enabled=True,
            enabled_for_user=enabled_for_user,
            reason=reason
        )
    
    @classmethod
    def check_access(
        cls,
        feature: str,
        user_id: int,
        user_role: str
    ) -> tuple[bool, Optional[str]]:
        """
        Hızlı erişim kontrolü.
        
        Returns:
            (can_access, denial_reason)
        """
        status = cls.is_enabled(feature, user_id, user_role)
        
        if not status.enabled:
            return False, status.reason
        
        if not status.enabled_for_user:
            return False, status.reason
        
        return True, None
    
    # ==========================================================================
    # ROLLOUT MANAGEMENT
    # ==========================================================================
    
    @classmethod
    def set_rollout_stage(
        cls,
        stage: RolloutStage,
        percentage: int = 0,
        admin_id: int = None
    ) -> Dict[str, Any]:
        """
        Rollout aşamasını değiştir.
        
        Aşamalar:
        - DISABLED: Tamamen kapalı
        - INTERNAL_ONLY: Sadece admin/staff
        - CANARY: %5 kullanıcı
        - BETA: %25 kullanıcı
        - GRADUAL: Özel yüzde
        - GENERAL: %100 (production)
        """
        import os
        
        # Environment variable güncelle (geçici - restart'ta kaybolur)
        os.environ['AI_ROLLOUT_STAGE'] = stage.value
        os.environ['AI_ROLLOUT_PERCENTAGE'] = str(percentage)
        
        # Config cache'i temizle
        reload_ai_config()
        cls._clear_cache()
        
        # Veritabanına kaydet
        for key, value in [
            ('ai_rollout_stage', stage.value),
            ('ai_rollout_percentage', str(percentage))
        ]:
            config = AIConfiguration.query.filter_by(key=key).first()
            if not config:
                config = AIConfiguration(key=key, value=value)
                db.session.add(config)
            else:
                config.value = value
                config.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"AI rollout changed to {stage.value} ({percentage}%) by admin {admin_id}")
        
        return {
            'stage': stage.value,
            'percentage': percentage,
            'updated_by': admin_id,
            'updated_at': datetime.utcnow().isoformat()
        }
    
    @classmethod
    def gradual_rollout(
        cls,
        target_percentage: int,
        step: int = 5,
        admin_id: int = None
    ) -> Dict[str, Any]:
        """
        Kademeli rollout - belirli adımlarla artır.
        
        Örnek:
            gradual_rollout(50, step=10)
            # 0% -> 10% -> 20% -> 30% -> 40% -> 50%
        """
        config = get_ai_production_config()
        current = config.feature_flags.rollout_percentage
        
        if current >= target_percentage:
            return {
                'status': 'already_at_target',
                'current': current,
                'target': target_percentage
            }
        
        # Bir adım artır
        new_percentage = min(current + step, target_percentage)
        
        cls.set_rollout_stage(
            stage=RolloutStage.GRADUAL,
            percentage=new_percentage,
            admin_id=admin_id
        )
        
        return {
            'status': 'increased',
            'previous': current,
            'current': new_percentage,
            'target': target_percentage,
            'remaining_steps': (target_percentage - new_percentage) // step
        }
    
    # ==========================================================================
    # FEATURE MANAGEMENT
    # ==========================================================================
    
    @classmethod
    def enable_feature(cls, feature: str, admin_id: int) -> Dict[str, Any]:
        """Belirli bir özelliği aktif et."""
        config = get_ai_production_config()
        
        enabled = set(config.feature_flags.enabled_features)
        disabled = set(config.feature_flags.disabled_features)
        
        enabled.add(feature)
        disabled.discard(feature)
        
        # Veritabanına kaydet
        cls._save_feature_lists(list(enabled), list(disabled))
        
        logger.info(f"AI feature '{feature}' enabled by admin {admin_id}")
        
        return {
            'feature': feature,
            'enabled': True,
            'updated_by': admin_id
        }
    
    @classmethod
    def disable_feature(cls, feature: str, admin_id: int) -> Dict[str, Any]:
        """Belirli bir özelliği devre dışı bırak."""
        config = get_ai_production_config()
        
        enabled = set(config.feature_flags.enabled_features)
        disabled = set(config.feature_flags.disabled_features)
        
        enabled.discard(feature)
        disabled.add(feature)
        
        cls._save_feature_lists(list(enabled), list(disabled))
        
        logger.info(f"AI feature '{feature}' disabled by admin {admin_id}")
        
        return {
            'feature': feature,
            'enabled': False,
            'updated_by': admin_id
        }
    
    @classmethod
    def _save_feature_lists(cls, enabled: List[str], disabled: List[str]):
        """Feature listelerini veritabanına kaydet."""
        import os
        
        os.environ['AI_ENABLED_FEATURES'] = ','.join(enabled)
        os.environ['AI_DISABLED_FEATURES'] = ','.join(disabled)
        
        reload_ai_config()
        cls._clear_cache()
        
        for key, value in [
            ('ai_enabled_features', ','.join(enabled)),
            ('ai_disabled_features', ','.join(disabled))
        ]:
            config = AIConfiguration.query.filter_by(key=key).first()
            if not config:
                config = AIConfiguration(key=key, value=value)
                db.session.add(config)
            else:
                config.value = value
        
        db.session.commit()
    
    # ==========================================================================
    # USER MANAGEMENT
    # ==========================================================================
    
    @classmethod
    def add_beta_user(cls, user_id: int, admin_id: int) -> Dict[str, Any]:
        """Beta kullanıcı ekle."""
        config = get_ai_production_config()
        beta_users = set(config.feature_flags.beta_user_ids)
        beta_users.add(user_id)
        
        # Veritabanına kaydet
        config_entry = AIConfiguration.query.filter_by(key='ai_beta_users').first()
        if not config_entry:
            config_entry = AIConfiguration(
                key='ai_beta_users',
                value=','.join(map(str, beta_users))
            )
            db.session.add(config_entry)
        else:
            config_entry.value = ','.join(map(str, beta_users))
        
        db.session.commit()
        cls._clear_cache()
        
        return {
            'user_id': user_id,
            'added_to_beta': True,
            'total_beta_users': len(beta_users)
        }
    
    @classmethod
    def remove_beta_user(cls, user_id: int, admin_id: int) -> Dict[str, Any]:
        """Beta kullanıcı kaldır."""
        config = get_ai_production_config()
        beta_users = set(config.feature_flags.beta_user_ids)
        beta_users.discard(user_id)
        
        config_entry = AIConfiguration.query.filter_by(key='ai_beta_users').first()
        if config_entry:
            config_entry.value = ','.join(map(str, beta_users))
            db.session.commit()
        
        cls._clear_cache()
        
        return {
            'user_id': user_id,
            'removed_from_beta': True,
            'total_beta_users': len(beta_users)
        }
    
    @classmethod
    def blacklist_user(cls, user_id: int, reason: str, admin_id: int) -> Dict[str, Any]:
        """Kullanıcıyı AI blacklist'e ekle."""
        config = get_ai_production_config()
        blacklist = set(config.feature_flags.blacklisted_user_ids)
        blacklist.add(user_id)
        
        config_entry = AIConfiguration.query.filter_by(key='ai_blacklisted_users').first()
        if not config_entry:
            config_entry = AIConfiguration(
                key='ai_blacklisted_users',
                value=','.join(map(str, blacklist))
            )
            db.session.add(config_entry)
        else:
            config_entry.value = ','.join(map(str, blacklist))
        
        db.session.commit()
        cls._clear_cache()
        
        logger.warning(f"User {user_id} blacklisted from AI by admin {admin_id}: {reason}")
        
        return {
            'user_id': user_id,
            'blacklisted': True,
            'reason': reason
        }
    
    # ==========================================================================
    # STATUS & REPORTS
    # ==========================================================================
    
    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Tam feature flag durumu."""
        config = get_ai_production_config()
        flags = config.feature_flags
        
        return {
            'kill_switch': {
                'active': cls.is_kill_switch_active(),
                'reason': cls._kill_switch_reason,
                'activated_at': cls._kill_switch_time.isoformat() if cls._kill_switch_time else None
            },
            'rollout': {
                'stage': flags.rollout_stage.value,
                'percentage': flags.rollout_percentage
            },
            'features': {
                'enabled': flags.enabled_features,
                'disabled': flags.disabled_features
            },
            'users': {
                'beta_count': len(flags.beta_user_ids),
                'blacklist_count': len(flags.blacklisted_user_ids),
                'whitelisted_roles': flags.whitelisted_roles
            },
            'provider': config.provider.value,
            'model': config.model,
            'is_mock_mode': config.is_mock_mode(),
            'is_production_ready': config.is_production_ready()
        }
    
    @classmethod
    def get_all_features(cls) -> List[Dict[str, Any]]:
        """Tüm özelliklerin durumu."""
        features = []
        
        for feature in AIFeature:
            status = cls.is_enabled(feature.value)
            features.append({
                'name': feature.value,
                'display_name': feature.value.replace('_', ' ').title(),
                'enabled': status.enabled,
                'stage': status.stage.value,
                'percentage': status.percentage
            })
        
        return features
    
    # ==========================================================================
    # CACHE
    # ==========================================================================
    
    @classmethod
    def _get_from_cache(cls, key: str) -> Optional[Any]:
        """Cache'den değer al."""
        with cls._cache_lock:
            if cls._cache_time:
                elapsed = (datetime.utcnow() - cls._cache_time).total_seconds()
                if elapsed > cls._cache_ttl:
                    cls._cache.clear()
                    cls._cache_time = None
                    return None
            
            return cls._cache.get(key)
    
    @classmethod
    def _set_cache(cls, key: str, value: Any):
        """Cache'e değer yaz."""
        with cls._cache_lock:
            cls._cache[key] = value
            if cls._cache_time is None:
                cls._cache_time = datetime.utcnow()
    
    @classmethod
    def _clear_cache(cls):
        """Cache'i temizle."""
        with cls._cache_lock:
            cls._cache.clear()
            cls._cache_time = None
