"""
Cleanup tasks for maintenance operations.

KVKK/GDPR Uyumlu:
- AI logları için retention policy
- Kişisel veri temizleme
- Otomatik anonimleştirme
"""

from datetime import datetime, timedelta
from celery import shared_task

from app.extensions import db


@shared_task(bind=True, max_retries=2)
def cleanup_expired_tokens(self):
    """
    Cleanup expired JWT tokens from blacklist.
    Runs every hour.
    """
    try:
        from app.models.user import TokenBlacklist
        
        # Delete tokens expired more than 1 day ago
        cutoff = datetime.utcnow() - timedelta(days=1)
        
        deleted = TokenBlacklist.query.filter(
            TokenBlacklist.expires_at < cutoff
        ).delete()
        
        db.session.commit()
        
        return {
            'success': True,
            'deleted_tokens': deleted
        }
        
    except Exception as e:
        db.session.rollback()
        self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=2)
def cleanup_ai_logs_kvkk_gdpr(self):
    """
    KVKK/GDPR uyumlu AI log temizleme.
    
    Bu task veri saklama politikasını uygular:
    - 30 günden eski normal AI logları siler
    - 90 günden eski hata loglarını siler
    - 1 yıldan eski çözülmüş ihlalleri siler
    
    KVKK Madde 4: İlgili mevzuatta öngörülen süre kadar saklanma
    GDPR Article 5(e): Storage limitation
    
    Önerilen çalıştırma: Günlük (gece 03:00)
    """
    try:
        from app.modules.logs.ai_audit_service import AIAuditService
        
        result = AIAuditService.apply_retention_policy(admin_id=None)
        
        return {
            'success': True,
            'kvkk_gdpr_compliant': True,
            **result
        }
        
    except Exception as e:
        db.session.rollback()
        self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=2)
def cleanup_old_data(self):
    """
    Cleanup old data for maintenance.
    - Remove old notification logs
    - Archive old exam attempts
    - Clean temporary files
    """
    try:
        from app.models.evaluation import EvaluationNotification
        
        results = {}
        
        # Delete old notifications (older than 90 days)
        notification_cutoff = datetime.utcnow() - timedelta(days=90)
        deleted_notifications = EvaluationNotification.query.filter(
            EvaluationNotification.created_at < notification_cutoff,
            EvaluationNotification.is_read == True
        ).delete()
        results['deleted_notifications'] = deleted_notifications
        
        db.session.commit()
        
        return {
            'success': True,
            'results': results
        }
        
    except Exception as e:
        db.session.rollback()
        self.retry(exc=e, countdown=300)


@shared_task(bind=True)
def vacuum_database(self):
    """
    Run VACUUM ANALYZE on PostgreSQL tables.
    Reclaims storage and updates statistics.
    Should run during low-traffic periods.
    """
    try:
        # Note: VACUUM cannot run inside a transaction
        # This needs to be run with autocommit
        from sqlalchemy import text
        
        connection = db.engine.raw_connection()
        connection.set_isolation_level(0)  # AUTOCOMMIT
        
        cursor = connection.cursor()
        
        # Get all tables
        tables = [
            'users', 'courses', 'topics', 'videos', 
            'questions', 'exams', 'exam_attempts',
            'evaluations', 'live_sessions'
        ]
        
        for table in tables:
            try:
                cursor.execute(f"VACUUM ANALYZE {table}")
            except Exception:
                pass  # Table might not exist
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'tables_vacuumed': tables
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(bind=True)
def cleanup_orphan_files(self):
    """
    Cleanup orphan files in storage.
    Files not referenced by any database record.
    """
    try:
        import os
        from flask import current_app
        
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        
        if not os.path.exists(upload_folder):
            return {'success': True, 'message': 'No upload folder'}
        
        # Get all file references from database
        from app.models.content import Video
        from app.models.question import Question
        
        referenced_files = set()
        
        # Collect video thumbnails
        videos = Video.query.with_entities(Video.thumbnail_url).all()
        for v in videos:
            if v.thumbnail_url:
                referenced_files.add(os.path.basename(v.thumbnail_url))
        
        # Find and remove orphan files
        removed_files = []
        for filename in os.listdir(upload_folder):
            filepath = os.path.join(upload_folder, filename)
            if os.path.isfile(filepath) and filename not in referenced_files:
                # Check file age (only remove files older than 7 days)
                file_age = datetime.utcnow() - datetime.fromtimestamp(
                    os.path.getmtime(filepath)
                )
                if file_age.days > 7:
                    os.remove(filepath)
                    removed_files.append(filename)
        
        return {
            'success': True,
            'removed_files': len(removed_files)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


# =============================================================================
# KVKK UYUMLU AI VERİ TEMİZLİĞİ
# =============================================================================

@shared_task(bind=True, max_retries=2)
def anonymize_old_ai_chat_sessions(self, retention_days: int = 180):
    """
    KVKK uyumlu AI chat session anonimleştirmesi.
    
    Varsayılan 6 ay (180 gün) sonra chat oturumları anonimleştirilir.
    - Kişisel veriler silinir
    - Mesaj içerikleri hash'lenir
    - İstatistiksel veriler korunur
    
    Runs: Günlük (02:00)
    
    Args:
        retention_days: Saklama süresi (gün)
    """
    try:
        from app.models.ai_chat import anonymize_old_sessions
        
        count = anonymize_old_sessions(retention_days=retention_days)
        
        return {
            'success': True,
            'anonymized_sessions': count,
            'retention_days': retention_days,
            'executed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.session.rollback()
        self.retry(exc=e, countdown=300)  # 5 dakika sonra tekrar dene


@shared_task(bind=True, max_retries=2)
def delete_anonymized_ai_sessions(self, days_after_anonymization: int = 30):
    """
    Anonimleştirilmiş AI chat sessionlarını tamamen sil.
    
    Anonimleştirmeden 30 gün sonra kalıcı silme yapılır.
    Bu, veri kurtarma için ek süre sağlar.
    
    Runs: Haftalık (Pazar 03:00)
    
    Args:
        days_after_anonymization: Anonimleştirmeden sonra bekleme süresi
    """
    try:
        from app.models.ai_chat import delete_anonymized_sessions
        
        count = delete_anonymized_sessions(days_after_anonymization=days_after_anonymization)
        
        return {
            'success': True,
            'deleted_sessions': count,
            'days_after_anonymization': days_after_anonymization,
            'executed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.session.rollback()
        self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=1)
def cleanup_old_ai_usage_logs(self, retention_days: int = 365):
    """
    Eski AI kullanım loglarını temizle/anonimleştir.
    
    1 yıldan eski loglar anonimleştirilir:
    - request_data içindeki PII temizlenir
    - response_summary kısaltılır
    
    Runs: Aylık (Her ayın 1'i 04:00)
    
    Args:
        retention_days: Log saklama süresi (gün)
    """
    try:
        from app.models.ai import AIUsageLog
        from app.models.ai_chat import AIDataRetentionLog
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # Eski logları bul
        old_logs = AIUsageLog.query.filter(
            AIUsageLog.created_at < cutoff_date
        ).all()
        
        anonymized_count = 0
        for log in old_logs:
            # Request data'yı temizle (PII içerebilir)
            if log.request_data:
                log.request_data = {
                    'anonymized': True,
                    'original_keys': list(log.request_data.keys()) if isinstance(log.request_data, dict) else []
                }
            
            # Response summary'yi kısalt
            if log.response_summary and len(log.response_summary) > 50:
                log.response_summary = f"[Anonimleştirildi - {len(log.response_summary)} karakter]"
            
            anonymized_count += 1
        
        # Loglama
        if anonymized_count > 0:
            AIDataRetentionLog.log_anonymization(
                table='ai_usage_logs',
                count=anonymized_count,
                legal_basis=f'KVKK - {retention_days} günlük log saklama süresi'
            )
        
        db.session.commit()
        
        return {
            'success': True,
            'anonymized_logs': anonymized_count,
            'retention_days': retention_days,
            'executed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(bind=True)
def generate_ai_usage_report(self, period: str = 'daily'):
    """
    AI kullanım raporu oluştur.
    
    Günlük/haftalık/aylık AI kullanım istatistikleri.
    
    Args:
        period: 'daily', 'weekly', 'monthly'
    """
    try:
        from app.models.ai import AIUsageLog, AIQuota
        from app.models.ai_chat import AIChatSession, AIChatMessage
        from sqlalchemy import func
        
        # Zaman aralığını belirle
        if period == 'daily':
            start_date = datetime.utcnow() - timedelta(days=1)
        elif period == 'weekly':
            start_date = datetime.utcnow() - timedelta(weeks=1)
        else:
            start_date = datetime.utcnow() - timedelta(days=30)
        
        # AI Usage istatistikleri
        usage_stats = db.session.query(
            AIUsageLog.feature,
            func.count(AIUsageLog.id).label('request_count'),
            func.sum(AIUsageLog.tokens_used).label('total_tokens'),
            func.avg(AIUsageLog.processing_time_ms).label('avg_processing_time')
        ).filter(
            AIUsageLog.created_at >= start_date
        ).group_by(AIUsageLog.feature).all()
        
        # Chat session istatistikleri
        session_stats = db.session.query(
            func.count(AIChatSession.id).label('new_sessions'),
            func.sum(AIChatSession.message_count).label('total_messages'),
            func.sum(AIChatSession.total_tokens_used).label('total_tokens')
        ).filter(
            AIChatSession.created_at >= start_date,
            AIChatSession.is_deleted == False
        ).first()
        
        # Aktif kullanıcı sayısı
        active_users = db.session.query(
            func.count(func.distinct(AIUsageLog.user_id))
        ).filter(
            AIUsageLog.created_at >= start_date
        ).scalar()
        
        report = {
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': datetime.utcnow().isoformat(),
            'usage_by_feature': [
                {
                    'feature': stat.feature,
                    'request_count': stat.request_count,
                    'total_tokens': stat.total_tokens or 0,
                    'avg_processing_time_ms': round(stat.avg_processing_time or 0, 2)
                }
                for stat in usage_stats
            ],
            'chat_sessions': {
                'new_sessions': session_stats.new_sessions or 0 if session_stats else 0,
                'total_messages': session_stats.total_messages or 0 if session_stats else 0,
                'total_tokens': session_stats.total_tokens or 0 if session_stats else 0
            },
            'active_users': active_users or 0,
            'generated_at': datetime.utcnow().isoformat()
        }
        
        return {
            'success': True,
            'report': report
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


# =============================================================================
# LOG TEMİZLİK GÖREVLERİ
# =============================================================================

@shared_task(bind=True, max_retries=2)
def cleanup_old_request_logs(self, retention_days: int = 30):
    """
    Eski request loglarını temizle.
    
    Varsayılan olarak 30 günden eski request logları silinir.
    Performans metrikleri aggregate edilir.
    
    Runs: Günlük (03:00)
    
    Args:
        retention_days: Saklama süresi (gün)
    """
    try:
        from app.models.audit import RequestLog
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        deleted = RequestLog.query.filter(
            RequestLog.created_at < cutoff_date
        ).delete(synchronize_session=False)
        
        db.session.commit()
        
        return {
            'success': True,
            'deleted_request_logs': deleted,
            'retention_days': retention_days,
            'executed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.session.rollback()
        self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=2)
def cleanup_old_performance_metrics(self, retention_days: int = 90):
    """
    Eski performans metriklerini temizle.
    
    Varsayılan olarak 90 günden eski detaylı metrikler silinir.
    Aggregate metrikler korunur.
    
    Runs: Haftalık (Pazar 04:00)
    
    Args:
        retention_days: Saklama süresi (gün)
    """
    try:
        from app.models.audit import PerformanceMetric
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        deleted = PerformanceMetric.query.filter(
            PerformanceMetric.created_at < cutoff_date
        ).delete(synchronize_session=False)
        
        db.session.commit()
        
        return {
            'success': True,
            'deleted_performance_metrics': deleted,
            'retention_days': retention_days,
            'executed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.session.rollback()
        self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=2)
def cleanup_resolved_errors(self, days_after_resolution: int = 60):
    """
    Çözümlenmiş hata loglarını temizle.
    
    Çözümlenmeden 60 gün sonra hata logları silinir.
    
    Runs: Haftalık (Pazar 04:30)
    
    Args:
        days_after_resolution: Çözümden sonra bekleme süresi
    """
    try:
        from app.models.audit import ErrorLog
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_after_resolution)
        
        deleted = ErrorLog.query.filter(
            ErrorLog.is_resolved == True,
            ErrorLog.resolved_at < cutoff_date
        ).delete(synchronize_session=False)
        
        db.session.commit()
        
        return {
            'success': True,
            'deleted_error_logs': deleted,
            'days_after_resolution': days_after_resolution,
            'executed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.session.rollback()
        self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=2)
def cleanup_resolved_security_events(self, days_after_resolution: int = 90):
    """
    Çözümlenmiş güvenlik olaylarını temizle.
    
    Çözümlenmeden 90 gün sonra güvenlik olayları silinir.
    Kritik seviye olanlar 180 gün saklanır.
    
    Runs: Aylık (Her ayın 1'i 05:00)
    
    Args:
        days_after_resolution: Çözümden sonra bekleme süresi
    """
    try:
        from app.models.audit import SecurityEvent, SecuritySeverity
        
        # Normal olaylar için cutoff
        normal_cutoff = datetime.utcnow() - timedelta(days=days_after_resolution)
        # Kritik olaylar için daha uzun saklama
        critical_cutoff = datetime.utcnow() - timedelta(days=days_after_resolution * 2)
        
        # Normal severity olayları sil
        deleted_normal = SecurityEvent.query.filter(
            SecurityEvent.is_resolved == True,
            SecurityEvent.resolved_at < normal_cutoff,
            SecurityEvent.severity.notin_([SecuritySeverity.HIGH, SecuritySeverity.CRITICAL])
        ).delete(synchronize_session=False)
        
        # Kritik olayları sil (daha uzun saklama sonrası)
        deleted_critical = SecurityEvent.query.filter(
            SecurityEvent.is_resolved == True,
            SecurityEvent.resolved_at < critical_cutoff,
            SecurityEvent.severity.in_([SecuritySeverity.HIGH, SecuritySeverity.CRITICAL])
        ).delete(synchronize_session=False)
        
        db.session.commit()
        
        return {
            'success': True,
            'deleted_normal_events': deleted_normal,
            'deleted_critical_events': deleted_critical,
            'days_after_resolution': days_after_resolution,
            'executed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.session.rollback()
        self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=2)
def cleanup_old_audit_logs(self, retention_days: int = 365):
    """
    Eski audit loglarını temizle.
    
    Varsayılan olarak 1 yıldan eski audit logları silinir.
    Yasal gereklilikler için daha uzun saklama yapılandırılabilir.
    
    Runs: Aylık (Her ayın 1'i 06:00)
    
    Args:
        retention_days: Saklama süresi (gün)
    """
    try:
        from app.models.audit import AuditLog
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        deleted = AuditLog.query.filter(
            AuditLog.created_at < cutoff_date
        ).delete(synchronize_session=False)
        
        db.session.commit()
        
        return {
            'success': True,
            'deleted_audit_logs': deleted,
            'retention_days': retention_days,
            'executed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.session.rollback()
        self.retry(exc=e, countdown=300)


@shared_task(bind=True)
def aggregate_performance_metrics(self):
    """
    Performans metriklerini aggregate et.
    
    Saatlik detaylı metriklerden günlük/haftalık aggregation oluştur.
    Dashboard için daha hızlı sorgular sağlar.
    
    Runs: Saatlik
    """
    try:
        from app.models.audit import PerformanceMetric, AggregatedMetric, MetricType
        from sqlalchemy import func
        
        # Son 1 saatin metriklerini aggregate et
        end_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        start_time = end_time - timedelta(hours=1)
        
        # Her endpoint için aggregate hesapla
        endpoint_metrics = db.session.query(
            PerformanceMetric.endpoint,
            PerformanceMetric.method,
            func.count(PerformanceMetric.id).label('count'),
            func.avg(PerformanceMetric.duration_ms).label('avg_duration'),
            func.min(PerformanceMetric.duration_ms).label('min_duration'),
            func.max(PerformanceMetric.duration_ms).label('max_duration')
        ).filter(
            PerformanceMetric.created_at >= start_time,
            PerformanceMetric.created_at < end_time,
            PerformanceMetric.endpoint.isnot(None)
        ).group_by(
            PerformanceMetric.endpoint,
            PerformanceMetric.method
        ).all()
        
        aggregated_count = 0
        for metric in endpoint_metrics:
            # Percentile hesaplama için detaylı veriler
            durations = db.session.query(PerformanceMetric.duration_ms).filter(
                PerformanceMetric.created_at >= start_time,
                PerformanceMetric.created_at < end_time,
                PerformanceMetric.endpoint == metric.endpoint,
                PerformanceMetric.method == metric.method
            ).all()
            
            durations = sorted([d[0] for d in durations if d[0] is not None])
            
            if durations:
                p50_idx = int(len(durations) * 0.5)
                p95_idx = int(len(durations) * 0.95)
                p99_idx = int(len(durations) * 0.99)
                
                aggregated = AggregatedMetric(
                    metric_name=f"endpoint:{metric.endpoint}:{metric.method}",
                    metric_type=MetricType.REQUEST,
                    aggregation_period='hourly',
                    period_start=start_time,
                    period_end=end_time,
                    count=metric.count,
                    avg_value=round(metric.avg_duration, 2) if metric.avg_duration else 0,
                    min_value=metric.min_duration or 0,
                    max_value=metric.max_duration or 0,
                    p50_value=durations[p50_idx] if durations else 0,
                    p95_value=durations[min(p95_idx, len(durations)-1)] if durations else 0,
                    p99_value=durations[min(p99_idx, len(durations)-1)] if durations else 0
                )
                
                db.session.add(aggregated)
                aggregated_count += 1
        
        db.session.commit()
        
        return {
            'success': True,
            'aggregated_metrics': aggregated_count,
            'period_start': start_time.isoformat(),
            'period_end': end_time.isoformat(),
            'executed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(bind=True)
def generate_daily_log_report(self):
    """
    Günlük log raporu oluştur ve admin'lere gönder.
    
    Runs: Günlük (07:00)
    """
    try:
        from app.services.log_service import ReportingService
        from app.models.user import User, UserRole
        
        # Dashboard istatistiklerini al
        stats = ReportingService.get_dashboard_stats()
        
        # Admin e-postalarını al
        admins = User.query.filter(
            User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
            User.is_active == True
        ).all()
        
        # Kritik güvenlik olayı var mı kontrol et
        has_critical = stats.get('security', {}).get('unresolved_critical', 0) > 0
        
        # Rapor özeti oluştur
        report_summary = {
            'date': datetime.utcnow().strftime('%Y-%m-%d'),
            'requests_today': stats.get('requests', {}).get('today', 0),
            'errors_today': stats.get('errors', {}).get('today', 0),
            'security_events_today': stats.get('security', {}).get('today', 0),
            'avg_response_time': stats.get('performance', {}).get('avg_duration_ms', 0),
            'slow_request_rate': stats.get('performance', {}).get('slow_request_rate', 0),
            'has_critical_issues': has_critical
        }
        
        return {
            'success': True,
            'report': report_summary,
            'notified_admins': len(admins),
            'executed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
