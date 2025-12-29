"""
Course, Category, Topic, and Enrollment models.
"""

from datetime import datetime
from enum import Enum
from app.extensions import db


class EnrollmentStatus(Enum):
    """Enrollment status enum."""
    ACTIVE = 'active'
    COMPLETED = 'completed'
    SUSPENDED = 'suspended'
    CANCELLED = 'cancelled'


class Category(db.Model):
    """Category model for course categorization."""
    
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    icon = db.Column(db.String(50))  # Icon class or emoji
    parent_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    order_index = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    parent = db.relationship('Category', remote_side=[id], backref='subcategories')
    courses = db.relationship('Course', back_populates='category', lazy='dynamic')
    
    def __repr__(self):
        return f'<Category {self.name}>'


class Course(db.Model):
    """Course model."""
    
    __tablename__ = 'courses'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    short_description = db.Column(db.String(500))
    thumbnail_url = db.Column(db.String(500))
    
    # Pricing
    price = db.Column(db.Numeric(10, 2), default=0)
    currency = db.Column(db.String(3), default='TRY')
    is_free = db.Column(db.Boolean, default=False)
    
    # Status
    is_published = db.Column(db.Boolean, default=False, index=True)
    is_featured = db.Column(db.Boolean, default=False)
    
    # SEO
    slug = db.Column(db.String(250), unique=True)
    meta_title = db.Column(db.String(200))
    meta_description = db.Column(db.String(500))
    
    # Statistics (denormalized for performance)
    total_students = db.Column(db.Integer, default=0)
    total_videos = db.Column(db.Integer, default=0)
    total_duration_minutes = db.Column(db.Integer, default=0)
    average_rating = db.Column(db.Numeric(3, 2), default=0)
    
    # Relations
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = db.Column(db.DateTime)
    
    # Relationships
    teacher = db.relationship('User', back_populates='courses_teaching')
    category = db.relationship('Category', back_populates='courses')
    topics = db.relationship('Topic', back_populates='course', lazy='dynamic',
                              order_by='Topic.order_index', cascade='all, delete-orphan')
    enrollments = db.relationship('Enrollment', back_populates='course', lazy='dynamic',
                                   cascade='all, delete-orphan')
    evaluations = db.relationship('Evaluation', back_populates='course', lazy='dynamic')
    student_progress = db.relationship('StudentProgress', back_populates='course', lazy='dynamic')
    
    def __repr__(self):
        return f'<Course {self.title}>'
    
    def publish(self):
        """Publish the course."""
        self.is_published = True
        self.published_at = datetime.utcnow()
    
    def unpublish(self):
        """Unpublish the course."""
        self.is_published = False
    
    def update_statistics(self):
        """Update denormalized statistics."""
        self.total_students = self.enrollments.filter_by(
            status=EnrollmentStatus.ACTIVE.value
        ).count()
        
        # Count videos and total duration
        total_videos = 0
        total_duration = 0
        for topic in self.topics:
            for video in topic.videos:
                total_videos += 1
                total_duration += video.duration_seconds or 0
        
        self.total_videos = total_videos
        self.total_duration_minutes = total_duration // 60
    
    def to_dict(self, include_topics=False):
        """Convert course to dictionary."""
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'short_description': self.short_description,
            'thumbnail_url': self.thumbnail_url,
            'price': float(self.price) if self.price else 0,
            'currency': self.currency,
            'is_free': self.is_free,
            'is_published': self.is_published,
            'is_featured': self.is_featured,
            'slug': self.slug,
            'total_students': self.total_students,
            'total_videos': self.total_videos,
            'total_duration_minutes': self.total_duration_minutes,
            'average_rating': float(self.average_rating) if self.average_rating else 0,
            'teacher': {
                'id': self.teacher.id,
                'full_name': self.teacher.full_name,
                'avatar_url': self.teacher.avatar_url
            } if self.teacher else None,
            'category': {
                'id': self.category.id,
                'name': self.category.name
            } if self.category else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        
        if include_topics:
            data['topics'] = [topic.to_dict() for topic in self.topics]
        
        return data


class Topic(db.Model):
    """Topic model (course sections/chapters)."""
    
    __tablename__ = 'topics'
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    order_index = db.Column(db.Integer, default=0)
    is_published = db.Column(db.Boolean, default=False)
    is_free_preview = db.Column(db.Boolean, default=False)  # Free preview for non-enrolled students
    
    # Statistics
    total_videos = db.Column(db.Integer, default=0)
    total_questions = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = db.relationship('Course', back_populates='topics')
    videos = db.relationship('Video', back_populates='topic', lazy='dynamic',
                              order_by='Video.order', cascade='all, delete-orphan')
    # exams relationship is defined via backref in Exam model
    student_progress = db.relationship('StudentProgress', back_populates='topic', lazy='dynamic')
    
    def __repr__(self):
        return f'<Topic {self.title}>'
    
    def to_dict(self, include_content=False):
        """Convert topic to dictionary."""
        data = {
            'id': self.id,
            'course_id': self.course_id,
            'title': self.title,
            'description': self.description,
            'order_index': self.order_index,
            'is_published': self.is_published,
            'is_free_preview': self.is_free_preview,
            'total_videos': self.total_videos,
            'total_questions': self.total_questions,
        }
        
        if include_content:
            data['videos'] = [video.to_dict() for video in self.videos]
            data['questions_count'] = self.questions.count()
            data['exams_count'] = self.exams.count()
        
        return data


class Enrollment(db.Model):
    """Enrollment model for student-course relationship."""
    
    __tablename__ = 'enrollments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    
    # Status
    status = db.Column(db.String(20), default=EnrollmentStatus.ACTIVE.value)
    
    # Progress
    progress_percent = db.Column(db.Numeric(5, 2), default=0)
    last_accessed_at = db.Column(db.DateTime)
    
    # Payment info
    payment_id = db.Column(db.String(100))  # External payment reference
    amount_paid = db.Column(db.Numeric(10, 2))
    
    # Timestamps
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)  # For subscription-based access
    
    # Relationships
    student = db.relationship('User', back_populates='enrollments')
    course = db.relationship('Course', back_populates='enrollments')
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('user_id', 'course_id', name='unique_enrollment'),
    )
    
    def __repr__(self):
        return f'<Enrollment User:{self.user_id} Course:{self.course_id}>'
    
    def update_progress(self):
        """Calculate and update progress percentage."""
        from app.models.content import VideoProgress
        
        total_videos = 0
        completed_videos = 0
        
        for topic in self.course.topics:
            for video in topic.videos:
                total_videos += 1
                progress = VideoProgress.query.filter_by(
                    user_id=self.user_id,
                    video_id=video.id,
                    is_completed=True
                ).first()
                if progress:
                    completed_videos += 1
        
        if total_videos > 0:
            self.progress_percent = (completed_videos / total_videos) * 100
        else:
            self.progress_percent = 0
        
        if self.progress_percent >= 100:
            self.mark_completed()
    
    def mark_completed(self):
        """Mark enrollment as completed."""
        self.status = EnrollmentStatus.COMPLETED.value
        self.completed_at = datetime.utcnow()
        self.progress_percent = 100
    
    def to_dict(self):
        """Convert enrollment to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'course_id': self.course_id,
            'course': {
                'id': self.course.id,
                'title': self.course.title,
                'thumbnail_url': self.course.thumbnail_url
            } if self.course else None,
            'status': self.status,
            'progress_percent': float(self.progress_percent) if self.progress_percent else 0,
            'enrolled_at': self.enrolled_at.isoformat() if self.enrolled_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'last_accessed_at': self.last_accessed_at.isoformat() if self.last_accessed_at else None,
        }
