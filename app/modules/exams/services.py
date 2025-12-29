"""
Exams Module - Services.

Sınav yönetimi iş mantığı.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import random

from sqlalchemy.orm import joinedload, selectinload

from app.extensions import db
from app.common.base_service import BaseService
from app.core.exceptions import NotFoundError, ValidationError, AuthorizationError, ConflictError
from app.core.pagination import PaginationResult, paginate_query
from app.modules.exams.models import (
    Exam, Question, Answer, ExamAttempt, AttemptAnswer,
    ExamStatus, AttemptStatus, QuestionType, GradeLevel, ExamType
)


class ExamService(BaseService[Exam]):
    """Sınav servisi."""
    
    model = Exam
    
    @classmethod
    def query(cls):
        """Sadece silinmemiş sınavları döner."""
        return Exam.query.filter_by(is_deleted=False)
    
    @classmethod
    def get_paginated(
        cls,
        page: int = 1,
        per_page: int = 20,
        course_id: int = None,
        status: str = None
    ) -> PaginationResult:
        """Filtrelenmiş sınav listesi."""
        query = cls.query()
        
        if course_id:
            query = query.filter(Exam.course_id == course_id)
        
        if status:
            query = query.filter(Exam.status == status)
        else:
            query = query.filter(Exam.status == ExamStatus.PUBLISHED)
        
        query = query.order_by(Exam.created_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_with_questions(cls, exam_id: int, user_id: int = None) -> Dict[str, Any]:
        """Sınavı sorularıyla birlikte döner (N+1 önlenmiş)."""
        # Eager loading ile sorular ve cevapları tek seferde yükle
        exam = Exam.query.options(
            selectinload(Exam.questions).selectinload(Question.answers),
            joinedload(Exam.course),
            joinedload(Exam.creator)
        ).filter_by(id=exam_id, is_deleted=False).first()
        
        if not exam:
            raise NotFoundError('Sınav', exam_id)
        
        # Öğretmen/admin mi kontrol et
        from flask_jwt_extended import get_jwt
        try:
            claims = get_jwt()
            is_teacher = claims.get('role') in ['teacher', 'admin', 'super_admin']
        except:
            is_teacher = False
        
        exam_data = exam.to_dict()
        exam_data['questions'] = [
            q.to_dict(include_correct=is_teacher) 
            for q in exam.questions
        ]
        
        return exam_data
    
    @classmethod
    def create(cls, data: Dict[str, Any]) -> Exam:
        """Yeni sınav oluşturur."""
        exam = Exam(**data)
        db.session.add(exam)
        db.session.commit()
        return exam
    
    @classmethod
    def update_exam(cls, exam_id: int, data: Dict[str, Any], user_id: int) -> Exam:
        """Sınavı günceller."""
        exam = cls.get_or_404(exam_id)
        
        # Yetki kontrolü
        if exam.created_by != user_id:
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            if claims.get('role') not in ['admin', 'super_admin']:
                raise AuthorizationError('Bu sınavı düzenleme yetkiniz yok')
        
        # Enum dönüşümleri
        if 'exam_type' in data and data['exam_type']:
            if isinstance(data['exam_type'], str):
                data['exam_type'] = ExamType(data['exam_type'])
        
        if 'grade_level' in data and data['grade_level']:
            if isinstance(data['grade_level'], str):
                data['grade_level'] = GradeLevel(data['grade_level'])
        
        if 'status' in data and data['status']:
            if isinstance(data['status'], str):
                data['status'] = ExamStatus(data['status'])
        
        for key, value in data.items():
            if hasattr(exam, key) and key not in ['id', 'created_by']:
                setattr(exam, key, value)
        
        db.session.commit()
        return exam
    
    @classmethod
    def publish(cls, exam_id: int, user_id: int) -> Exam:
        """Sınavı yayınlar."""
        exam = cls.get_or_404(exam_id)
        
        # En az bir soru olmalı
        if not exam.questions:
            raise ValidationError('Sınavda en az bir soru olmalı')
        
        exam.status = ExamStatus.PUBLISHED
        db.session.commit()
        
        return exam
    
    @classmethod
    def update_statistics(cls, exam_id: int):
        """Sınav istatistiklerini günceller."""
        exam = cls.get_or_404(exam_id)
        
        # Toplam soru ve puan
        exam.total_questions = len(exam.questions)
        exam.total_points = sum(q.points for q in exam.questions)
        
        # Ortalama puan
        completed_attempts = ExamAttempt.query.filter(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.status == AttemptStatus.GRADED
        ).all()
        
        if completed_attempts:
            exam.average_score = sum(a.percentage or 0 for a in completed_attempts) / len(completed_attempts)
            exam.attempt_count = len(completed_attempts)
        
        db.session.commit()


class QuestionService(BaseService[Question]):
    """Soru servisi."""
    
    model = Question
    
    @classmethod
    def get_by_exam(cls, exam_id: int, include_correct: bool = False) -> List[Question]:
        """Sınavın sorularını döner."""
        return Question.query.filter_by(exam_id=exam_id).order_by(Question.order).all()
    
    @classmethod
    def create(cls, data: Dict[str, Any]) -> Question:
        """Yeni soru oluşturur."""
        answers_data = data.pop('answers', [])
        
        # Sıra numarası
        max_order = db.session.query(db.func.max(Question.order)).filter_by(
            exam_id=data['exam_id']
        ).scalar() or 0
        data['order'] = max_order + 1
        
        question = Question(**data)
        db.session.add(question)
        db.session.flush()
        
        # Cevapları ekle
        for i, answer_data in enumerate(answers_data):
            answer = Answer(
                question_id=question.id,
                answer_text=answer_data['answer_text'],
                is_correct=answer_data.get('is_correct', False),
                order=i
            )
            db.session.add(answer)
        
        # Sınav istatistiklerini güncelle
        exam = Exam.query.get(data['exam_id'])
        if exam:
            exam.total_questions += 1
            exam.total_points += data.get('points', 1.0)
        
        db.session.commit()
        return question
    
    @classmethod
    def update(cls, question_id: int, data: Dict[str, Any]) -> Question:
        """Soruyu günceller."""
        question = cls.get_or_404(question_id)
        answers_data = data.pop('answers', None)
        
        for key, value in data.items():
            if hasattr(question, key):
                setattr(question, key, value)
        
        # Cevapları güncelle
        if answers_data is not None:
            # Mevcut cevapları sil
            Answer.query.filter_by(question_id=question_id).delete()
            
            # Yeni cevapları ekle
            for i, answer_data in enumerate(answers_data):
                answer = Answer(
                    question_id=question.id,
                    answer_text=answer_data['answer_text'],
                    is_correct=answer_data.get('is_correct', False),
                    order=i
                )
                db.session.add(answer)
        
        db.session.commit()
        return question
    
    @classmethod
    def delete(cls, question_id: int):
        """Soruyu siler."""
        question = cls.get_or_404(question_id)
        exam_id = question.exam_id
        points = question.points
        
        db.session.delete(question)
        
        # Sınav istatistiklerini güncelle
        exam = Exam.query.get(exam_id)
        if exam:
            exam.total_questions = max(0, exam.total_questions - 1)
            exam.total_points = max(0, exam.total_points - points)
        
        db.session.commit()


class AttemptService(BaseService[ExamAttempt]):
    """Sınav girişi servisi."""
    
    model = ExamAttempt
    
    @classmethod
    def start_exam(cls, user_id: int, exam_id: int) -> Tuple[ExamAttempt, List[Dict]]:
        """Sınava başlatır."""
        exam = Exam.query.get(exam_id)
        if not exam:
            raise NotFoundError('Sınav', exam_id)
        
        if not exam.is_available:
            raise ValidationError('Bu sınav şu an erişilebilir değil')
        
        # Mevcut deneme sayısını kontrol et
        existing_attempts = ExamAttempt.query.filter_by(
            user_id=user_id,
            exam_id=exam_id
        ).filter(
            ExamAttempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.GRADED])
        ).count()
        
        if existing_attempts >= exam.max_attempts:
            raise ConflictError('Maksimum deneme sayısına ulaştınız')
        
        # Devam eden deneme var mı?
        in_progress = ExamAttempt.query.filter_by(
            user_id=user_id,
            exam_id=exam_id,
            status=AttemptStatus.IN_PROGRESS
        ).first()
        
        if in_progress:
            if in_progress.is_expired:
                # Süre dolmuş, otomatik bitir
                cls._auto_submit(in_progress)
            else:
                # Devam et
                questions = cls._get_attempt_questions(in_progress)
                return in_progress, questions
        
        # Yeni deneme oluştur
        questions = list(exam.questions)
        question_ids = [q.id for q in questions]
        
        if exam.shuffle_questions:
            random.shuffle(question_ids)
        
        attempt = ExamAttempt(
            exam_id=exam_id,
            user_id=user_id,
            status=AttemptStatus.IN_PROGRESS,
            question_order=question_ids,
            max_score=exam.total_points
        )
        db.session.add(attempt)
        db.session.commit()
        
        questions_data = cls._get_attempt_questions(attempt)
        
        return attempt, questions_data
    
    @classmethod
    def _get_attempt_questions(cls, attempt: ExamAttempt) -> List[Dict]:
        """Sınav sorularını sıralı döner."""
        question_ids = attempt.question_order or []
        questions = Question.query.filter(Question.id.in_(question_ids)).all()
        
        # Sıraya göre düzenle
        question_map = {q.id: q for q in questions}
        ordered = [question_map[qid] for qid in question_ids if qid in question_map]
        
        exam = attempt.exam
        
        result = []
        for q in ordered:
            q_data = q.to_dict(include_correct=False)
            
            # Cevapları karıştır
            if exam.shuffle_answers and q.question_type in [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE]:
                random.shuffle(q_data['answers'])
            
            # Verilen cevabı ekle
            given = AttemptAnswer.query.filter_by(
                attempt_id=attempt.id,
                question_id=q.id
            ).first()
            
            if given:
                q_data['given_answer'] = {
                    'selected_answer_ids': given.selected_answer_ids,
                    'answer_text': given.answer_text
                }
            
            result.append(q_data)
        
        return result
    
    @classmethod
    def submit_answer(
        cls,
        attempt_id: int,
        user_id: int,
        question_id: int,
        selected_answer_ids: List[int] = None,
        answer_text: str = None
    ) -> AttemptAnswer:
        """Cevap kaydeder."""
        attempt = cls.get_or_404(attempt_id)
        
        if attempt.user_id != user_id:
            raise AuthorizationError('Bu girişe erişim yetkiniz yok')
        
        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise ValidationError('Bu sınav zaten tamamlanmış')
        
        if attempt.is_expired:
            cls._auto_submit(attempt)
            raise ValidationError('Sınav süresi doldu')
        
        # Mevcut cevabı güncelle veya yeni oluştur
        answer = AttemptAnswer.query.filter_by(
            attempt_id=attempt_id,
            question_id=question_id
        ).first()
        
        if not answer:
            answer = AttemptAnswer(
                attempt_id=attempt_id,
                question_id=question_id
            )
            db.session.add(answer)
        
        answer.selected_answer_ids = selected_answer_ids
        answer.answer_text = answer_text
        
        db.session.commit()
        return answer
    
    @classmethod
    def submit_exam(cls, attempt_id: int, user_id: int) -> Dict[str, Any]:
        """Sınavı bitirir ve değerlendirir."""
        attempt = cls.get_or_404(attempt_id)
        
        if attempt.user_id != user_id:
            raise AuthorizationError('Bu girişe erişim yetkiniz yok')
        
        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise ValidationError('Bu sınav zaten tamamlanmış')
        
        return cls._grade_attempt(attempt)
    
    @classmethod
    def _auto_submit(cls, attempt: ExamAttempt):
        """Süre dolduğunda otomatik bitirir."""
        attempt.status = AttemptStatus.TIMED_OUT
        cls._grade_attempt(attempt)
    
    @classmethod
    def _grade_attempt(cls, attempt: ExamAttempt) -> Dict[str, Any]:
        """Sınavı değerlendirir."""
        exam = attempt.exam
        total_points = 0
        earned_points = 0
        
        for question in exam.questions:
            total_points += question.points
            
            answer = AttemptAnswer.query.filter_by(
                attempt_id=attempt.id,
                question_id=question.id
            ).first()
            
            if not answer:
                continue
            
            # Otomatik değerlendirilebilir tipler
            if question.question_type in [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE]:
                is_correct = cls._check_choice_answer(question, answer)
                answer.is_correct = is_correct
                answer.points_earned = question.points if is_correct else 0
                earned_points += answer.points_earned
            
            elif question.question_type == QuestionType.SHORT_ANSWER:
                # Basit metin karşılaştırma
                is_correct = cls._check_text_answer(question, answer)
                answer.is_correct = is_correct
                answer.points_earned = question.points if is_correct else 0
                earned_points += answer.points_earned
            
            # Essay için manuel değerlendirme gerekli
        
        # Sonuçları kaydet
        attempt.submitted_at = datetime.utcnow()
        attempt.score = earned_points
        attempt.percentage = (earned_points / total_points * 100) if total_points > 0 else 0
        attempt.passed = attempt.percentage >= exam.pass_score
        
        # Essay sorusu yoksa otomatik tamamla
        has_essay = any(
            q.question_type == QuestionType.ESSAY 
            for q in exam.questions
        )
        
        if has_essay:
            attempt.status = AttemptStatus.SUBMITTED
        else:
            attempt.status = AttemptStatus.GRADED
            attempt.graded_at = datetime.utcnow()
        
        db.session.commit()
        
        # Sınav istatistiklerini güncelle
        ExamService.update_statistics(exam.id)
        
        return {
            'attempt_id': attempt.id,
            'score': attempt.score,
            'max_score': total_points,
            'percentage': attempt.percentage,
            'passed': attempt.passed,
            'status': attempt.status.value
        }
    
    @classmethod
    def _check_choice_answer(cls, question: Question, answer: AttemptAnswer) -> bool:
        """Seçmeli soruyu kontrol eder."""
        if not answer.selected_answer_ids:
            return False
        
        correct_ids = [a.id for a in question.answers if a.is_correct]
        selected_ids = answer.selected_answer_ids
        
        return set(correct_ids) == set(selected_ids)
    
    @classmethod
    def _check_text_answer(cls, question: Question, answer: AttemptAnswer) -> bool:
        """Metin cevabını kontrol eder."""
        if not answer.answer_text or not question.correct_answer_text:
            return False
        
        # Basit normalize karşılaştırma
        given = answer.answer_text.strip().lower()
        correct = question.correct_answer_text.strip().lower()
        
        return given == correct
    
    @classmethod
    def get_result(cls, attempt_id: int, user_id: int) -> Dict[str, Any]:
        """Sınav sonucunu döner."""
        attempt = cls.get_or_404(attempt_id)
        
        if attempt.user_id != user_id:
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            if claims.get('role') not in ['teacher', 'admin', 'super_admin']:
                raise AuthorizationError('Bu sonuca erişim yetkiniz yok')
        
        if attempt.status == AttemptStatus.IN_PROGRESS:
            raise ValidationError('Sınav henüz tamamlanmadı')
        
        exam = attempt.exam
        result = {
            'attempt': attempt.to_dict(),
            'exam': exam.to_dict(),
            'show_answers': exam.show_answers_after and attempt.status == AttemptStatus.GRADED
        }
        
        if result['show_answers']:
            result['questions'] = []
            for question in exam.questions:
                q_data = question.to_dict(include_correct=True)
                
                answer = AttemptAnswer.query.filter_by(
                    attempt_id=attempt.id,
                    question_id=question.id
                ).first()
                
                if answer:
                    q_data['given_answer'] = {
                        'selected_answer_ids': answer.selected_answer_ids,
                        'answer_text': answer.answer_text,
                        'is_correct': answer.is_correct,
                        'points_earned': answer.points_earned
                    }
                
                result['questions'].append(q_data)
        
        return result
    
    @classmethod
    def get_user_attempts(cls, user_id: int, page: int = 1, per_page: int = 20) -> PaginationResult:
        """Kullanıcının sınav girişlerini döner."""
        query = ExamAttempt.query.filter_by(user_id=user_id).order_by(
            ExamAttempt.started_at.desc()
        )
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_exam_submissions(
        cls,
        exam_id: int,
        status: str = None,
        page: int = 1,
        per_page: int = 20
    ) -> PaginationResult:
        """Sınav girişlerini döner (öğretmen için)."""
        query = ExamAttempt.query.filter_by(exam_id=exam_id)
        
        if status:
            query = query.filter(ExamAttempt.status == status)
        
        query = query.order_by(ExamAttempt.submitted_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def grade_attempt(
        cls,
        attempt_id: int,
        grades: List[Dict],
        grader_id: int
    ) -> Dict[str, Any]:
        """Manuel değerlendirme yapar."""
        attempt = cls.get_or_404(attempt_id)
        
        if attempt.status not in [AttemptStatus.SUBMITTED, AttemptStatus.GRADED]:
            raise ValidationError('Bu giriş değerlendirilemez')
        
        total_earned = 0
        
        for grade_data in grades:
            answer = AttemptAnswer.query.filter_by(
                attempt_id=attempt_id,
                question_id=grade_data['question_id']
            ).first()
            
            if answer:
                answer.points_earned = grade_data.get('points', 0)
                answer.is_correct = grade_data.get('is_correct', False)
                answer.grader_comment = grade_data.get('comment')
                answer.graded_by = grader_id
                total_earned += answer.points_earned
        
        # Toplam puanı güncelle
        attempt.score = total_earned
        attempt.percentage = (total_earned / attempt.max_score * 100) if attempt.max_score else 0
        attempt.passed = attempt.percentage >= attempt.exam.pass_score
        attempt.status = AttemptStatus.GRADED
        attempt.graded_at = datetime.utcnow()
        
        db.session.commit()
        
        # Sınav istatistiklerini güncelle
        ExamService.update_statistics(attempt.exam_id)
        
        return {
            'attempt_id': attempt.id,
            'score': attempt.score,
            'percentage': attempt.percentage,
            'passed': attempt.passed
        }
