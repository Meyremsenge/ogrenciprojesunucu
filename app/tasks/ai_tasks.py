"""
AI Tasks - Celery Async AI Tasks.

Asenkron AI işlemleri için Celery task'ları.
"""

from celery import shared_task, current_task
from datetime import datetime
from typing import Dict, Any, Optional
import json
import time

from app.extensions import db


@shared_task(
    bind=True,
    name='ai.process_request',
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(Exception,),
    retry_backoff=True
)
def process_ai_request(
    self,
    user_id: int,
    feature: str,
    prompt: str,
    context: Dict[str, Any],
    role: str,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    AI isteğini asenkron işle.
    
    Args:
        user_id: Kullanıcı ID
        feature: AI özelliği
        prompt: Kullanıcı prompt'u
        context: İstek context'i
        role: Kullanıcı rolü
        request_id: İstek ID'si
        
    Returns:
        AI yanıtı
    """
    from app.modules.ai.core import AIFeature, AIRequest
    from app.modules.ai.providers import provider_factory
    from app.modules.ai.quota import RedisQuotaManager
    from app.modules.ai.prompts import prompt_manager
    
    start_time = time.time()
    
    try:
        # Task durumunu güncelle
        self.update_state(
            state='PROCESSING',
            meta={
                'user_id': user_id,
                'feature': feature,
                'started_at': datetime.utcnow().isoformat()
            }
        )
        
        # Feature enum'a çevir
        ai_feature = AIFeature(feature)
        
        # Prompt oluştur
        system_prompt, user_prompt, template = prompt_manager.get_prompt(
            feature=ai_feature,
            variables=context,
            role=role
        )
        
        # AI Request oluştur
        ai_request = AIRequest(
            feature=ai_feature,
            prompt=f"{system_prompt}\n\n{user_prompt}",
            user_id=user_id,
            role=role,
            context={'system_prompt': system_prompt, **context},
            request_id=request_id or self.request.id
        )
        
        # Provider'dan yanıt al
        provider = provider_factory.get_default()
        response = provider.complete(ai_request)
        
        # Kota tüket
        quota_manager = RedisQuotaManager()
        quota_manager.consume_quota(user_id, ai_feature, response.tokens_used)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return {
            'success': True,
            'content': response.content,
            'tokens_used': response.tokens_used,
            'model': response.model,
            'provider': response.provider,
            'feature': feature,
            'request_id': request_id or self.request.id,
            'processing_time_ms': processing_time,
            'is_mock': response.is_mock,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        # Hata durumunda
        return {
            'success': False,
            'error': str(e),
            'feature': feature,
            'request_id': request_id or self.request.id,
            'failed_at': datetime.utcnow().isoformat()
        }


@shared_task(
    bind=True,
    name='ai.batch_process',
    max_retries=2
)
def batch_process_ai_requests(
    self,
    requests: list[Dict[str, Any]],
    user_id: int,
    role: str
) -> Dict[str, Any]:
    """
    Birden fazla AI isteğini toplu işle.
    
    Args:
        requests: İstek listesi
        user_id: Kullanıcı ID
        role: Kullanıcı rolü
        
    Returns:
        Toplu sonuçlar
    """
    results = []
    total_tokens = 0
    
    for i, req in enumerate(requests):
        self.update_state(
            state='PROGRESS',
            meta={
                'current': i + 1,
                'total': len(requests),
                'status': f'Processing request {i + 1}/{len(requests)}'
            }
        )
        
        result = process_ai_request.apply(
            args=[
                user_id,
                req.get('feature'),
                req.get('prompt'),
                req.get('context', {}),
                role,
                req.get('request_id')
            ]
        ).get()
        
        results.append(result)
        if result.get('success'):
            total_tokens += result.get('tokens_used', 0)
    
    return {
        'success': True,
        'total_requests': len(requests),
        'successful': sum(1 for r in results if r.get('success')),
        'failed': sum(1 for r in results if not r.get('success')),
        'total_tokens': total_tokens,
        'results': results,
        'completed_at': datetime.utcnow().isoformat()
    }


@shared_task(
    name='ai.generate_daily_report',
    ignore_result=False
)
def generate_daily_ai_report(date: Optional[str] = None) -> Dict[str, Any]:
    """
    Günlük AI kullanım raporu oluştur.
    
    Args:
        date: Rapor tarihi (YYYY-MM-DD). None ise bugün.
        
    Returns:
        Rapor verileri
    """
    from app.models.ai import AIUsageLog
    from sqlalchemy import func
    
    if date:
        report_date = datetime.strptime(date, '%Y-%m-%d').date()
    else:
        report_date = datetime.utcnow().date()
    
    # Günlük istatistikler
    with db.session() as session:
        stats = session.query(
            func.count(AIUsageLog.id).label('total_requests'),
            func.sum(AIUsageLog.tokens_used).label('total_tokens'),
            func.avg(AIUsageLog.tokens_used).label('avg_tokens'),
            func.count(func.distinct(AIUsageLog.user_id)).label('unique_users')
        ).filter(
            func.date(AIUsageLog.created_at) == report_date
        ).first()
        
        # Feature bazlı kullanım
        feature_stats = session.query(
            AIUsageLog.feature,
            func.count(AIUsageLog.id).label('count'),
            func.sum(AIUsageLog.tokens_used).label('tokens')
        ).filter(
            func.date(AIUsageLog.created_at) == report_date
        ).group_by(AIUsageLog.feature).all()
        
        # Saat bazlı dağılım
        hourly_stats = session.query(
            func.extract('hour', AIUsageLog.created_at).label('hour'),
            func.count(AIUsageLog.id).label('count')
        ).filter(
            func.date(AIUsageLog.created_at) == report_date
        ).group_by('hour').all()
    
    return {
        'report_date': report_date.isoformat(),
        'generated_at': datetime.utcnow().isoformat(),
        'summary': {
            'total_requests': stats.total_requests or 0,
            'total_tokens': stats.total_tokens or 0,
            'avg_tokens_per_request': round(stats.avg_tokens or 0, 2),
            'unique_users': stats.unique_users or 0
        },
        'by_feature': [
            {'feature': f.feature, 'count': f.count, 'tokens': f.tokens}
            for f in feature_stats
        ],
        'by_hour': [
            {'hour': int(h.hour), 'count': h.count}
            for h in hourly_stats
        ]
    }


@shared_task(
    name='ai.cleanup_old_logs',
    ignore_result=True
)
def cleanup_old_ai_logs(days: int = 90) -> Dict[str, Any]:
    """
    Eski AI log kayıtlarını temizle.
    
    Args:
        days: Kaç günden eski loglar silinsin
        
    Returns:
        Temizlik sonucu
    """
    from app.models.ai import AIUsageLog
    from datetime import timedelta
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    with db.session() as session:
        deleted_count = session.query(AIUsageLog).filter(
            AIUsageLog.created_at < cutoff_date
        ).delete(synchronize_session=False)
        
        session.commit()
    
    return {
        'success': True,
        'deleted_count': deleted_count,
        'cutoff_date': cutoff_date.isoformat(),
        'cleaned_at': datetime.utcnow().isoformat()
    }


@shared_task(
    name='ai.sync_quota_to_db',
    ignore_result=True
)
def sync_quota_to_db(user_id: int) -> Dict[str, Any]:
    """
    Redis'teki kota bilgilerini veritabanına senkronize et.
    
    Args:
        user_id: Kullanıcı ID
        
    Returns:
        Senkronizasyon sonucu
    """
    from app.models.ai import AIQuota
    from app.modules.ai.quota import RedisQuotaManager
    
    quota_manager = RedisQuotaManager()
    quota_status = quota_manager.get_quota_status(user_id)
    
    with db.session() as session:
        # Mevcut quota kaydını bul veya oluştur
        quota = session.query(AIQuota).filter_by(user_id=user_id).first()
        
        if not quota:
            quota = AIQuota(user_id=user_id)
            session.add(quota)
        
        # Güncel değerleri kaydet
        quota.daily_tokens_used = quota_status['tokens']['daily']['used']
        quota.monthly_tokens_used = quota_status['tokens']['monthly']['used']
        quota.daily_requests_used = quota_status['requests']['daily']['used']
        quota.updated_at = datetime.utcnow()
        
        session.commit()
    
    return {
        'success': True,
        'user_id': user_id,
        'synced_at': datetime.utcnow().isoformat()
    }


@shared_task(
    bind=True,
    name='ai.warmup_cache',
    ignore_result=True
)
def warmup_ai_cache(self) -> Dict[str, Any]:
    """
    AI cache'ini önceden ısıt.
    
    Sık kullanılan prompt'lar için cache'i doldurur.
    """
    from app.modules.ai.core import AIFeature
    from app.modules.ai.prompts import prompt_manager
    
    warmed_templates = []
    
    # Tüm template'leri yükle
    for feature in AIFeature:
        try:
            info = prompt_manager.get_template_info(feature)
            if info:
                warmed_templates.append(feature.value)
        except Exception:
            pass
    
    return {
        'success': True,
        'warmed_templates': warmed_templates,
        'completed_at': datetime.utcnow().isoformat()
    }


@shared_task(
    name='ai.check_provider_health',
    ignore_result=False
)
def check_provider_health() -> Dict[str, Any]:
    """
    Tüm AI provider'larının sağlık durumunu kontrol et.
    """
    from app.modules.ai.providers import provider_factory, ProviderType
    
    results = {}
    
    for provider_type in [ProviderType.MOCK, ProviderType.OPENAI]:
        try:
            provider = provider_factory.get(provider_type.value)
            health = provider.health_check()
            results[provider_type.value] = {
                'is_healthy': health.is_healthy,
                'latency_ms': health.latency_ms,
                'error': health.error_message
            }
        except Exception as e:
            results[provider_type.value] = {
                'is_healthy': False,
                'error': str(e)
            }
    
    return {
        'checked_at': datetime.utcnow().isoformat(),
        'providers': results
    }
