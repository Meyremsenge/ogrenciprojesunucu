"""
Live Classes Module - Services.

Canlı ders iş mantığı.
Gelişmiş erişim kontrolü, tekrarlayan ders ve hatırlatma desteği.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from sqlalchemy import or_, and_

from app.extensions import db
from app.common.base_service import BaseService
from app.core.exceptions import NotFoundError, ValidationError, AuthorizationError, ConflictError
from app.core.pagination import PaginationResult, paginate_query
from app.modules.live_classes.models import (
    LiveSession, SessionAttendance,
    SessionStatus, AttendanceStatus, RecurrenceType
)


class LiveSessionService(BaseService[LiveSession]):
    """Canlı ders servisi."""
    
    model = LiveSession
    
    @classmethod
    def query(cls):
        """Sadece silinmemiş oturumları döner."""
        return LiveSession.query.filter_by(is_deleted=False)
    
    @classmethod
    def get_paginated(
        cls,
        page: int = 1,
        per_page: int = 20,
        course_id: int = None,
        status: str = None,
        upcoming: bool = None
    ) -> PaginationResult:
        """Filtrelenmiş oturum listesi."""
        query = cls.query()
        
        if course_id:
            query = query.filter(LiveSession.course_id == course_id)
        
        if status:
            query = query.filter(LiveSession.status == status)
        
        if upcoming:
            query = query.filter(
                LiveSession.status == SessionStatus.SCHEDULED,
                LiveSession.scheduled_start > datetime.utcnow()
            )
        
        query = query.order_by(LiveSession.scheduled_start.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_with_access(cls, session_id: int, user_id: int) -> Dict[str, Any]:
        """Oturumu erişim bilgisiyle döner."""
        session = cls.get_or_404(session_id)
        
        # Katılım kontrolü
        attendance = SessionAttendance.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()
        
        # Eğitmen veya admin veya kayıtlı ise URL'yi göster
        from flask_jwt_extended import get_jwt
        try:
            claims = get_jwt()
            is_teacher = claims.get('role') in ['teacher', 'admin', 'super_admin']
        except:
            is_teacher = False
        
        include_url = is_teacher or (attendance and session.can_join)
        
        data = session.to_dict(include_url=include_url)
        data['is_registered'] = attendance is not None
        data['attendance'] = attendance.to_dict() if attendance else None
        
        return data
    
    @classmethod
    def create(cls, data: Dict[str, Any]) -> LiveSession:
        """Yeni oturum oluşturur."""
        # Süre hesapla
        if 'scheduled_start' in data and 'duration_minutes' in data:
            data['scheduled_end'] = data['scheduled_start'] + timedelta(
                minutes=data['duration_minutes']
            )
        
        session = LiveSession(**data)
        db.session.add(session)
        db.session.commit()
        return session
    
    @classmethod
    def create_recurring(
        cls,
        data: Dict[str, Any],
        recurrence_type: RecurrenceType,
        recurrence_end_date: datetime,
        user_id: int
    ) -> List[LiveSession]:
        """
        Tekrarlayan oturum serisi oluşturur.
        
        Args:
            data: Oturum verileri
            recurrence_type: Tekrar tipi (daily, weekly, biweekly, monthly)
            recurrence_end_date: Son tekrar tarihi
            user_id: Oluşturan kullanıcı
            
        Returns:
            Oluşturulan oturumların listesi
        """
        if recurrence_type == RecurrenceType.NONE:
            session = cls.create(data)
            return [session]
        
        sessions = []
        start_date = data.get('scheduled_start')
        
        if not start_date:
            raise ValidationError('scheduled_start gerekli')
        
        # İlk oturumu oluştur
        data['host_id'] = user_id
        data['recurrence_type'] = recurrence_type
        data['recurrence_end_date'] = recurrence_end_date
        
        parent_session = cls.create(data)
        sessions.append(parent_session)
        
        # Tekrar aralığını belirle
        delta_map = {
            RecurrenceType.DAILY: timedelta(days=1),
            RecurrenceType.WEEKLY: timedelta(weeks=1),
            RecurrenceType.BIWEEKLY: timedelta(weeks=2),
            RecurrenceType.MONTHLY: timedelta(days=30)  # Yaklaşık
        }
        
        delta = delta_map.get(recurrence_type)
        if not delta:
            return sessions
        
        current_date = start_date + delta
        duration = data.get('duration_minutes', 60)
        
        while current_date <= recurrence_end_date:
            child_data = data.copy()
            child_data['scheduled_start'] = current_date
            child_data['scheduled_end'] = current_date + timedelta(minutes=duration)
            child_data['parent_session_id'] = parent_session.id
            child_data['recurrence_type'] = RecurrenceType.NONE  # Child'lar tekrarsız
            child_data.pop('recurrence_end_date', None)
            
            child_session = LiveSession(**child_data)
            db.session.add(child_session)
            sessions.append(child_session)
            
            current_date += delta
        
        db.session.commit()
        return sessions
    
    @classmethod
    def check_access(cls, session_id: int, user_id: int) -> Dict[str, Any]:
        """
        Kullanıcının oturuma erişim durumunu kontrol et.
        
        Returns:
            Erişim durumu bilgisi
        """
        session = cls.get_or_404(session_id)
        return session.check_user_access(user_id)
    
    @classmethod
    def get_join_info(cls, session_id: int, user_id: int) -> Dict[str, Any]:
        """
        Katılım bilgilerini döner.
        
        Erişim kontrolü yapılır ve link verilir.
        """
        session = cls.get_or_404(session_id)
        access = session.check_user_access(user_id)
        
        if not access['can_access']:
            raise AuthorizationError(access['reason'])
        
        # Kayıt yap
        attendance = SessionAttendance.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()
        
        if not attendance:
            attendance = SessionAttendance(
                session_id=session_id,
                user_id=user_id,
                status=AttendanceStatus.REGISTERED
            )
            db.session.add(attendance)
            db.session.commit()
        
        return {
            'meeting_url': session.meeting_url,
            'meeting_password': session.meeting_password,
            'meeting_id': session.meeting_id,
            'platform': session.platform.value,
            'join_link': session.generate_join_link(user_id),
            'session': session.to_dict(include_url=True),
            'attendance': attendance.to_dict()
        }
    
    @classmethod
    def update_session(cls, session_id: int, data: Dict[str, Any], user_id: int) -> LiveSession:
        """Oturumu günceller."""
        session = cls.get_or_404(session_id)
        
        # Yetki kontrolü
        if session.host_id != user_id:
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            if claims.get('role') not in ['admin', 'super_admin']:
                raise AuthorizationError('Bu oturumu düzenleme yetkiniz yok')
        
        # Başlamış oturum güncellenemez
        if session.status == SessionStatus.LIVE:
            raise ValidationError('Devam eden oturum güncellenemez')
        
        for key, value in data.items():
            if hasattr(session, key) and key not in ['id', 'host_id', 'access_token']:
                setattr(session, key, value)
        
        # Süre hesapla
        if 'scheduled_start' in data or 'duration_minutes' in data:
            session.scheduled_end = session.scheduled_start + timedelta(
                minutes=session.duration_minutes
            )
        
        db.session.commit()
        return session
    
    @classmethod
    def start_session(cls, session_id: int, user_id: int) -> LiveSession:
        """Oturumu başlatır."""
        session = cls.get_or_404(session_id)
        
        # Yetki kontrolü
        if session.host_id != user_id:
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            if claims.get('role') not in ['admin', 'super_admin']:
                raise AuthorizationError('Bu oturumu başlatma yetkiniz yok')
        
        if session.status != SessionStatus.SCHEDULED:
            raise ValidationError('Bu oturum başlatılamaz')
        
        session.start_session()
        db.session.commit()
        
        return session
    
    @classmethod
    def end_session(cls, session_id: int, user_id: int) -> LiveSession:
        """Oturumu bitirir."""
        session = cls.get_or_404(session_id)
        
        # Yetki kontrolü
        if session.host_id != user_id:
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            if claims.get('role') not in ['admin', 'super_admin']:
                raise AuthorizationError('Bu oturumu bitirme yetkiniz yok')
        
        if session.status != SessionStatus.LIVE:
            raise ValidationError('Sadece devam eden oturum bitirilebilir')
        
        # Tüm katılımcıları çıkar
        for attendance in session.attendances:
            if attendance.status == AttendanceStatus.JOINED:
                attendance.leave()
        
        session.end_session()
        db.session.commit()
        
        return session
    
    @classmethod
    def cancel_session(cls, session_id: int, user_id: int):
        """Oturumu iptal eder."""
        session = cls.get_or_404(session_id)
        
        # Yetki kontrolü
        if session.host_id != user_id:
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            if claims.get('role') not in ['admin', 'super_admin']:
                raise AuthorizationError('Bu oturumu iptal etme yetkiniz yok')
        
        if session.status == SessionStatus.LIVE:
            raise ValidationError('Devam eden oturum iptal edilemez')
        
        session.cancel_session()
        db.session.commit()
    
    @classmethod
    def get_upcoming(cls, user_id: int, days: int = 7) -> List[LiveSession]:
        """Yaklaşan oturumları döner."""
        from app.modules.courses.models import Enrollment
        
        now = datetime.utcnow()
        end_date = now + timedelta(days=days)
        
        # Kullanıcının kayıtlı olduğu kursların oturumları
        enrolled_course_ids = db.session.query(Enrollment.course_id).filter(
            Enrollment.user_id == user_id
        ).subquery()
        
        return cls.query().filter(
            LiveSession.course_id.in_(enrolled_course_ids),
            LiveSession.status == SessionStatus.SCHEDULED,
            LiveSession.scheduled_start >= now,
            LiveSession.scheduled_start <= end_date
        ).order_by(LiveSession.scheduled_start.asc()).all()


class AttendanceService(BaseService[SessionAttendance]):
    """Katılım servisi."""
    
    model = SessionAttendance
    
    @classmethod
    def register(cls, session_id: int, user_id: int) -> SessionAttendance:
        """Oturuma kayıt olur."""
        session = LiveSession.query.get(session_id)
        if not session:
            raise NotFoundError('Oturum', session_id)
        
        if session.status == SessionStatus.CANCELLED:
            raise ValidationError('Bu oturum iptal edilmiş')
        
        if session.status == SessionStatus.ENDED:
            raise ValidationError('Bu oturum sona ermiş')
        
        # Mevcut kayıt kontrolü
        existing = SessionAttendance.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()
        
        if existing:
            return existing
        
        # Kapasite kontrolü
        if session.max_participants:
            current_count = SessionAttendance.query.filter_by(
                session_id=session_id
            ).count()
            if current_count >= session.max_participants:
                raise ConflictError('Oturum kapasitesi dolmuş')
        
        attendance = SessionAttendance(
            session_id=session_id,
            user_id=user_id,
            status=AttendanceStatus.REGISTERED
        )
        
        db.session.add(attendance)
        db.session.commit()
        
        return attendance
    
    @classmethod
    def join(cls, session_id: int, user_id: int) -> Dict[str, Any]:
        """Oturuma katılır."""
        session = LiveSession.query.get(session_id)
        if not session:
            raise NotFoundError('Oturum', session_id)
        
        if not session.can_join:
            raise ValidationError('Bu oturuma şu an katılınamaz')
        
        # Kayıt kontrolü
        attendance = SessionAttendance.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()
        
        if not attendance:
            # Otomatik kayıt
            attendance = cls.register(session_id, user_id)
        
        attendance.join()
        
        # Katılımcı sayısını güncelle
        session.participant_count = SessionAttendance.query.filter_by(
            session_id=session_id,
            status=AttendanceStatus.JOINED
        ).count()
        
        db.session.commit()
        
        return {
            'attendance': attendance.to_dict(),
            'meeting_url': session.meeting_url,
            'meeting_password': session.meeting_password
        }
    
    @classmethod
    def leave(cls, session_id: int, user_id: int) -> SessionAttendance:
        """Oturumdan ayrılır."""
        attendance = SessionAttendance.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()
        
        if not attendance:
            raise NotFoundError('Katılım')
        
        if attendance.status != AttendanceStatus.JOINED:
            raise ValidationError('Oturumda değilsiniz')
        
        attendance.leave()
        
        # Katılımcı sayısını güncelle
        session = LiveSession.query.get(session_id)
        if session:
            session.participant_count = SessionAttendance.query.filter_by(
                session_id=session_id,
                status=AttendanceStatus.JOINED
            ).count()
        
        db.session.commit()
        
        return attendance
    
    @classmethod
    def get_by_session(
        cls,
        session_id: int,
        page: int = 1,
        per_page: int = 50
    ) -> PaginationResult:
        """Oturumun katılımcılarını döner."""
        query = SessionAttendance.query.filter_by(
            session_id=session_id
        ).order_by(SessionAttendance.joined_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_user_sessions(
        cls,
        user_id: int,
        page: int = 1,
        per_page: int = 20
    ) -> PaginationResult:
        """Kullanıcının kayıtlı olduğu oturumları döner."""
        query = SessionAttendance.query.filter_by(
            user_id=user_id
        ).order_by(SessionAttendance.registered_at.desc())
        
        return paginate_query(query, page, per_page)
