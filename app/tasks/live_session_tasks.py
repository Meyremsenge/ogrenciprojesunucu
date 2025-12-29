"""
Live Session Tasks.

Canlı ders hatırlatma ve temizlik görevleri.
"""

from datetime import datetime, timedelta
from celery import shared_task

from app.extensions import db
from app.modules.live_classes.models import LiveSession, SessionStatus, SessionAttendance


@shared_task(name='live_sessions.send_reminders')
def send_session_reminders():
    """
    Yaklaşan canlı dersler için hatırlatma gönder.
    
    - 24 saat önce
    - 1 saat önce
    """
    from app.services.notification_service import NotificationService
    
    now = datetime.utcnow()
    
    # 24 saat hatırlatması
    reminder_24h_start = now + timedelta(hours=23, minutes=30)
    reminder_24h_end = now + timedelta(hours=24, minutes=30)
    
    sessions_24h = LiveSession.query.filter(
        LiveSession.status == SessionStatus.SCHEDULED,
        LiveSession.scheduled_start >= reminder_24h_start,
        LiveSession.scheduled_start <= reminder_24h_end,
        LiveSession.reminder_24h_sent == False,
        LiveSession.is_deleted == False
    ).all()
    
    for session in sessions_24h:
        try:
            # Kayıtlı öğrencilere bildirim gönder
            attendances = SessionAttendance.query.filter_by(session_id=session.id).all()
            
            for attendance in attendances:
                NotificationService.send(
                    user_id=attendance.user_id,
                    title='Yarın Canlı Ders Var!',
                    message=f'"{session.title}" dersi yarın {session.scheduled_start.strftime("%H:%M")} saatinde başlayacak.',
                    notification_type='live_session_reminder',
                    data={
                        'session_id': session.id,
                        'scheduled_start': session.scheduled_start.isoformat()
                    }
                )
            
            session.reminder_24h_sent = True
            db.session.commit()
            
        except Exception as e:
            print(f"24h hatırlatma hatası (session {session.id}): {e}")
    
    # 1 saat hatırlatması
    reminder_1h_start = now + timedelta(minutes=55)
    reminder_1h_end = now + timedelta(minutes=65)
    
    sessions_1h = LiveSession.query.filter(
        LiveSession.status == SessionStatus.SCHEDULED,
        LiveSession.scheduled_start >= reminder_1h_start,
        LiveSession.scheduled_start <= reminder_1h_end,
        LiveSession.reminder_1h_sent == False,
        LiveSession.is_deleted == False
    ).all()
    
    for session in sessions_1h:
        try:
            attendances = SessionAttendance.query.filter_by(session_id=session.id).all()
            
            for attendance in attendances:
                NotificationService.send(
                    user_id=attendance.user_id,
                    title='Canlı Ders 1 Saat Sonra!',
                    message=f'"{session.title}" dersi 1 saat sonra başlayacak. Hazırlanın!',
                    notification_type='live_session_reminder',
                    priority='high',
                    data={
                        'session_id': session.id,
                        'scheduled_start': session.scheduled_start.isoformat()
                    }
                )
            
            # Host'a da hatırlatma
            NotificationService.send(
                user_id=session.host_id,
                title='Dersiniz 1 Saat Sonra!',
                message=f'"{session.title}" dersiniz 1 saat sonra başlayacak.',
                notification_type='live_session_host_reminder',
                priority='high',
                data={'session_id': session.id}
            )
            
            session.reminder_1h_sent = True
            db.session.commit()
            
        except Exception as e:
            print(f"1h hatırlatma hatası (session {session.id}): {e}")
    
    return {
        'sent_24h': len(sessions_24h),
        'sent_1h': len(sessions_1h)
    }


@shared_task(name='live_sessions.auto_end_expired')
def auto_end_expired_sessions():
    """
    Süresi dolan canlı dersleri otomatik bitir.
    
    Planlanan bitiş saatini 30 dakika geçen LIVE oturumları bitirir.
    """
    now = datetime.utcnow()
    grace_period = timedelta(minutes=30)
    
    expired_sessions = LiveSession.query.filter(
        LiveSession.status == SessionStatus.LIVE,
        LiveSession.scheduled_end < now - grace_period,
        LiveSession.is_deleted == False
    ).all()
    
    ended_count = 0
    
    for session in expired_sessions:
        try:
            session.end_session()
            db.session.commit()
            ended_count += 1
            
            # Host'a bildirim
            from app.services.notification_service import NotificationService
            NotificationService.send(
                user_id=session.host_id,
                title='Ders Otomatik Sonlandırıldı',
                message=f'"{session.title}" dersi süre aşımı nedeniyle otomatik olarak sonlandırıldı.',
                notification_type='live_session_auto_ended',
                data={'session_id': session.id}
            )
            
        except Exception as e:
            print(f"Otomatik bitiş hatası (session {session.id}): {e}")
    
    return {'ended_sessions': ended_count}


@shared_task(name='live_sessions.cleanup_old_sessions')
def cleanup_old_sessions():
    """
    Eski canlı ders kayıtlarını temizle.
    
    6 aydan eski ENDED/CANCELLED oturumları arşivle.
    """
    cutoff_date = datetime.utcnow() - timedelta(days=180)
    
    old_sessions = LiveSession.query.filter(
        LiveSession.status.in_([SessionStatus.ENDED, SessionStatus.CANCELLED]),
        LiveSession.updated_at < cutoff_date,
        LiveSession.is_deleted == False
    ).all()
    
    archived_count = 0
    
    for session in old_sessions:
        try:
            session.is_deleted = True
            session.deleted_at = datetime.utcnow()
            archived_count += 1
        except Exception as e:
            print(f"Arşivleme hatası (session {session.id}): {e}")
    
    db.session.commit()
    
    return {'archived_sessions': archived_count}


@shared_task(name='live_sessions.update_session_stats')
def update_session_stats():
    """
    Aktif oturumların istatistiklerini güncelle.
    
    Katılımcı sayısı, peak katılımcı vb.
    """
    from app.modules.live_classes.models import AttendanceStatus
    
    live_sessions = LiveSession.query.filter(
        LiveSession.status == SessionStatus.LIVE,
        LiveSession.is_deleted == False
    ).all()
    
    for session in live_sessions:
        try:
            session.update_participant_count()
        except Exception as e:
            print(f"İstatistik güncelleme hatası (session {session.id}): {e}")
    
    db.session.commit()
    
    return {'updated_sessions': len(live_sessions)}
