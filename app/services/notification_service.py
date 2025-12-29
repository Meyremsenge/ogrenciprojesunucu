"""
Notification Service - Bildirim servisi.

Bu servis uygulama içi bildirimleri yönetir.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.extensions import db

logger = logging.getLogger(__name__)


class NotificationType:
    """Bildirim tipleri."""
    INFO = 'info'
    SUCCESS = 'success'
    WARNING = 'warning'
    ERROR = 'error'
    COURSE = 'course'
    EXAM = 'exam'
    ASSIGNMENT = 'assignment'
    LIVE_SESSION = 'live_session'
    COACHING = 'coaching'


class NotificationService:
    """
    Bildirim servisi.
    
    Uygulama içi ve push bildirimleri yönetir.
    """
    
    @classmethod
    def create_notification(
        cls,
        user_id: int,
        title: str,
        message: str,
        notification_type: str = NotificationType.INFO,
        action_url: str = None,
        data: Dict[str, Any] = None
    ) -> 'Notification':
        """
        Yeni bildirim oluşturur.
        
        Args:
            user_id: Hedef kullanıcı
            title: Bildirim başlığı
            message: Bildirim mesajı
            notification_type: Bildirim tipi
            action_url: Tıklandığında yönlendirilecek URL
            data: Ek veri
        """
        from app.modules.users.models import Notification
        
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url,
            data=data or {}
        )
        
        db.session.add(notification)
        db.session.commit()
        
        # Real-time bildirim gönder (WebSocket)
        cls._send_realtime_notification(user_id, notification.to_dict())
        
        return notification
    
    @classmethod
    def notify_users(
        cls,
        user_ids: List[int],
        title: str,
        message: str,
        notification_type: str = NotificationType.INFO,
        action_url: str = None
    ) -> int:
        """
        Birden fazla kullanıcıya bildirim gönderir.
        
        Returns:
            int: Gönderilen bildirim sayısı
        """
        count = 0
        for user_id in user_ids:
            try:
                cls.create_notification(
                    user_id=user_id,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    action_url=action_url
                )
                count += 1
            except Exception as e:
                logger.error(f'Notification failed for user {user_id}: {str(e)}')
        
        return count
    
    @classmethod
    def notify_course_students(
        cls,
        course_id: int,
        title: str,
        message: str,
        notification_type: str = NotificationType.COURSE,
        action_url: str = None
    ) -> int:
        """Kurstaki tüm öğrencilere bildirim gönderir."""
        from app.modules.courses.models import Enrollment, EnrollmentStatus
        
        enrollments = Enrollment.query.filter_by(
            course_id=course_id,
            status=EnrollmentStatus.ACTIVE
        ).all()
        
        user_ids = [e.user_id for e in enrollments]
        return cls.notify_users(user_ids, title, message, notification_type, action_url)
    
    @classmethod
    def get_user_notifications(
        cls,
        user_id: int,
        unread_only: bool = False,
        limit: int = 20
    ) -> List['Notification']:
        """Kullanıcının bildirimlerini döner."""
        from app.modules.users.models import Notification
        
        query = Notification.query.filter_by(user_id=user_id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        return query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    @classmethod
    def mark_as_read(cls, notification_id: int, user_id: int) -> bool:
        """Bildirimi okundu olarak işaretler."""
        from app.modules.users.models import Notification
        
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=user_id
        ).first()
        
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.session.commit()
            return True
        
        return False
    
    @classmethod
    def mark_all_as_read(cls, user_id: int) -> int:
        """Tüm bildirimleri okundu olarak işaretler."""
        from app.modules.users.models import Notification
        
        count = Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).update({
            'is_read': True,
            'read_at': datetime.utcnow()
        })
        
        db.session.commit()
        return count
    
    @classmethod
    def get_unread_count(cls, user_id: int) -> int:
        """Okunmamış bildirim sayısını döner."""
        from app.modules.users.models import Notification
        
        return Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).count()
    
    @classmethod
    def delete_notification(cls, notification_id: int, user_id: int) -> bool:
        """Bildirimi siler."""
        from app.modules.users.models import Notification
        
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=user_id
        ).first()
        
        if notification:
            db.session.delete(notification)
            db.session.commit()
            return True
        
        return False
    
    @classmethod
    def _send_realtime_notification(cls, user_id: int, notification_data: Dict):
        """WebSocket üzerinden real-time bildirim gönderir."""
        try:
            from flask_socketio import emit
            from app.extensions import socketio
            
            socketio.emit(
                'notification',
                notification_data,
                room=f'user_{user_id}'
            )
        except Exception as e:
            # SocketIO yapılandırılmamış olabilir
            logger.debug(f'Real-time notification skipped: {str(e)}')
    
    # =========================================================================
    # Hazır Bildirim Şablonları
    # =========================================================================
    
    @classmethod
    def notify_exam_available(cls, user_id: int, exam_title: str, exam_id: int):
        """Sınav açıldı bildirimi."""
        return cls.create_notification(
            user_id=user_id,
            title='Yeni Sınav',
            message=f'{exam_title} sınavı erişime açıldı.',
            notification_type=NotificationType.EXAM,
            action_url=f'/exams/{exam_id}'
        )
    
    @classmethod
    def notify_assignment_due(cls, user_id: int, assignment_title: str, due_date: str):
        """Ödev teslim hatırlatması."""
        return cls.create_notification(
            user_id=user_id,
            title='Ödev Teslimi Yaklaşıyor',
            message=f'{assignment_title} ödevi {due_date} tarihinde sona eriyor.',
            notification_type=NotificationType.ASSIGNMENT
        )
    
    @classmethod
    def notify_grade_posted(cls, user_id: int, item_type: str, item_title: str, score: float):
        """Not verildi bildirimi."""
        return cls.create_notification(
            user_id=user_id,
            title='Not Açıklandı',
            message=f'{item_title} için notunuz: {score}',
            notification_type=NotificationType.SUCCESS
        )
    
    @classmethod
    def notify_live_session_starting(cls, user_id: int, session_title: str, session_id: int):
        """Canlı ders başlıyor bildirimi."""
        return cls.create_notification(
            user_id=user_id,
            title='Canlı Ders Başlıyor',
            message=f'{session_title} canlı dersi 15 dakika içinde başlayacak.',
            notification_type=NotificationType.LIVE_SESSION,
            action_url=f'/live-sessions/{session_id}'
        )
