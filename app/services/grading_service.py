"""
Grading Service - Otomatik Değerlendirme Servisi.

Sınav ve soru cevaplarının otomatik değerlendirilmesi,
puanlama ve geri bildirim üretimi.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import logging

from app.extensions import db
from app.models.question import Question, QuestionAttempt, QuestionType
from app.models.exam import Exam, ExamResult, ExamAnswer, ExamQuestion, ExamResultStatus

logger = logging.getLogger(__name__)


class GradingStatus(Enum):
    """Değerlendirme durumu."""
    PENDING = 'pending'           # Bekliyor
    AUTO_GRADED = 'auto_graded'   # Otomatik değerlendirildi
    MANUAL_GRADED = 'manual_graded'  # Manuel değerlendirildi
    PARTIAL = 'partial'           # Kısmen değerlendirildi
    ERROR = 'error'               # Hata


@dataclass
class GradingResult:
    """Değerlendirme sonucu."""
    question_id: int
    is_correct: bool
    points_earned: float
    max_points: float
    feedback: str = ''
    details: Dict[str, Any] = field(default_factory=dict)
    status: GradingStatus = GradingStatus.AUTO_GRADED
    
    @property
    def score_percentage(self) -> float:
        if self.max_points == 0:
            return 0
        return (self.points_earned / self.max_points) * 100


@dataclass
class ExamGradingResult:
    """Sınav değerlendirme sonucu."""
    exam_id: int
    user_id: int
    total_score: float
    max_score: float
    is_passed: bool
    correct_count: int
    wrong_count: int
    unanswered_count: int
    question_results: List[GradingResult] = field(default_factory=list)
    needs_manual_grading: bool = False
    manual_grading_questions: List[int] = field(default_factory=list)
    
    @property
    def score_percentage(self) -> float:
        if self.max_score == 0:
            return 0
        return (self.total_score / self.max_score) * 100


class GradingService:
    """
    Otomatik değerlendirme servisi.
    
    Soru tipine göre değerlendirme yapar ve
    detaylı geri bildirim üretir.
    """
    
    @classmethod
    def grade_question(
        cls,
        question: Question,
        user_answer: Any,
        answer_type: str = 'ids',
        include_feedback: bool = True
    ) -> GradingResult:
        """
        Tek bir soruyu değerlendirir.
        
        Args:
            question: Soru nesnesi
            user_answer: Kullanıcının cevabı
            answer_type: Cevap tipi ('ids', 'text', 'data')
            include_feedback: Geri bildirim eklensin mi
            
        Returns:
            GradingResult
        """
        try:
            is_correct, points_earned, details = question.check_answer(
                user_answer, answer_type
            )
            
            # Feedback oluştur
            feedback = ''
            if include_feedback:
                feedback = cls._generate_feedback(question, is_correct, details)
            
            # Manuel değerlendirme gerektiren sorular için
            if question.question_type in QuestionType.manual_gradable_types():
                return GradingResult(
                    question_id=question.id,
                    is_correct=False,
                    points_earned=0,
                    max_points=question.points,
                    feedback='Bu soru manuel değerlendirme bekliyor.',
                    details=details,
                    status=GradingStatus.PENDING
                )
            
            return GradingResult(
                question_id=question.id,
                is_correct=is_correct,
                points_earned=points_earned,
                max_points=question.points,
                feedback=feedback,
                details=details,
                status=GradingStatus.AUTO_GRADED
            )
            
        except Exception as e:
            logger.error(f"Grading error for question {question.id}: {e}")
            return GradingResult(
                question_id=question.id,
                is_correct=False,
                points_earned=0,
                max_points=question.points,
                feedback=f'Değerlendirme hatası: {str(e)}',
                status=GradingStatus.ERROR
            )
    
    @classmethod
    def grade_exam(
        cls,
        exam_result: ExamResult,
        answers: List[Dict[str, Any]]
    ) -> ExamGradingResult:
        """
        Sınavı değerlendirir.
        
        Args:
            exam_result: Sınav sonucu nesnesi
            answers: Kullanıcı cevapları listesi
                [{'question_id': 1, 'answer': [1, 2], 'time_spent': 30}, ...]
            
        Returns:
            ExamGradingResult
        """
        exam = exam_result.exam
        question_results = []
        total_score = 0
        max_score = 0
        correct_count = 0
        wrong_count = 0
        unanswered_count = 0
        manual_grading_questions = []
        
        # Cevapları question_id ile indexle
        answer_map = {a['question_id']: a for a in answers}
        
        # Her soru için değerlendir
        for exam_question in exam.exam_questions:
            question = exam_question.question
            points = exam_question.effective_points
            max_score += points
            
            answer_data = answer_map.get(question.id)
            
            if not answer_data:
                # Cevaplanmamış
                unanswered_count += 1
                question_results.append(GradingResult(
                    question_id=question.id,
                    is_correct=False,
                    points_earned=0,
                    max_points=points,
                    feedback='Cevaplanmamış',
                    status=GradingStatus.AUTO_GRADED
                ))
                
                # Boş ExamAnswer kaydı
                cls._save_exam_answer(
                    exam_result=exam_result,
                    question=question,
                    answer_data=None,
                    grading_result=question_results[-1]
                )
                continue
            
            # Cevap tipini belirle
            user_answer = answer_data.get('answer')
            if question.question_type in [
                QuestionType.SHORT_ANSWER.value,
                QuestionType.ESSAY.value
            ]:
                user_answer = answer_data.get('text_answer', user_answer)
                answer_type = 'text'
            elif question.question_type in [
                QuestionType.FILL_IN_BLANK.value,
                QuestionType.MATCHING.value,
                QuestionType.ORDERING.value,
                QuestionType.NUMERIC.value,
                QuestionType.DRAG_DROP.value,
            ]:
                answer_type = 'data'
            else:
                answer_type = 'ids'
            
            # Değerlendir
            result = cls.grade_question(question, user_answer, answer_type)
            
            # Points'i exam question'a göre ayarla
            if result.is_correct:
                result.points_earned = points
                result.max_points = points
                correct_count += 1
                total_score += points
            else:
                # Kısmi puan oranını koru
                if question.partial_credit and result.points_earned > 0:
                    ratio = result.points_earned / result.max_points
                    result.points_earned = points * ratio
                    total_score += result.points_earned
                else:
                    result.points_earned = 0
                    wrong_count += 1
                result.max_points = points
            
            question_results.append(result)
            
            # Manuel değerlendirme gerekiyor mu?
            if result.status == GradingStatus.PENDING:
                manual_grading_questions.append(question.id)
            
            # ExamAnswer kaydet
            cls._save_exam_answer(
                exam_result=exam_result,
                question=question,
                answer_data=answer_data,
                grading_result=result
            )
        
        # Geçme durumu
        passing_score = exam.passing_score
        score_percentage = (total_score / max_score * 100) if max_score > 0 else 0
        is_passed = score_percentage >= passing_score
        
        # Exam result güncelle
        exam_result.score = total_score
        exam_result.max_score = max_score
        exam_result.correct_count = correct_count
        exam_result.wrong_count = wrong_count
        exam_result.unanswered_count = unanswered_count
        exam_result.is_passed = is_passed
        
        if manual_grading_questions:
            exam_result.status = ExamResultStatus.SUBMITTED.value
        else:
            exam_result.status = ExamResultStatus.GRADED.value
        
        db.session.commit()
        
        return ExamGradingResult(
            exam_id=exam.id,
            user_id=exam_result.user_id,
            total_score=total_score,
            max_score=max_score,
            is_passed=is_passed,
            correct_count=correct_count,
            wrong_count=wrong_count,
            unanswered_count=unanswered_count,
            question_results=question_results,
            needs_manual_grading=bool(manual_grading_questions),
            manual_grading_questions=manual_grading_questions
        )
    
    @classmethod
    def grade_practice_question(
        cls,
        user_id: int,
        question_id: int,
        answer: Any,
        time_spent_seconds: int = None,
        hint_used: bool = False
    ) -> Tuple[GradingResult, QuestionAttempt]:
        """
        Pratik modunda bir soruyu değerlendirir.
        
        Returns:
            Tuple of (GradingResult, QuestionAttempt)
        """
        question = Question.query.get(question_id)
        if not question:
            raise ValueError(f'Question {question_id} not found')
        
        # Cevap tipini belirle
        if question.question_type in [
            QuestionType.SHORT_ANSWER.value,
            QuestionType.ESSAY.value
        ]:
            answer_type = 'text'
        elif isinstance(answer, dict):
            answer_type = 'data'
        else:
            answer_type = 'ids'
        
        # Değerlendir
        result = cls.grade_question(question, answer, answer_type)
        
        # İpucu kullanıldıysa puan düş
        if hint_used and question.hint_penalty:
            penalty = question.hint_penalty
            result.points_earned = max(0, result.points_earned - penalty)
            result.feedback += f' (İpucu kullanımı: -{penalty} puan)'
        
        # QuestionAttempt kaydet
        attempt = QuestionAttempt(
            user_id=user_id,
            question_id=question_id,
            selected_answer_ids=answer if isinstance(answer, list) else None,
            text_answer=answer if isinstance(answer, str) else None,
            answer_data=answer if isinstance(answer, dict) else None,
            is_correct=result.is_correct,
            points_earned=result.points_earned,
            max_points=result.max_points,
            feedback=result.feedback,
            grading_details=result.details,
            time_spent_seconds=time_spent_seconds,
            hint_used=hint_used,
            context_type='practice'
        )
        
        db.session.add(attempt)
        
        # Soru istatistiklerini güncelle
        question.record_attempt(result.is_correct, time_spent_seconds)
        
        db.session.commit()
        
        return result, attempt
    
    @classmethod
    def manual_grade(
        cls,
        attempt_id: int,
        grader_id: int,
        points: float,
        feedback: str = None
    ) -> QuestionAttempt:
        """
        Essay sorusunu manuel değerlendirir.
        
        Args:
            attempt_id: QuestionAttempt ID
            grader_id: Değerlendiren öğretmen ID
            points: Verilen puan
            feedback: Geri bildirim
            
        Returns:
            Güncellenmiş QuestionAttempt
        """
        attempt = QuestionAttempt.query.get(attempt_id)
        if not attempt:
            raise ValueError(f'Attempt {attempt_id} not found')
        
        attempt.points_earned = min(points, attempt.max_points)
        attempt.is_correct = points >= attempt.max_points * 0.5  # %50+ = doğru sayılır
        attempt.feedback = feedback
        attempt.graded_by = grader_id
        attempt.graded_at = datetime.utcnow()
        
        db.session.commit()
        
        # Eğer sınav cevabıysa, sınav sonucunu da güncelle
        if attempt.context_type == 'exam' and attempt.context_id:
            cls._update_exam_after_manual_grade(attempt)
        
        return attempt
    
    @classmethod
    def manual_grade_exam_answer(
        cls,
        exam_answer_id: int,
        grader_id: int,
        points: float,
        feedback: str = None
    ) -> ExamAnswer:
        """
        Sınav essay cevabını manuel değerlendirir.
        """
        exam_answer = ExamAnswer.query.get(exam_answer_id)
        if not exam_answer:
            raise ValueError(f'ExamAnswer {exam_answer_id} not found')
        
        exam_answer.points_earned = min(points, exam_answer.question.points)
        exam_answer.is_correct = points >= exam_answer.question.points * 0.5
        
        db.session.commit()
        
        # Sınav sonucunu güncelle
        cls._recalculate_exam_result(exam_answer.exam_result)
        
        return exam_answer
    
    @classmethod
    def _save_exam_answer(
        cls,
        exam_result: ExamResult,
        question: Question,
        answer_data: Optional[Dict],
        grading_result: GradingResult
    ):
        """Sınav cevabını kaydeder."""
        exam_answer = ExamAnswer.query.filter_by(
            exam_result_id=exam_result.id,
            question_id=question.id
        ).first()
        
        if not exam_answer:
            exam_answer = ExamAnswer(
                exam_result_id=exam_result.id,
                question_id=question.id
            )
            db.session.add(exam_answer)
        
        if answer_data:
            exam_answer.selected_answer_ids = answer_data.get('answer') if isinstance(
                answer_data.get('answer'), list
            ) else None
            exam_answer.text_answer = answer_data.get('text_answer')
            exam_answer.time_spent_seconds = answer_data.get('time_spent')
        
        exam_answer.is_correct = grading_result.is_correct
        exam_answer.points_earned = grading_result.points_earned
        exam_answer.answered_at = datetime.utcnow()
    
    @classmethod
    def _recalculate_exam_result(cls, exam_result: ExamResult):
        """Sınav sonucunu yeniden hesaplar."""
        total_score = 0
        correct_count = 0
        wrong_count = 0
        all_graded = True
        
        for answer in exam_result.answers:
            if answer.points_earned is None:
                all_graded = False
                continue
            
            total_score += answer.points_earned
            
            if answer.is_correct:
                correct_count += 1
            elif answer.selected_answer_ids or answer.text_answer:
                wrong_count += 1
        
        exam_result.score = total_score
        exam_result.correct_count = correct_count
        exam_result.wrong_count = wrong_count
        exam_result.unanswered_count = exam_result.exam.questions_count - correct_count - wrong_count
        
        if exam_result.max_score > 0:
            score_percent = (total_score / exam_result.max_score) * 100
            exam_result.is_passed = score_percent >= exam_result.exam.passing_score
        
        if all_graded:
            exam_result.status = ExamResultStatus.GRADED.value
        
        db.session.commit()
    
    @classmethod
    def _update_exam_after_manual_grade(cls, attempt: QuestionAttempt):
        """Manuel değerlendirme sonrası sınav sonucunu günceller."""
        exam_result = ExamResult.query.filter_by(
            id=attempt.context_id
        ).first()
        
        if exam_result:
            cls._recalculate_exam_result(exam_result)
    
    @classmethod
    def _generate_feedback(
        cls,
        question: Question,
        is_correct: bool,
        details: Dict
    ) -> str:
        """Soru için geri bildirim üretir."""
        if is_correct:
            return 'Doğru cevap! 🎉'
        
        feedback_parts = []
        
        # Soru tipine göre özel feedback
        if question.question_type == QuestionType.MULTIPLE_CHOICE.value:
            correct = details.get('correct_answer')
            if correct:
                answer = question.answers.filter_by(id=correct).first()
                if answer:
                    feedback_parts.append(f'Doğru cevap: {answer.answer_text}')
        
        elif question.question_type == QuestionType.MULTIPLE_SELECT.value:
            correct_ids = details.get('correct_answer', [])
            if correct_ids:
                correct_texts = [
                    a.answer_text for a in question.answers
                    if a.id in correct_ids
                ]
                feedback_parts.append(f'Doğru cevaplar: {", ".join(correct_texts)}')
        
        elif question.question_type == QuestionType.FILL_IN_BLANK.value:
            partial_feedback = details.get('feedback')
            if partial_feedback:
                feedback_parts.append(partial_feedback)
        
        elif question.question_type == QuestionType.NUMERIC.value:
            correct_value = details.get('correct_answer')
            if correct_value is not None:
                feedback_parts.append(f'Doğru değer: {correct_value}')
        
        # Açıklama ekle
        if question.explanation:
            feedback_parts.append(f'Açıklama: {question.explanation}')
        
        return ' | '.join(feedback_parts) if feedback_parts else 'Yanlış cevap.'
    
    @classmethod
    def get_pending_manual_grades(
        cls,
        teacher_id: int = None,
        course_id: int = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        Manuel değerlendirme bekleyen soruları döner.
        """
        query = QuestionAttempt.query.filter(
            QuestionAttempt.graded_by.is_(None),
            QuestionAttempt.question.has(
                Question.question_type.in_(QuestionType.manual_gradable_types())
            )
        )
        
        if course_id:
            query = query.join(Question).join('topic').filter_by(course_id=course_id)
        
        pending = query.order_by(QuestionAttempt.created_at.asc()).limit(limit).all()
        
        return [
            {
                'attempt_id': a.id,
                'user_id': a.user_id,
                'question_id': a.question_id,
                'question_text': a.question.question_text[:100],
                'text_answer': a.text_answer,
                'max_points': a.max_points,
                'submitted_at': a.created_at.isoformat(),
                'grading_rubric': a.question.grading_rubric
            }
            for a in pending
        ]
