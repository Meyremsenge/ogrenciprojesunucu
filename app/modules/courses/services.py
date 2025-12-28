"""
Courses Module - Services.

Kurs yönetimi iş mantığı.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import joinedload, selectinload

from app.extensions import db
from app.common.base_service import BaseService
from app.core.exceptions import NotFoundError, ConflictError, AuthorizationError, ValidationError
from app.core.pagination import PaginationResult, paginate_query
from app.modules.courses.models import Course, Topic, Enrollment, CourseStatus, EnrollmentStatus


class CourseService(BaseService[Course]):
    """Kurs servisi."""
    
    model = Course
    
    @classmethod
    def query(cls):
        """Sadece silinmemiş kursları döner."""
        return Course.query.filter_by(is_deleted=False)
    
    @classmethod
    def get_paginated(
        cls,
        page: int = 1,
        per_page: int = 20,
        category: str = None,
        level: str = None,
        status: str = None,
        search: str = None,
        teacher_id: int = None
    ) -> PaginationResult:
        """Filtrelenmiş ve sayfalanmış kurs listesi."""
        query = cls.query()
        
        if category:
            query = query.filter(Course.category == category)
        
        if level:
            query = query.filter(Course.level == level)
        
        if status == 'published':
            query = query.filter(Course.is_published == True)
        
        if teacher_id:
            query = query.filter(Course.teacher_id == teacher_id)
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    Course.title.ilike(search_term),
                    Course.description.ilike(search_term)
                )
            )
        
        query = query.order_by(Course.created_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_with_topics(cls, course_id: int) -> Course:
        """Kursu konularıyla birlikte döner (N+1 önlenmiş)."""
        course = Course.query.options(
            joinedload(Course.teacher),
            joinedload(Course.category),
            selectinload(Course.topics).selectinload('videos')
        ).filter_by(id=course_id, is_deleted=False).first()
        
        if not course:
            raise NotFoundError('Kurs', course_id)
        return course
    
    @classmethod
    def create(cls, data: Dict[str, Any]) -> Course:
        """Yeni kurs oluşturur."""
        from slugify import slugify
        
        # Slug oluştur
        base_slug = slugify(data['title'])
        slug = base_slug
        counter = 1
        
        while Course.query.filter_by(slug=slug).first():
            slug = f'{base_slug}-{counter}'
            counter += 1
        
        data['slug'] = slug
        
        course = Course(**data)
        db.session.add(course)
        db.session.commit()
        
        return course
    
    @classmethod
    def update_course(cls, course_id: int, data: Dict[str, Any], user_id: int) -> Course:
        """Kursu günceller."""
        course = cls.get_or_404(course_id)
        
        # Yetki kontrolü
        if course.teacher_id != user_id:
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            if claims.get('role') not in ['admin', 'super_admin']:
                raise AuthorizationError('Bu kursu düzenleme yetkiniz yok')
        
        for key, value in data.items():
            if hasattr(course, key):
                setattr(course, key, value)
        
        db.session.commit()
        return course
    
    @classmethod
    def publish(cls, course_id: int, user_id: int) -> Course:
        """Kursu yayınlar."""
        course = cls.get_or_404(course_id)
        
        # Yetki kontrolü
        if course.teacher_id != user_id:
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            if claims.get('role') not in ['admin', 'super_admin']:
                raise AuthorizationError('Bu kursu yayınlama yetkiniz yok')
        
        # En az bir konu olmalı
        if not course.topics:
            raise ValidationError('Kursta en az bir konu olmalı')
        
        course.publish()
        db.session.commit()
        
        return course
    
    @classmethod
    def get_topics(cls, course_id: int) -> List[Topic]:
        """Kursun konularını döner."""
        course = cls.get_or_404(course_id)
        return course.topics
    
    @classmethod
    def add_topic(cls, course_id: int, data: Dict[str, Any], user_id: int) -> Topic:
        """Kursa konu ekler."""
        course = cls.get_or_404(course_id)
        
        # Yetki kontrolü
        if course.teacher_id != user_id:
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            if claims.get('role') not in ['admin', 'super_admin']:
                raise AuthorizationError('Bu kursa konu ekleme yetkiniz yok')
        
        # Sıra numarası
        max_order = db.session.query(db.func.max(Topic.order)).filter_by(course_id=course_id).scalar() or 0
        data['order'] = max_order + 1
        data['course_id'] = course_id
        
        topic = Topic(**data)
        db.session.add(topic)
        
        # Kurs istatistiklerini güncelle
        course.total_lessons = len(course.topics) + 1
        
        db.session.commit()
        
        return topic


class EnrollmentService(BaseService[Enrollment]):
    """Kayıt servisi."""
    
    model = Enrollment
    
    @classmethod
    def enroll(cls, user_id: int, course_id: int) -> Enrollment:
        """Kullanıcıyı kursa kaydeder."""
        # Kurs kontrolü
        course = Course.query.get(course_id)
        if not course:
            raise NotFoundError('Kurs', course_id)
        
        if not course.is_published:
            raise ValidationError('Bu kurs henüz yayınlanmamış')
        
        # Mevcut kayıt kontrolü
        existing = Enrollment.query.filter_by(
            user_id=user_id,
            course_id=course_id
        ).first()
        
        if existing:
            if existing.status == EnrollmentStatus.ACTIVE.value:
                raise ConflictError('Bu kursa zaten kayıtlısınız')
            # İptal edilmiş kaydı reaktive et
            existing.status = EnrollmentStatus.ACTIVE.value
            existing.last_accessed_at = datetime.utcnow()
            db.session.commit()
            return existing
        
        # Yeni kayıt
        enrollment = Enrollment(
            user_id=user_id,
            course_id=course_id,
            status=EnrollmentStatus.ACTIVE.value,
            last_accessed_at=datetime.utcnow()
        )
        
        db.session.add(enrollment)
        
        # Kurs istatistiklerini güncelle
        course.enrollment_count += 1
        
        db.session.commit()
        
        return enrollment
    
    @classmethod
    def unenroll(cls, user_id: int, course_id: int) -> None:
        """Kullanıcının kurs kaydını iptal eder."""
        enrollment = Enrollment.query.filter_by(
            user_id=user_id,
            course_id=course_id
        ).first()
        
        if not enrollment:
            raise NotFoundError('Kayıt')
        
        enrollment.status = EnrollmentStatus.CANCELLED.value
        
        # Kurs istatistiklerini güncelle
        course = Course.query.get(course_id)
        if course and course.enrollment_count > 0:
            course.enrollment_count -= 1
        
        db.session.commit()
    
    @classmethod
    def get_user_enrollments(
        cls,
        user_id: int,
        page: int = 1,
        per_page: int = 20,
        status: str = None
    ) -> PaginationResult:
        """Kullanıcının kayıtlı olduğu kursları döner."""
        query = Enrollment.query.filter_by(user_id=user_id)
        
        if status:
            query = query.filter(Enrollment.status == status)
        else:
            query = query.filter(Enrollment.status == EnrollmentStatus.ACTIVE.value)
        
        query = query.order_by(Enrollment.last_accessed_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def update_progress(cls, user_id: int, course_id: int, progress: float) -> Enrollment:
        """Kullanıcının kurs ilerlemesini günceller."""
        enrollment = Enrollment.query.filter_by(
            user_id=user_id,
            course_id=course_id,
            status=EnrollmentStatus.ACTIVE.value
        ).first()
        
        if not enrollment:
            raise NotFoundError('Kayıt')
        
        enrollment.progress_percentage = min(100.0, max(0.0, progress))
        enrollment.last_accessed_at = datetime.utcnow()
        
        if enrollment.progress_percentage >= 100:
            enrollment.complete()
        
        db.session.commit()
        
        return enrollment
