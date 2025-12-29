"""
Performance Analytics Service - Öğrenci Performans Analizi.

Öğrenci performansının çok boyutlu analizi,
güçlü/zayıf yön tespiti ve kişiselleştirilmiş öneriler.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import statistics
import logging

from sqlalchemy import func, and_, or_
from app.extensions import db
from app.models.question import Question, QuestionAttempt, QuestionType, DifficultyLevel
from app.models.exam import Exam, ExamResult, ExamResultStatus
from app.models.evaluation import StudentProgress
from app.models.course import Topic

logger = logging.getLogger(__name__)


class PerformanceLevel(Enum):
    """Performans seviyesi."""
    EXCELLENT = 'excellent'      # %90+
    GOOD = 'good'                # %75-89
    AVERAGE = 'average'          # %50-74
    BELOW_AVERAGE = 'below_average'  # %30-49
    NEEDS_IMPROVEMENT = 'needs_improvement'  # %0-29
    
    @classmethod
    def from_score(cls, score_percent: float) -> 'PerformanceLevel':
        if score_percent >= 90:
            return cls.EXCELLENT
        elif score_percent >= 75:
            return cls.GOOD
        elif score_percent >= 50:
            return cls.AVERAGE
        elif score_percent >= 30:
            return cls.BELOW_AVERAGE
        return cls.NEEDS_IMPROVEMENT


class TrendDirection(Enum):
    """Trend yönü."""
    IMPROVING = 'improving'
    STABLE = 'stable'
    DECLINING = 'declining'


@dataclass
class TopicPerformance:
    """Konu bazlı performans."""
    topic_id: int
    topic_title: str
    total_questions: int
    attempted_questions: int
    correct_count: int
    average_score: float
    average_time_seconds: float
    difficulty_breakdown: Dict[str, float] = field(default_factory=dict)
    question_type_breakdown: Dict[str, float] = field(default_factory=dict)
    bloom_level_breakdown: Dict[str, float] = field(default_factory=dict)
    performance_level: PerformanceLevel = PerformanceLevel.AVERAGE
    trend: TrendDirection = TrendDirection.STABLE
    
    @property
    def completion_rate(self) -> float:
        if self.total_questions == 0:
            return 0
        return (self.attempted_questions / self.total_questions) * 100
    
    @property
    def success_rate(self) -> float:
        if self.attempted_questions == 0:
            return 0
        return (self.correct_count / self.attempted_questions) * 100


@dataclass
class StrengthWeakness:
    """Güçlü/Zayıf yön."""
    area: str  # topic, question_type, difficulty, bloom_level
    area_id: str
    area_name: str
    score: float
    sample_size: int
    is_strength: bool
    recommendation: str = ''


@dataclass
class LearningPattern:
    """Öğrenme paterni."""
    pattern_type: str  # time_of_day, session_duration, question_pace
    insights: List[str] = field(default_factory=list)
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StudentPerformanceReport:
    """Kapsamlı öğrenci performans raporu."""
    user_id: int
    report_date: datetime
    period_start: datetime
    period_end: datetime
    
    # Genel metrikler
    overall_score: float
    total_questions_attempted: int
    total_correct: int
    total_time_spent_seconds: int
    performance_level: PerformanceLevel
    
    # Sınav metrikleri
    exams_taken: int
    exams_passed: int
    average_exam_score: float
    best_exam_score: float
    
    # Trend
    trend: TrendDirection
    trend_data: List[Dict[str, Any]] = field(default_factory=list)
    
    # Konu performansları
    topic_performances: List[TopicPerformance] = field(default_factory=list)
    
    # Güçlü/Zayıf yönler
    strengths: List[StrengthWeakness] = field(default_factory=list)
    weaknesses: List[StrengthWeakness] = field(default_factory=list)
    
    # Öğrenme patternleri
    learning_patterns: List[LearningPattern] = field(default_factory=list)
    
    # Öneriler
    recommendations: List[str] = field(default_factory=list)
    
    # Hedefler ve ilerleme
    goals: List[Dict[str, Any]] = field(default_factory=list)


class PerformanceAnalyticsService:
    """
    Öğrenci performans analizi servisi.
    
    Kapsamlı analiz, trend tespiti ve kişiselleştirilmiş öneriler.
    """
    
    # Güçlü/zayıf yön eşikleri
    STRENGTH_THRESHOLD = 75  # %75+ = güçlü
    WEAKNESS_THRESHOLD = 50  # %50- = zayıf
    MIN_SAMPLE_SIZE = 5      # Minimum soru sayısı
    
    @classmethod
    def get_student_performance(
        cls,
        user_id: int,
        course_id: int = None,
        days: int = 30
    ) -> StudentPerformanceReport:
        """
        Öğrenci performans raporunu oluşturur.
        
        Args:
            user_id: Öğrenci ID
            course_id: Kurs ID (opsiyonel)
            days: Analiz periyodu (gün)
            
        Returns:
            StudentPerformanceReport
        """
        period_end = datetime.utcnow()
        period_start = period_end - timedelta(days=days)
        
        # Temel metrikleri hesapla
        question_stats = cls._get_question_stats(user_id, course_id, period_start, period_end)
        exam_stats = cls._get_exam_stats(user_id, course_id, period_start, period_end)
        
        # Konu performansları
        topic_performances = cls._get_topic_performances(user_id, course_id, period_start, period_end)
        
        # Trend analizi
        trend, trend_data = cls._calculate_trend(user_id, course_id, days)
        
        # Güçlü/zayıf yönler
        strengths, weaknesses = cls._analyze_strengths_weaknesses(
            user_id, course_id, period_start, period_end
        )
        
        # Öğrenme patternleri
        learning_patterns = cls._analyze_learning_patterns(user_id, period_start, period_end)
        
        # Performans seviyesi
        overall_score = question_stats.get('success_rate', 0)
        performance_level = PerformanceLevel.from_score(overall_score)
        
        # Öneriler oluştur
        recommendations = cls._generate_recommendations(
            performance_level, weaknesses, topic_performances, learning_patterns
        )
        
        return StudentPerformanceReport(
            user_id=user_id,
            report_date=datetime.utcnow(),
            period_start=period_start,
            period_end=period_end,
            overall_score=overall_score,
            total_questions_attempted=question_stats.get('total_attempted', 0),
            total_correct=question_stats.get('total_correct', 0),
            total_time_spent_seconds=question_stats.get('total_time', 0),
            performance_level=performance_level,
            exams_taken=exam_stats.get('total_exams', 0),
            exams_passed=exam_stats.get('passed_exams', 0),
            average_exam_score=exam_stats.get('average_score', 0),
            best_exam_score=exam_stats.get('best_score', 0),
            trend=trend,
            trend_data=trend_data,
            topic_performances=topic_performances,
            strengths=strengths,
            weaknesses=weaknesses,
            learning_patterns=learning_patterns,
            recommendations=recommendations
        )
    
    @classmethod
    def _get_question_stats(
        cls,
        user_id: int,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Soru istatistiklerini hesaplar."""
        query = QuestionAttempt.query.filter(
            QuestionAttempt.user_id == user_id,
            QuestionAttempt.created_at >= start_date,
            QuestionAttempt.created_at <= end_date
        )
        
        if course_id:
            query = query.join(Question).join(Topic).filter(Topic.course_id == course_id)
        
        attempts = query.all()
        
        if not attempts:
            return {
                'total_attempted': 0,
                'total_correct': 0,
                'success_rate': 0,
                'total_time': 0,
                'average_time': 0
            }
        
        total = len(attempts)
        correct = sum(1 for a in attempts if a.is_correct)
        total_time = sum(a.time_spent_seconds or 0 for a in attempts)
        
        return {
            'total_attempted': total,
            'total_correct': correct,
            'success_rate': (correct / total * 100) if total > 0 else 0,
            'total_time': total_time,
            'average_time': total_time / total if total > 0 else 0
        }
    
    @classmethod
    def _get_exam_stats(
        cls,
        user_id: int,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Sınav istatistiklerini hesaplar."""
        query = ExamResult.query.filter(
            ExamResult.user_id == user_id,
            ExamResult.status.in_([
                ExamResultStatus.SUBMITTED.value,
                ExamResultStatus.GRADED.value
            ]),
            ExamResult.created_at >= start_date,
            ExamResult.created_at <= end_date
        )
        
        if course_id:
            query = query.join(Exam).join(Topic).filter(Topic.course_id == course_id)
        
        results = query.all()
        
        if not results:
            return {
                'total_exams': 0,
                'passed_exams': 0,
                'average_score': 0,
                'best_score': 0
            }
        
        scores = [
            (r.score / r.max_score * 100) if r.max_score > 0 else 0
            for r in results
        ]
        
        return {
            'total_exams': len(results),
            'passed_exams': sum(1 for r in results if r.is_passed),
            'average_score': statistics.mean(scores) if scores else 0,
            'best_score': max(scores) if scores else 0
        }
    
    @classmethod
    def _get_topic_performances(
        cls,
        user_id: int,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[TopicPerformance]:
        """Konu bazlı performansları hesaplar."""
        # Kurs varsa o kurstaki tüm topicler, yoksa tüm attemptlerdeki topicler
        if course_id:
            topics = Topic.query.filter_by(course_id=course_id).all()
        else:
            topic_ids = db.session.query(
                Question.topic_id
            ).join(QuestionAttempt).filter(
                QuestionAttempt.user_id == user_id,
                QuestionAttempt.created_at >= start_date
            ).distinct().all()
            topics = Topic.query.filter(Topic.id.in_([t[0] for t in topic_ids])).all()
        
        performances = []
        
        for topic in topics:
            # Topic'e ait attemptler
            attempts = QuestionAttempt.query.join(Question).filter(
                QuestionAttempt.user_id == user_id,
                Question.topic_id == topic.id,
                QuestionAttempt.created_at >= start_date,
                QuestionAttempt.created_at <= end_date
            ).all()
            
            if not attempts:
                continue
            
            total_questions = Question.query.filter_by(
                topic_id=topic.id, is_published=True
            ).count()
            
            attempted = len(attempts)
            correct = sum(1 for a in attempts if a.is_correct)
            avg_time = statistics.mean([a.time_spent_seconds or 0 for a in attempts])
            
            # Zorluk breakdown
            difficulty_breakdown = cls._get_difficulty_breakdown(attempts)
            
            # Soru tipi breakdown
            type_breakdown = cls._get_question_type_breakdown(attempts)
            
            # Bloom level breakdown
            bloom_breakdown = cls._get_bloom_level_breakdown(attempts)
            
            # Trend
            topic_trend = cls._calculate_topic_trend(user_id, topic.id)
            
            success_rate = (correct / attempted * 100) if attempted > 0 else 0
            
            performances.append(TopicPerformance(
                topic_id=topic.id,
                topic_title=topic.title,
                total_questions=total_questions,
                attempted_questions=attempted,
                correct_count=correct,
                average_score=success_rate,
                average_time_seconds=avg_time,
                difficulty_breakdown=difficulty_breakdown,
                question_type_breakdown=type_breakdown,
                bloom_level_breakdown=bloom_breakdown,
                performance_level=PerformanceLevel.from_score(success_rate),
                trend=topic_trend
            ))
        
        # Performansa göre sırala
        performances.sort(key=lambda x: x.average_score, reverse=True)
        
        return performances
    
    @classmethod
    def _get_difficulty_breakdown(cls, attempts: List[QuestionAttempt]) -> Dict[str, float]:
        """Zorluk seviyesine göre başarı oranı."""
        breakdown = defaultdict(lambda: {'correct': 0, 'total': 0})
        
        for attempt in attempts:
            difficulty = attempt.question.difficulty or DifficultyLevel.MEDIUM.value
            breakdown[difficulty]['total'] += 1
            if attempt.is_correct:
                breakdown[difficulty]['correct'] += 1
        
        return {
            diff: (data['correct'] / data['total'] * 100) if data['total'] > 0 else 0
            for diff, data in breakdown.items()
        }
    
    @classmethod
    def _get_question_type_breakdown(cls, attempts: List[QuestionAttempt]) -> Dict[str, float]:
        """Soru tipine göre başarı oranı."""
        breakdown = defaultdict(lambda: {'correct': 0, 'total': 0})
        
        for attempt in attempts:
            q_type = attempt.question.question_type
            breakdown[q_type]['total'] += 1
            if attempt.is_correct:
                breakdown[q_type]['correct'] += 1
        
        return {
            q_type: (data['correct'] / data['total'] * 100) if data['total'] > 0 else 0
            for q_type, data in breakdown.items()
        }
    
    @classmethod
    def _get_bloom_level_breakdown(cls, attempts: List[QuestionAttempt]) -> Dict[str, float]:
        """Bloom seviyesine göre başarı oranı."""
        breakdown = defaultdict(lambda: {'correct': 0, 'total': 0})
        
        for attempt in attempts:
            bloom = attempt.question.bloom_level or 'understand'
            breakdown[bloom]['total'] += 1
            if attempt.is_correct:
                breakdown[bloom]['correct'] += 1
        
        return {
            bloom: (data['correct'] / data['total'] * 100) if data['total'] > 0 else 0
            for bloom, data in breakdown.items()
        }
    
    @classmethod
    def _calculate_trend(
        cls,
        user_id: int,
        course_id: int,
        days: int
    ) -> Tuple[TrendDirection, List[Dict]]:
        """Performans trendini hesaplar."""
        # Son N günü haftalık dilimlere ayır
        weeks = min(days // 7, 4)
        if weeks < 2:
            return TrendDirection.STABLE, []
        
        trend_data = []
        scores = []
        
        for i in range(weeks):
            week_end = datetime.utcnow() - timedelta(days=i * 7)
            week_start = week_end - timedelta(days=7)
            
            stats = cls._get_question_stats(user_id, course_id, week_start, week_end)
            
            trend_data.append({
                'week': i + 1,
                'start_date': week_start.isoformat(),
                'end_date': week_end.isoformat(),
                'success_rate': stats['success_rate'],
                'questions_attempted': stats['total_attempted']
            })
            
            if stats['total_attempted'] >= 5:  # Minimum aktivite
                scores.append(stats['success_rate'])
        
        trend_data.reverse()
        
        # Trend yönü
        if len(scores) < 2:
            return TrendDirection.STABLE, trend_data
        
        first_half_avg = statistics.mean(scores[:len(scores)//2])
        second_half_avg = statistics.mean(scores[len(scores)//2:])
        
        diff = second_half_avg - first_half_avg
        
        if diff > 5:
            return TrendDirection.IMPROVING, trend_data
        elif diff < -5:
            return TrendDirection.DECLINING, trend_data
        
        return TrendDirection.STABLE, trend_data
    
    @classmethod
    def _calculate_topic_trend(cls, user_id: int, topic_id: int) -> TrendDirection:
        """Konu için trend hesaplar."""
        recent = QuestionAttempt.query.join(Question).filter(
            QuestionAttempt.user_id == user_id,
            Question.topic_id == topic_id,
            QuestionAttempt.created_at >= datetime.utcnow() - timedelta(days=14)
        ).order_by(QuestionAttempt.created_at.desc()).limit(20).all()
        
        if len(recent) < 10:
            return TrendDirection.STABLE
        
        first_half = recent[len(recent)//2:]
        second_half = recent[:len(recent)//2]
        
        first_rate = sum(1 for a in first_half if a.is_correct) / len(first_half) * 100
        second_rate = sum(1 for a in second_half if a.is_correct) / len(second_half) * 100
        
        diff = second_rate - first_rate
        
        if diff > 10:
            return TrendDirection.IMPROVING
        elif diff < -10:
            return TrendDirection.DECLINING
        
        return TrendDirection.STABLE
    
    @classmethod
    def _analyze_strengths_weaknesses(
        cls,
        user_id: int,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Tuple[List[StrengthWeakness], List[StrengthWeakness]]:
        """Güçlü ve zayıf yönleri analiz eder."""
        strengths = []
        weaknesses = []
        
        # Konu bazlı
        topic_stats = cls._get_area_stats(user_id, 'topic', course_id, start_date, end_date)
        for topic_id, stats in topic_stats.items():
            if stats['total'] < cls.MIN_SAMPLE_SIZE:
                continue
            
            score = stats['success_rate']
            topic = Topic.query.get(topic_id)
            
            if score >= cls.STRENGTH_THRESHOLD:
                strengths.append(StrengthWeakness(
                    area='topic',
                    area_id=str(topic_id),
                    area_name=topic.title if topic else f'Topic {topic_id}',
                    score=score,
                    sample_size=stats['total'],
                    is_strength=True,
                    recommendation=f'{topic.title if topic else "Bu konu"} konusunda güçlüsünüz!'
                ))
            elif score < cls.WEAKNESS_THRESHOLD:
                weaknesses.append(StrengthWeakness(
                    area='topic',
                    area_id=str(topic_id),
                    area_name=topic.title if topic else f'Topic {topic_id}',
                    score=score,
                    sample_size=stats['total'],
                    is_strength=False,
                    recommendation=f'{topic.title if topic else "Bu konu"} konusunu tekrar çalışmanızı öneririz.'
                ))
        
        # Zorluk bazlı
        difficulty_stats = cls._get_area_stats(user_id, 'difficulty', course_id, start_date, end_date)
        difficulty_names = {
            'very_easy': 'Çok Kolay',
            'easy': 'Kolay',
            'medium': 'Orta',
            'hard': 'Zor',
            'very_hard': 'Çok Zor'
        }
        for diff, stats in difficulty_stats.items():
            if stats['total'] < cls.MIN_SAMPLE_SIZE:
                continue
            
            score = stats['success_rate']
            
            if score >= cls.STRENGTH_THRESHOLD:
                strengths.append(StrengthWeakness(
                    area='difficulty',
                    area_id=diff,
                    area_name=difficulty_names.get(diff, diff),
                    score=score,
                    sample_size=stats['total'],
                    is_strength=True
                ))
            elif score < cls.WEAKNESS_THRESHOLD:
                weaknesses.append(StrengthWeakness(
                    area='difficulty',
                    area_id=diff,
                    area_name=difficulty_names.get(diff, diff),
                    score=score,
                    sample_size=stats['total'],
                    is_strength=False,
                    recommendation=f'{difficulty_names.get(diff, diff)} sorularda daha fazla pratik yapmanızı öneririz.'
                ))
        
        # Soru tipi bazlı
        type_stats = cls._get_area_stats(user_id, 'question_type', course_id, start_date, end_date)
        type_names = {
            'multiple_choice': 'Çoktan Seçmeli',
            'multiple_select': 'Çoklu Seçim',
            'true_false': 'Doğru/Yanlış',
            'fill_in_blank': 'Boşluk Doldurma',
            'matching': 'Eşleştirme',
            'ordering': 'Sıralama',
            'short_answer': 'Kısa Cevap',
            'numeric': 'Sayısal'
        }
        for q_type, stats in type_stats.items():
            if stats['total'] < cls.MIN_SAMPLE_SIZE:
                continue
            
            score = stats['success_rate']
            
            if score < cls.WEAKNESS_THRESHOLD:
                weaknesses.append(StrengthWeakness(
                    area='question_type',
                    area_id=q_type,
                    area_name=type_names.get(q_type, q_type),
                    score=score,
                    sample_size=stats['total'],
                    is_strength=False,
                    recommendation=f'{type_names.get(q_type, q_type)} tip sorularda gelişim gerekiyor.'
                ))
        
        # Skora göre sırala
        strengths.sort(key=lambda x: x.score, reverse=True)
        weaknesses.sort(key=lambda x: x.score)
        
        return strengths[:5], weaknesses[:5]  # En önemli 5'er tanesi
    
    @classmethod
    def _get_area_stats(
        cls,
        user_id: int,
        area: str,
        course_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Dict]:
        """Alan bazlı istatistikleri hesaplar."""
        query = QuestionAttempt.query.join(Question).filter(
            QuestionAttempt.user_id == user_id,
            QuestionAttempt.created_at >= start_date,
            QuestionAttempt.created_at <= end_date
        )
        
        if course_id:
            query = query.join(Topic).filter(Topic.course_id == course_id)
        
        attempts = query.all()
        
        stats = defaultdict(lambda: {'correct': 0, 'total': 0})
        
        for attempt in attempts:
            if area == 'topic':
                key = attempt.question.topic_id
            elif area == 'difficulty':
                key = attempt.question.difficulty or 'medium'
            elif area == 'question_type':
                key = attempt.question.question_type
            elif area == 'bloom_level':
                key = attempt.question.bloom_level or 'understand'
            else:
                continue
            
            stats[key]['total'] += 1
            if attempt.is_correct:
                stats[key]['correct'] += 1
        
        return {
            key: {
                'total': data['total'],
                'correct': data['correct'],
                'success_rate': (data['correct'] / data['total'] * 100) if data['total'] > 0 else 0
            }
            for key, data in stats.items()
        }
    
    @classmethod
    def _analyze_learning_patterns(
        cls,
        user_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[LearningPattern]:
        """Öğrenme paternlerini analiz eder."""
        patterns = []
        
        attempts = QuestionAttempt.query.filter(
            QuestionAttempt.user_id == user_id,
            QuestionAttempt.created_at >= start_date,
            QuestionAttempt.created_at <= end_date
        ).all()
        
        if not attempts:
            return patterns
        
        # Saat dilimine göre analiz
        hour_stats = defaultdict(lambda: {'correct': 0, 'total': 0})
        for attempt in attempts:
            hour = attempt.created_at.hour
            hour_stats[hour]['total'] += 1
            if attempt.is_correct:
                hour_stats[hour]['correct'] += 1
        
        best_hours = sorted(
            hour_stats.items(),
            key=lambda x: (x[1]['correct'] / x[1]['total'] if x[1]['total'] > 0 else 0),
            reverse=True
        )[:3]
        
        patterns.append(LearningPattern(
            pattern_type='time_of_day',
            insights=[
                f"En verimli saatleriniz: {', '.join([f'{h}:00' for h, _ in best_hours])}"
            ],
            data={str(h): {'success_rate': (s['correct']/s['total']*100) if s['total'] > 0 else 0} 
                  for h, s in hour_stats.items()}
        ))
        
        # Süre analizi
        avg_time = statistics.mean([a.time_spent_seconds or 0 for a in attempts if a.time_spent_seconds])
        if avg_time:
            fast_correct = sum(1 for a in attempts if a.is_correct and (a.time_spent_seconds or 0) < avg_time)
            slow_correct = sum(1 for a in attempts if a.is_correct and (a.time_spent_seconds or 0) >= avg_time)
            
            insights = []
            if fast_correct > slow_correct:
                insights.append("Hızlı cevaplarınız daha başarılı. Güveninizi koruyun!")
            else:
                insights.append("Yavaş düşündüğünüzde daha başarılısınız. Acele etmeyin!")
            
            patterns.append(LearningPattern(
                pattern_type='answer_speed',
                insights=insights,
                data={
                    'average_time': avg_time,
                    'fast_correct': fast_correct,
                    'slow_correct': slow_correct
                }
            ))
        
        # Günlük çalışma süresi
        daily_attempts = defaultdict(int)
        for attempt in attempts:
            day = attempt.created_at.date()
            daily_attempts[day] += 1
        
        avg_daily = statistics.mean(daily_attempts.values()) if daily_attempts else 0
        
        patterns.append(LearningPattern(
            pattern_type='daily_activity',
            insights=[
                f"Günlük ortalama {int(avg_daily)} soru çözüyorsunuz."
            ],
            data={
                'average_daily_questions': avg_daily,
                'total_active_days': len(daily_attempts)
            }
        ))
        
        return patterns
    
    @classmethod
    def _generate_recommendations(
        cls,
        performance_level: PerformanceLevel,
        weaknesses: List[StrengthWeakness],
        topic_performances: List[TopicPerformance],
        learning_patterns: List[LearningPattern]
    ) -> List[str]:
        """Kişiselleştirilmiş öneriler oluşturur."""
        recommendations = []
        
        # Performans seviyesine göre genel öneriler
        if performance_level == PerformanceLevel.EXCELLENT:
            recommendations.append("Mükemmel performans! Daha zorlu sorulara geçebilirsiniz.")
        elif performance_level == PerformanceLevel.GOOD:
            recommendations.append("İyi gidiyorsunuz! Zayıf konularınıza odaklanarak mükemmelleşebilirsiniz.")
        elif performance_level == PerformanceLevel.AVERAGE:
            recommendations.append("Düzenli çalışmaya devam edin. Temel konuları pekiştirin.")
        elif performance_level == PerformanceLevel.BELOW_AVERAGE:
            recommendations.append("Temelden başlayarak konuları tekrar gözden geçirin.")
        else:
            recommendations.append("Video derslerini tekrar izleyerek başlayın.")
        
        # Zayıf yönlere göre öneriler
        for weakness in weaknesses[:3]:
            if weakness.recommendation:
                recommendations.append(weakness.recommendation)
        
        # Düşen trendli konular
        declining_topics = [
            tp for tp in topic_performances
            if tp.trend == TrendDirection.DECLINING
        ]
        for tp in declining_topics[:2]:
            recommendations.append(
                f"'{tp.topic_title}' konusunda performansınız düşüyor. Bu konuyu tekrar edin."
            )
        
        # Öğrenme patternlerine göre
        for pattern in learning_patterns:
            if pattern.pattern_type == 'time_of_day':
                for insight in pattern.insights:
                    recommendations.append(insight)
        
        return recommendations[:7]  # Maksimum 7 öneri
    
    @classmethod
    def get_comparison_with_peers(
        cls,
        user_id: int,
        course_id: int
    ) -> Dict[str, Any]:
        """Akranlarla karşılaştırma verir."""
        # Kullanıcının skoru
        user_stats = cls._get_question_stats(
            user_id, course_id,
            datetime.utcnow() - timedelta(days=30),
            datetime.utcnow()
        )
        user_score = user_stats['success_rate']
        
        # Tüm kullanıcıların skorları (aynı kurs)
        all_scores = db.session.query(
            QuestionAttempt.user_id,
            func.count().label('total'),
            func.sum(func.cast(QuestionAttempt.is_correct, db.Integer)).label('correct')
        ).join(Question).join(Topic).filter(
            Topic.course_id == course_id,
            QuestionAttempt.created_at >= datetime.utcnow() - timedelta(days=30)
        ).group_by(QuestionAttempt.user_id).having(
            func.count() >= 10  # Minimum 10 soru
        ).all()
        
        if not all_scores:
            return {'percentile': 50, 'rank': 1, 'total_students': 1}
        
        scores = [
            (s.correct / s.total * 100) if s.total > 0 else 0
            for s in all_scores
        ]
        scores.sort()
        
        # Yüzdelik dilim
        below = sum(1 for s in scores if s < user_score)
        percentile = (below / len(scores)) * 100 if scores else 50
        
        # Sıralama
        rank = len(scores) - below
        
        return {
            'percentile': round(percentile, 1),
            'rank': rank,
            'total_students': len(scores),
            'user_score': round(user_score, 1),
            'average_score': round(statistics.mean(scores), 1) if scores else 0,
            'top_score': round(max(scores), 1) if scores else 0
        }
    
    @classmethod
    def get_recommended_questions(
        cls,
        user_id: int,
        course_id: int = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Öğrenci için önerilen soruları döner.
        Zayıf yönlere ve zorluk seviyesine göre seçer.
        """
        _, weaknesses = cls._analyze_strengths_weaknesses(
            user_id, course_id,
            datetime.utcnow() - timedelta(days=30),
            datetime.utcnow()
        )
        
        # Zayıf topic'ler
        weak_topic_ids = [
            int(w.area_id) for w in weaknesses
            if w.area == 'topic'
        ]
        
        # Kullanıcının başarı oranına göre zorluk
        user_stats = cls._get_question_stats(
            user_id, course_id,
            datetime.utcnow() - timedelta(days=30),
            datetime.utcnow()
        )
        success_rate = user_stats['success_rate']
        
        # Zorluk seçimi
        if success_rate >= 80:
            target_difficulties = ['hard', 'very_hard']
        elif success_rate >= 60:
            target_difficulties = ['medium', 'hard']
        elif success_rate >= 40:
            target_difficulties = ['easy', 'medium']
        else:
            target_difficulties = ['very_easy', 'easy']
        
        # Sorguyu oluştur
        query = Question.query.filter(
            Question.is_published == True,
            Question.is_active == True
        )
        
        if course_id:
            query = query.join(Topic).filter(Topic.course_id == course_id)
        
        # Zayıf topic'lere öncelik
        if weak_topic_ids:
            query = query.filter(Question.topic_id.in_(weak_topic_ids))
        
        # Zorluk filtresi
        query = query.filter(Question.difficulty.in_(target_difficulties))
        
        # Daha önce doğru cevaplananları hariç tut
        correct_question_ids = db.session.query(
            QuestionAttempt.question_id
        ).filter(
            QuestionAttempt.user_id == user_id,
            QuestionAttempt.is_correct == True
        ).distinct().subquery()
        
        query = query.filter(~Question.id.in_(correct_question_ids))
        
        # Rastgele seç
        questions = query.order_by(func.random()).limit(limit).all()
        
        return [
            {
                'id': q.id,
                'question_text': q.question_text[:100],
                'topic_id': q.topic_id,
                'topic_title': q.topic.title if q.topic else None,
                'difficulty': q.difficulty,
                'points': q.points,
                'question_type': q.question_type
            }
            for q in questions
        ]
