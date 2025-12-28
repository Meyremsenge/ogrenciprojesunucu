"""
Reporting Service - Raporlama Servisi.

Öğrenci, sınıf, kurs ve kurum bazında
detaylı raporlar oluşturur.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
import statistics
import json
import logging

from sqlalchemy import func, and_, or_, text
from flask import current_app

from app.extensions import db
from app.models.question import Question, QuestionAttempt, QuestionType
from app.models.exam import Exam, ExamResult, ExamResultStatus
from app.models.evaluation import StudentProgress, Evaluation
from app.models.course import Course, Topic
from app.models.user import User
from app.services.cache_service import CacheService

logger = logging.getLogger(__name__)


class ReportType(Enum):
    """Rapor tipi."""
    STUDENT_PROGRESS = 'student_progress'
    COURSE_ANALYTICS = 'course_analytics'
    EXAM_ANALYTICS = 'exam_analytics'
    CLASS_PERFORMANCE = 'class_performance'
    QUESTION_ANALYTICS = 'question_analytics'
    ENGAGEMENT_METRICS = 'engagement_metrics'
    INSTITUTION_OVERVIEW = 'institution_overview'


class ReportFormat(Enum):
    """Rapor formatı."""
    JSON = 'json'
    PDF = 'pdf'
    EXCEL = 'excel'
    CSV = 'csv'


@dataclass
class ReportMetadata:
    """Rapor metadata."""
    report_id: str
    report_type: ReportType
    generated_at: datetime
    generated_by: int
    parameters: Dict[str, Any]
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class ReportingService:
    """
    Kapsamlı raporlama servisi.
    
    Çeşitli düzeylerde analitik raporlar oluşturur
    ve export işlevleri sağlar.
    """
    
    # Cache süreleri (saniye)
    CACHE_TTL_SHORT = 300      # 5 dakika
    CACHE_TTL_MEDIUM = 1800    # 30 dakika
    CACHE_TTL_LONG = 3600      # 1 saat
    
    # =========================================================================
    # Student Reports
    # =========================================================================
    
    @classmethod
    def generate_student_report(
        cls,
        student_id: int,
        course_id: int = None,
        start_date: datetime = None,
        end_date: datetime = None,
        include_details: bool = True
    ) -> Dict[str, Any]:
        """
        Öğrenci performans raporu oluşturur.
        
        Args:
            student_id: Öğrenci ID
            course_id: Kurs ID (opsiyonel)
            start_date: Başlangıç tarihi
            end_date: Bitiş tarihi
            include_details: Detaylı veri dahil edilsin mi
        """
        end_date = end_date or datetime.utcnow()
        start_date = start_date or (end_date - timedelta(days=30))
        
        # Cache key
        cache_key = f"report:student:{student_id}:{course_id}:{start_date.date()}:{end_date.date()}"
        cached = CacheService.get(cache_key)
        if cached and not include_details:
            return cached
        
        student = User.query.get(student_id)
        if not student:
            return {'error': 'Student not found'}
        
        report = {
            'student': {
                'id': student.id,
                'full_name': student.full_name,
                'email': student.email
            },
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Soru performansı
        question_stats = cls._get_student_question_stats(
            student_id, course_id, start_date, end_date
        )
        report['questions'] = question_stats
        
        # Sınav performansı
        exam_stats = cls._get_student_exam_stats(
            student_id, course_id, start_date, end_date
        )
        report['exams'] = exam_stats
        
        # İlerleme
        progress = cls._get_student_progress(student_id, course_id)
        report['progress'] = progress
        
        # Aktivite
        activity = cls._get_student_activity(student_id, start_date, end_date)
        report['activity'] = activity
        
        if include_details:
            # Konu detayları
            report['topic_breakdown'] = cls._get_student_topic_breakdown(
                student_id, course_id, start_date, end_date
            )
            
            # Zorluk detayları
            report['difficulty_breakdown'] = cls._get_student_difficulty_breakdown(
                student_id, course_id, start_date, end_date
            )
        
        # Cache
        CacheService.set(cache_key, report, ttl=cls.CACHE_TTL_SHORT)
        
        return report
    
    @classmethod
    def _get_student_question_stats(
        cls,
        student_id: int,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Öğrenci soru istatistikleri."""
        query = QuestionAttempt.query.filter(
            QuestionAttempt.user_id == student_id,
            QuestionAttempt.created_at.between(start_date, end_date)
        )
        
        if course_id:
            query = query.join(Question).join(Topic).filter(Topic.course_id == course_id)
        
        attempts = query.all()
        
        if not attempts:
            return {
                'total_attempted': 0,
                'correct': 0,
                'wrong': 0,
                'success_rate': 0,
                'total_points': 0,
                'average_time': 0
            }
        
        correct = sum(1 for a in attempts if a.is_correct)
        points = sum(a.points_earned or 0 for a in attempts)
        times = [a.time_spent_seconds for a in attempts if a.time_spent_seconds]
        
        return {
            'total_attempted': len(attempts),
            'correct': correct,
            'wrong': len(attempts) - correct,
            'success_rate': round(correct / len(attempts) * 100, 1),
            'total_points': points,
            'average_time': round(statistics.mean(times), 1) if times else 0
        }
    
    @classmethod
    def _get_student_exam_stats(
        cls,
        student_id: int,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Öğrenci sınav istatistikleri."""
        query = ExamResult.query.filter(
            ExamResult.user_id == student_id,
            ExamResult.status.in_([
                ExamResultStatus.SUBMITTED.value,
                ExamResultStatus.GRADED.value
            ]),
            ExamResult.created_at.between(start_date, end_date)
        )
        
        if course_id:
            query = query.join(Exam).join(Topic).filter(Topic.course_id == course_id)
        
        results = query.all()
        
        if not results:
            return {
                'total_exams': 0,
                'passed': 0,
                'failed': 0,
                'pass_rate': 0,
                'average_score': 0,
                'best_score': 0,
                'worst_score': 0
            }
        
        scores = [
            (r.score / r.max_score * 100) if r.max_score > 0 else 0
            for r in results
        ]
        passed = sum(1 for r in results if r.is_passed)
        
        return {
            'total_exams': len(results),
            'passed': passed,
            'failed': len(results) - passed,
            'pass_rate': round(passed / len(results) * 100, 1),
            'average_score': round(statistics.mean(scores), 1),
            'best_score': round(max(scores), 1),
            'worst_score': round(min(scores), 1)
        }
    
    @classmethod
    def _get_student_progress(
        cls,
        student_id: int,
        course_id: int
    ) -> Dict[str, Any]:
        """Öğrenci ilerleme durumu."""
        if course_id:
            progress = StudentProgress.query.filter_by(
                user_id=student_id,
                course_id=course_id
            ).first()
            
            if progress:
                return {
                    'videos_completed': progress.videos_completed,
                    'videos_total': progress.videos_total,
                    'video_completion': round(progress.video_completion_percent, 1),
                    'exams_passed': progress.exams_passed,
                    'exams_total': progress.exams_total,
                    'total_points': progress.total_points,
                    'streak_days': progress.streak_days
                }
        
        # Genel ilerleme
        all_progress = StudentProgress.query.filter_by(user_id=student_id).all()
        
        if not all_progress:
            return {}
        
        return {
            'courses_enrolled': len(all_progress),
            'total_videos_completed': sum(p.videos_completed for p in all_progress),
            'total_exams_passed': sum(p.exams_passed for p in all_progress),
            'total_points': sum(p.total_points for p in all_progress),
            'max_streak_days': max(p.streak_days for p in all_progress)
        }
    
    @classmethod
    def _get_student_activity(
        cls,
        student_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Öğrenci aktivite özeti."""
        # Günlük aktivite
        daily_activity = db.session.query(
            func.date(QuestionAttempt.created_at).label('date'),
            func.count().label('count')
        ).filter(
            QuestionAttempt.user_id == student_id,
            QuestionAttempt.created_at.between(start_date, end_date)
        ).group_by(
            func.date(QuestionAttempt.created_at)
        ).all()
        
        active_days = len(daily_activity)
        total_days = (end_date - start_date).days + 1
        
        # Hafta içi/sonu dağılımı
        weekday_count = sum(1 for d, _ in daily_activity if d.weekday() < 5)
        weekend_count = active_days - weekday_count
        
        return {
            'active_days': active_days,
            'total_days': total_days,
            'engagement_rate': round(active_days / total_days * 100, 1) if total_days > 0 else 0,
            'weekday_active_days': weekday_count,
            'weekend_active_days': weekend_count,
            'daily_breakdown': {
                str(d): c for d, c in daily_activity
            }
        }
    
    @classmethod
    def _get_student_topic_breakdown(
        cls,
        student_id: int,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """Konu bazlı breakdown."""
        query = db.session.query(
            Topic.id,
            Topic.title,
            func.count(QuestionAttempt.id).label('attempted'),
            func.sum(func.cast(QuestionAttempt.is_correct, db.Integer)).label('correct')
        ).join(Question, Question.topic_id == Topic.id).join(
            QuestionAttempt, QuestionAttempt.question_id == Question.id
        ).filter(
            QuestionAttempt.user_id == student_id,
            QuestionAttempt.created_at.between(start_date, end_date)
        )
        
        if course_id:
            query = query.filter(Topic.course_id == course_id)
        
        results = query.group_by(Topic.id, Topic.title).all()
        
        return [
            {
                'topic_id': r.id,
                'topic_title': r.title,
                'attempted': r.attempted,
                'correct': r.correct or 0,
                'success_rate': round((r.correct or 0) / r.attempted * 100, 1) if r.attempted > 0 else 0
            }
            for r in results
        ]
    
    @classmethod
    def _get_student_difficulty_breakdown(
        cls,
        student_id: int,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Dict]:
        """Zorluk bazlı breakdown."""
        query = db.session.query(
            Question.difficulty,
            func.count(QuestionAttempt.id).label('attempted'),
            func.sum(func.cast(QuestionAttempt.is_correct, db.Integer)).label('correct')
        ).join(
            QuestionAttempt, QuestionAttempt.question_id == Question.id
        ).filter(
            QuestionAttempt.user_id == student_id,
            QuestionAttempt.created_at.between(start_date, end_date)
        )
        
        if course_id:
            query = query.join(Topic).filter(Topic.course_id == course_id)
        
        results = query.group_by(Question.difficulty).all()
        
        return {
            r.difficulty or 'medium': {
                'attempted': r.attempted,
                'correct': r.correct or 0,
                'success_rate': round((r.correct or 0) / r.attempted * 100, 1) if r.attempted > 0 else 0
            }
            for r in results
        }
    
    # =========================================================================
    # Course Reports
    # =========================================================================
    
    @classmethod
    def generate_course_report(
        cls,
        course_id: int,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> Dict[str, Any]:
        """
        Kurs analitik raporu oluşturur.
        """
        end_date = end_date or datetime.utcnow()
        start_date = start_date or (end_date - timedelta(days=30))
        
        course = Course.query.get(course_id)
        if not course:
            return {'error': 'Course not found'}
        
        report = {
            'course': {
                'id': course.id,
                'title': course.title
            },
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Öğrenci metrikleri
        report['students'] = cls._get_course_student_metrics(course_id, start_date, end_date)
        
        # İçerik metrikleri
        report['content'] = cls._get_course_content_metrics(course_id)
        
        # Soru metrikleri
        report['questions'] = cls._get_course_question_metrics(course_id, start_date, end_date)
        
        # Sınav metrikleri
        report['exams'] = cls._get_course_exam_metrics(course_id, start_date, end_date)
        
        # Topic bazlı performans
        report['topics'] = cls._get_course_topic_metrics(course_id, start_date, end_date)
        
        return report
    
    @classmethod
    def _get_course_student_metrics(
        cls,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Kurs öğrenci metrikleri."""
        # Aktif öğrenciler
        active_students = db.session.query(
            func.count(func.distinct(QuestionAttempt.user_id))
        ).join(Question).join(Topic).filter(
            Topic.course_id == course_id,
            QuestionAttempt.created_at.between(start_date, end_date)
        ).scalar() or 0
        
        # Kayıtlı öğrenciler
        enrolled = StudentProgress.query.filter_by(course_id=course_id).count()
        
        # Tamamlayan öğrenciler (video completion %100)
        completed = StudentProgress.query.filter(
            StudentProgress.course_id == course_id,
            StudentProgress.videos_total > 0,
            StudentProgress.videos_completed == StudentProgress.videos_total
        ).count()
        
        return {
            'enrolled': enrolled,
            'active_in_period': active_students,
            'completed_course': completed,
            'completion_rate': round(completed / enrolled * 100, 1) if enrolled > 0 else 0
        }
    
    @classmethod
    def _get_course_content_metrics(cls, course_id: int) -> Dict[str, Any]:
        """Kurs içerik metrikleri."""
        topics = Topic.query.filter_by(course_id=course_id).count()
        questions = Question.query.join(Topic).filter(
            Topic.course_id == course_id,
            Question.is_published == True
        ).count()
        exams = Exam.query.join(Topic).filter(
            Topic.course_id == course_id,
            Exam.is_published == True
        ).count()
        
        return {
            'total_topics': topics,
            'total_questions': questions,
            'total_exams': exams
        }
    
    @classmethod
    def _get_course_question_metrics(
        cls,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Kurs soru metrikleri."""
        stats = db.session.query(
            func.count(QuestionAttempt.id).label('total'),
            func.sum(func.cast(QuestionAttempt.is_correct, db.Integer)).label('correct')
        ).join(Question).join(Topic).filter(
            Topic.course_id == course_id,
            QuestionAttempt.created_at.between(start_date, end_date)
        ).first()
        
        total = stats.total or 0
        correct = stats.correct or 0
        
        # En zor sorular
        hardest = db.session.query(
            Question.id,
            Question.question_text,
            func.count(QuestionAttempt.id).label('attempts'),
            func.sum(func.cast(QuestionAttempt.is_correct, db.Integer)).label('correct')
        ).join(QuestionAttempt).join(Topic).filter(
            Topic.course_id == course_id,
            QuestionAttempt.created_at.between(start_date, end_date)
        ).group_by(Question.id).having(
            func.count(QuestionAttempt.id) >= 5
        ).order_by(
            (func.sum(func.cast(QuestionAttempt.is_correct, db.Integer)) / 
             func.count(QuestionAttempt.id)).asc()
        ).limit(5).all()
        
        return {
            'total_attempts': total,
            'correct_attempts': correct,
            'success_rate': round(correct / total * 100, 1) if total > 0 else 0,
            'hardest_questions': [
                {
                    'id': q.id,
                    'text': q.question_text[:50],
                    'attempts': q.attempts,
                    'success_rate': round((q.correct or 0) / q.attempts * 100, 1)
                }
                for q in hardest
            ]
        }
    
    @classmethod
    def _get_course_exam_metrics(
        cls,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Kurs sınav metrikleri."""
        results = ExamResult.query.join(Exam).join(Topic).filter(
            Topic.course_id == course_id,
            ExamResult.status.in_([
                ExamResultStatus.SUBMITTED.value,
                ExamResultStatus.GRADED.value
            ]),
            ExamResult.created_at.between(start_date, end_date)
        ).all()
        
        if not results:
            return {
                'total_attempts': 0,
                'passed': 0,
                'pass_rate': 0,
                'average_score': 0
            }
        
        scores = [
            (r.score / r.max_score * 100) if r.max_score > 0 else 0
            for r in results
        ]
        passed = sum(1 for r in results if r.is_passed)
        
        return {
            'total_attempts': len(results),
            'passed': passed,
            'pass_rate': round(passed / len(results) * 100, 1),
            'average_score': round(statistics.mean(scores), 1)
        }
    
    @classmethod
    def _get_course_topic_metrics(
        cls,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """Kurs konu metrikleri."""
        topics = Topic.query.filter_by(course_id=course_id).all()
        
        result = []
        for topic in topics:
            stats = db.session.query(
                func.count(QuestionAttempt.id).label('attempts'),
                func.sum(func.cast(QuestionAttempt.is_correct, db.Integer)).label('correct'),
                func.count(func.distinct(QuestionAttempt.user_id)).label('students')
            ).join(Question).filter(
                Question.topic_id == topic.id,
                QuestionAttempt.created_at.between(start_date, end_date)
            ).first()
            
            result.append({
                'topic_id': topic.id,
                'topic_title': topic.title,
                'attempts': stats.attempts or 0,
                'correct': stats.correct or 0,
                'success_rate': round((stats.correct or 0) / stats.attempts * 100, 1) if stats.attempts else 0,
                'active_students': stats.students or 0
            })
        
        return result
    
    # =========================================================================
    # Exam Analytics
    # =========================================================================
    
    @classmethod
    def generate_exam_analytics(
        cls,
        exam_id: int
    ) -> Dict[str, Any]:
        """
        Sınav detaylı analitik raporu.
        """
        exam = Exam.query.get(exam_id)
        if not exam:
            return {'error': 'Exam not found'}
        
        results = ExamResult.query.filter(
            ExamResult.exam_id == exam_id,
            ExamResult.status.in_([
                ExamResultStatus.SUBMITTED.value,
                ExamResultStatus.GRADED.value
            ])
        ).all()
        
        report = {
            'exam': {
                'id': exam.id,
                'title': exam.title,
                'duration_minutes': exam.duration_minutes,
                'passing_score': exam.passing_score,
                'total_questions': exam.questions_count
            },
            'generated_at': datetime.utcnow().isoformat()
        }
        
        if not results:
            report['summary'] = {'total_attempts': 0}
            return report
        
        scores = [
            (r.score / r.max_score * 100) if r.max_score > 0 else 0
            for r in results
        ]
        times = [r.time_spent_seconds for r in results if r.time_spent_seconds]
        
        # Özet
        report['summary'] = {
            'total_attempts': len(results),
            'unique_students': len(set(r.user_id for r in results)),
            'passed': sum(1 for r in results if r.is_passed),
            'failed': sum(1 for r in results if not r.is_passed),
            'pass_rate': round(sum(1 for r in results if r.is_passed) / len(results) * 100, 1)
        }
        
        # Skor dağılımı
        report['score_distribution'] = cls._get_score_distribution(scores)
        
        # Süre analizi
        report['time_analysis'] = {
            'average_time': round(statistics.mean(times), 1) if times else 0,
            'min_time': min(times) if times else 0,
            'max_time': max(times) if times else 0,
            'median_time': round(statistics.median(times), 1) if times else 0
        }
        
        # Soru analizi
        report['question_analysis'] = cls._get_exam_question_analysis(exam_id)
        
        return report
    
    @classmethod
    def _get_score_distribution(cls, scores: List[float]) -> Dict[str, int]:
        """Skor dağılımı (histogram)."""
        distribution = {
            '0-20': 0,
            '21-40': 0,
            '41-60': 0,
            '61-80': 0,
            '81-100': 0
        }
        
        for score in scores:
            if score <= 20:
                distribution['0-20'] += 1
            elif score <= 40:
                distribution['21-40'] += 1
            elif score <= 60:
                distribution['41-60'] += 1
            elif score <= 80:
                distribution['61-80'] += 1
            else:
                distribution['81-100'] += 1
        
        return distribution
    
    @classmethod
    def _get_exam_question_analysis(cls, exam_id: int) -> List[Dict]:
        """Sınav soru analizi."""
        from app.models.exam import ExamAnswer, ExamQuestion
        
        exam_questions = ExamQuestion.query.filter_by(exam_id=exam_id).all()
        
        result = []
        for eq in exam_questions:
            answers = ExamAnswer.query.filter_by(question_id=eq.question_id).join(
                ExamResult
            ).filter(
                ExamResult.exam_id == exam_id,
                ExamResult.status.in_([
                    ExamResultStatus.SUBMITTED.value,
                    ExamResultStatus.GRADED.value
                ])
            ).all()
            
            total = len(answers)
            correct = sum(1 for a in answers if a.is_correct)
            
            result.append({
                'question_id': eq.question_id,
                'order': eq.order_index,
                'points': eq.effective_points,
                'attempts': total,
                'correct': correct,
                'success_rate': round(correct / total * 100, 1) if total > 0 else 0,
                'discrimination': cls._calculate_discrimination_index(answers) if total >= 10 else None
            })
        
        return result
    
    @classmethod
    def _calculate_discrimination_index(cls, answers) -> float:
        """
        Ayırt edicilik indeksi hesaplar.
        Yüksek performanslı ve düşük performanslı gruplar arasındaki fark.
        """
        # ExamResult'ları skora göre sırala
        results_with_answers = [
            (a, a.exam_result.score / a.exam_result.max_score if a.exam_result.max_score > 0 else 0)
            for a in answers
        ]
        results_with_answers.sort(key=lambda x: x[1], reverse=True)
        
        n = len(results_with_answers)
        if n < 10:
            return 0
        
        top_27 = int(n * 0.27) or 1
        bottom_27 = int(n * 0.27) or 1
        
        top_correct = sum(1 for a, _ in results_with_answers[:top_27] if a.is_correct)
        bottom_correct = sum(1 for a, _ in results_with_answers[-bottom_27:] if a.is_correct)
        
        discrimination = (top_correct / top_27) - (bottom_correct / bottom_27)
        
        return round(discrimination, 2)
    
    # =========================================================================
    # Institution Overview
    # =========================================================================
    
    @classmethod
    def generate_institution_overview(
        cls,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> Dict[str, Any]:
        """
        Kurum genel görünüm raporu.
        """
        end_date = end_date or datetime.utcnow()
        start_date = start_date or (end_date - timedelta(days=30))
        
        report = {
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Kullanıcı metrikleri
        report['users'] = {
            'total_students': User.query.filter_by(role='student', is_active=True).count(),
            'total_teachers': User.query.filter_by(role='teacher', is_active=True).count(),
            'active_in_period': db.session.query(
                func.count(func.distinct(QuestionAttempt.user_id))
            ).filter(
                QuestionAttempt.created_at.between(start_date, end_date)
            ).scalar() or 0
        }
        
        # Kurs metrikleri
        report['courses'] = {
            'total_courses': Course.query.filter_by(is_published=True).count(),
            'total_enrollments': StudentProgress.query.count()
        }
        
        # Aktivite metrikleri
        report['activity'] = {
            'total_question_attempts': QuestionAttempt.query.filter(
                QuestionAttempt.created_at.between(start_date, end_date)
            ).count(),
            'total_exam_attempts': ExamResult.query.filter(
                ExamResult.created_at.between(start_date, end_date)
            ).count()
        }
        
        # Performans metrikleri
        question_stats = db.session.query(
            func.count(QuestionAttempt.id).label('total'),
            func.sum(func.cast(QuestionAttempt.is_correct, db.Integer)).label('correct')
        ).filter(
            QuestionAttempt.created_at.between(start_date, end_date)
        ).first()
        
        exam_stats = db.session.query(
            func.count(ExamResult.id).label('total'),
            func.sum(func.cast(ExamResult.is_passed, db.Integer)).label('passed')
        ).filter(
            ExamResult.status.in_([
                ExamResultStatus.SUBMITTED.value,
                ExamResultStatus.GRADED.value
            ]),
            ExamResult.created_at.between(start_date, end_date)
        ).first()
        
        report['performance'] = {
            'question_success_rate': round(
                (question_stats.correct or 0) / question_stats.total * 100, 1
            ) if question_stats.total else 0,
            'exam_pass_rate': round(
                (exam_stats.passed or 0) / exam_stats.total * 100, 1
            ) if exam_stats.total else 0
        }
        
        # En aktif kurslar
        report['top_courses'] = cls._get_top_courses(start_date, end_date)
        
        return report
    
    @classmethod
    def _get_top_courses(
        cls,
        start_date: datetime,
        end_date: datetime,
        limit: int = 5
    ) -> List[Dict]:
        """En aktif kursları döner."""
        results = db.session.query(
            Course.id,
            Course.title,
            func.count(QuestionAttempt.id).label('activity')
        ).join(Topic, Topic.course_id == Course.id).join(
            Question, Question.topic_id == Topic.id
        ).join(
            QuestionAttempt, QuestionAttempt.question_id == Question.id
        ).filter(
            QuestionAttempt.created_at.between(start_date, end_date)
        ).group_by(Course.id, Course.title).order_by(
            func.count(QuestionAttempt.id).desc()
        ).limit(limit).all()
        
        return [
            {'course_id': r.id, 'title': r.title, 'activity_count': r.activity}
            for r in results
        ]
    
    # =========================================================================
    # Export Functions
    # =========================================================================
    
    @classmethod
    def export_report(
        cls,
        report_data: Dict[str, Any],
        format: ReportFormat = ReportFormat.JSON
    ) -> bytes:
        """
        Raporu belirtilen formatta export eder.
        """
        if format == ReportFormat.JSON:
            return json.dumps(report_data, indent=2, default=str).encode('utf-8')
        
        elif format == ReportFormat.CSV:
            return cls._export_as_csv(report_data)
        
        elif format == ReportFormat.EXCEL:
            return cls._export_as_excel(report_data)
        
        elif format == ReportFormat.PDF:
            return cls._export_as_pdf(report_data)
        
        return b''
    
    @classmethod
    def _export_as_csv(cls, data: Dict) -> bytes:
        """CSV formatında export."""
        import csv
        import io
        
        output = io.StringIO()
        
        # Basit flat yapı için
        if 'questions' in data:
            writer = csv.DictWriter(output, fieldnames=data['questions'].keys())
            writer.writeheader()
            writer.writerow(data['questions'])
        
        return output.getvalue().encode('utf-8')
    
    @classmethod
    def _export_as_excel(cls, data: Dict) -> bytes:
        """Excel formatında export (placeholder)."""
        # openpyxl gerektirir
        return json.dumps(data, indent=2, default=str).encode('utf-8')
    
    @classmethod
    def _export_as_pdf(cls, data: Dict) -> bytes:
        """PDF formatında export (placeholder)."""
        # reportlab veya weasyprint gerektirir
        return json.dumps(data, indent=2, default=str).encode('utf-8')
