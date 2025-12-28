"""
Evaluation and StudentProgress models.
"""

from datetime import datetime
from app.extensions import db


class Evaluation(db.Model):
    """Teacher evaluation of student model."""
    
    __tablename__ = 'evaluations'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'))
    
    # Rating
    rating = db.Column(db.Integer)  # 1-5 scale
    
    # Feedback
    feedback = db.Column(db.Text)
    strengths = db.Column(db.JSON)  # List of strength areas
    improvements = db.Column(db.JSON)  # List of areas to improve
    goals = db.Column(db.JSON)  # Recommended goals
    
    # Performance metrics (at time of evaluation)
    performance_data = db.Column(db.JSON)  # Snapshot of performance metrics
    
    # Visibility
    is_visible_to_student = db.Column(db.Boolean, default=True)
    
    # Timestamps
    evaluation_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = db.relationship('User', back_populates='evaluations_received',
                               foreign_keys=[student_id])
    teacher = db.relationship('User', back_populates='evaluations_given',
                               foreign_keys=[teacher_id])
    course = db.relationship('Course', back_populates='evaluations')
    
    def __repr__(self):
        return f'<Evaluation Student:{self.student_id} by Teacher:{self.teacher_id}>'
    
    def to_dict(self, include_performance=False):
        """Convert to dictionary."""
        data = {
            'id': self.id,
            'student': {
                'id': self.student.id,
                'full_name': self.student.full_name
            } if self.student else None,
            'teacher': {
                'id': self.teacher.id,
                'full_name': self.teacher.full_name
            } if self.teacher else None,
            'course': {
                'id': self.course.id,
                'title': self.course.title
            } if self.course else None,
            'rating': self.rating,
            'feedback': self.feedback,
            'strengths': self.strengths or [],
            'improvements': self.improvements or [],
            'goals': self.goals or [],
            'is_visible_to_student': self.is_visible_to_student,
            'evaluation_date': self.evaluation_date.isoformat() if self.evaluation_date else None,
        }
        
        if include_performance:
            data['performance_data'] = self.performance_data
        
        return data


class StudentProgress(db.Model):
    """Student progress tracking model."""
    
    __tablename__ = 'student_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    topic_id = db.Column(db.Integer, db.ForeignKey('topics.id', ondelete='CASCADE'))
    
    # Video progress
    videos_total = db.Column(db.Integer, default=0)
    videos_completed = db.Column(db.Integer, default=0)
    total_watch_time_seconds = db.Column(db.Integer, default=0)
    
    # Question progress
    questions_total = db.Column(db.Integer, default=0)
    questions_attempted = db.Column(db.Integer, default=0)
    questions_correct = db.Column(db.Integer, default=0)
    
    # Exam progress
    exams_total = db.Column(db.Integer, default=0)
    exams_attempted = db.Column(db.Integer, default=0)
    exams_passed = db.Column(db.Integer, default=0)
    best_exam_score = db.Column(db.Numeric(5, 2), default=0)
    average_exam_score = db.Column(db.Numeric(5, 2), default=0)
    
    # Points
    total_points = db.Column(db.Integer, default=0)
    
    # Activity tracking
    last_activity_at = db.Column(db.DateTime)
    streak_days = db.Column(db.Integer, default=0)
    last_streak_date = db.Column(db.Date)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='student_progress')
    course = db.relationship('Course', back_populates='student_progress')
    topic = db.relationship('Topic', back_populates='student_progress')
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('user_id', 'course_id', 'topic_id', name='unique_student_topic_progress'),
    )
    
    def __repr__(self):
        return f'<StudentProgress User:{self.user_id} Course:{self.course_id}>'
    
    @property
    def video_completion_percent(self):
        """Get video completion percentage."""
        if self.videos_total == 0:
            return 0
        return (self.videos_completed / self.videos_total) * 100
    
    @property
    def question_success_rate(self):
        """Get question success rate."""
        if self.questions_attempted == 0:
            return 0
        return (self.questions_correct / self.questions_attempted) * 100
    
    @property
    def exam_pass_rate(self):
        """Get exam pass rate."""
        if self.exams_attempted == 0:
            return 0
        return (self.exams_passed / self.exams_attempted) * 100
    
    @property
    def overall_progress_percent(self):
        """Calculate overall progress percentage."""
        # Weight: Videos 40%, Questions 30%, Exams 30%
        video_weight = 0.4
        question_weight = 0.3
        exam_weight = 0.3
        
        video_progress = self.video_completion_percent * video_weight
        question_progress = min(100, (self.questions_attempted / max(1, self.questions_total)) * 100) * question_weight
        exam_progress = min(100, (self.exams_attempted / max(1, self.exams_total)) * 100) * exam_weight
        
        return video_progress + question_progress + exam_progress
    
    def update_activity(self):
        """Update activity tracking and streak."""
        from datetime import date
        
        today = date.today()
        self.last_activity_at = datetime.utcnow()
        
        if self.last_streak_date:
            days_diff = (today - self.last_streak_date).days
            
            if days_diff == 1:
                # Continue streak
                self.streak_days += 1
            elif days_diff > 1:
                # Streak broken
                self.streak_days = 1
            # If days_diff == 0, same day, don't change streak
        else:
            self.streak_days = 1
        
        self.last_streak_date = today
    
    def recalculate(self):
        """Recalculate all progress metrics."""
        from app.models.content import VideoProgress
        from app.models.question import QuestionAttempt
        from app.models.exam import ExamResult, ExamResultStatus
        
        # Get all videos in course/topic
        if self.topic_id:
            videos = self.topic.videos.all()
            questions = self.topic.questions.all()
            exams = self.topic.exams.all()
        else:
            videos = []
            questions = []
            exams = []
            for topic in self.course.topics:
                videos.extend(topic.videos.all())
                questions.extend(topic.questions.all())
                exams.extend(topic.exams.all())
        
        # Video progress
        self.videos_total = len(videos)
        self.videos_completed = VideoProgress.query.filter(
            VideoProgress.user_id == self.user_id,
            VideoProgress.video_id.in_([v.id for v in videos]),
            VideoProgress.is_completed == True
        ).count()
        
        self.total_watch_time_seconds = db.session.query(
            db.func.sum(VideoProgress.watched_seconds)
        ).filter(
            VideoProgress.user_id == self.user_id,
            VideoProgress.video_id.in_([v.id for v in videos])
        ).scalar() or 0
        
        # Question progress
        self.questions_total = len(questions)
        question_ids = [q.id for q in questions]
        
        # Get unique questions attempted
        attempted = db.session.query(QuestionAttempt.question_id).filter(
            QuestionAttempt.user_id == self.user_id,
            QuestionAttempt.question_id.in_(question_ids)
        ).distinct().count()
        self.questions_attempted = attempted
        
        # Get best result for each question (at least one correct)
        correct = db.session.query(QuestionAttempt.question_id).filter(
            QuestionAttempt.user_id == self.user_id,
            QuestionAttempt.question_id.in_(question_ids),
            QuestionAttempt.is_correct == True
        ).distinct().count()
        self.questions_correct = correct
        
        # Exam progress
        self.exams_total = len(exams)
        exam_ids = [e.id for e in exams]
        
        exam_results = ExamResult.query.filter(
            ExamResult.user_id == self.user_id,
            ExamResult.exam_id.in_(exam_ids),
            ExamResult.status.in_([
                ExamResultStatus.SUBMITTED.value,
                ExamResultStatus.GRADED.value
            ])
        ).all()
        
        self.exams_attempted = len(set(r.exam_id for r in exam_results))
        self.exams_passed = len(set(r.exam_id for r in exam_results if r.is_passed))
        
        if exam_results:
            scores = [(r.score / r.max_score * 100) if r.max_score > 0 else 0 for r in exam_results]
            self.best_exam_score = max(scores)
            self.average_exam_score = sum(scores) / len(scores)
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'course_id': self.course_id,
            'topic_id': self.topic_id,
            'videos': {
                'total': self.videos_total,
                'completed': self.videos_completed,
                'completion_percent': round(self.video_completion_percent, 1),
                'total_watch_time_seconds': self.total_watch_time_seconds,
            },
            'questions': {
                'total': self.questions_total,
                'attempted': self.questions_attempted,
                'correct': self.questions_correct,
                'success_rate': round(self.question_success_rate, 1),
            },
            'exams': {
                'total': self.exams_total,
                'attempted': self.exams_attempted,
                'passed': self.exams_passed,
                'pass_rate': round(self.exam_pass_rate, 1),
                'best_score': float(self.best_exam_score) if self.best_exam_score else 0,
                'average_score': float(self.average_exam_score) if self.average_exam_score else 0,
            },
            'overall_progress_percent': round(self.overall_progress_percent, 1),
            'total_points': self.total_points,
            'streak_days': self.streak_days,
            'last_activity_at': self.last_activity_at.isoformat() if self.last_activity_at else None,
        }
