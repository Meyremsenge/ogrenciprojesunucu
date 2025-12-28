"""
Deterministic Grading Service - Sınav Değerlendirme Servisi.

⚠️ KRİTİK: BU MODÜLDE AI KULLANILMAZ ⚠️

Bu servis tamamen deterministik (kesin sonuçlu) değerlendirme yapar.
Tüm puanlama kuralları sabit ve önceden tanımlıdır.

AI'NIN BU MODÜLDE KULLANILMAMASI GEREKÇELERİ:
============================================

1. HUKUKİ GEREKÇELER:
   - Öğrenci hakları: Sınav sonuçları öğrencinin akademik geleceğini etkiler
   - İtiraz hakkı: AI değerlendirmesi itiraz edilemez ve açıklanamaz
   - Şeffaflık: KVKK/GDPR gereği otomatik kararların açıklanabilir olması gerekir
   - Sorumluluk: AI hatası durumunda yasal sorumluluk belirsizdir
   - Eşitlik: AI bias'ı (önyargısı) bazı öğrenci gruplarını olumsuz etkileyebilir

2. PEDAGOJİK GEREKÇELER:
   - Tutarlılık: Her öğrenci aynı kriterlere göre değerlendirilmeli
   - Öğrenme geri bildirimi: AI açıklamaları pedagojik olarak yetersiz olabilir
   - Öğretmen otoritesi: Değerlendirme öğretmenin sorumluluğundadır
   - Müfredat uyumu: AI müfredatı tam anlayamayabilir
   - Bağlamsal anlayış: AI öğrencinin öğrenme sürecini göz ardı eder

3. GÜVENLİK GEREKÇELERİ:
   - Prompt injection: Öğrenciler AI'yı yanıltmak için özel cevaplar yazabilir
   - Tutarsızlık: AI aynı cevaba farklı zamanlarda farklı puan verebilir
   - Manipülasyon: AI sisteminin manipüle edilmesi riski
   - Veri sızıntısı: Sınav içerikleri AI'ya gönderilirken sızabilir
   - Denetlenebilirlik: AI kararları denetlenemez ve kanıtlanamaz

DEĞERLENDİRME KURALLARI:
========================
- Tek seçim: Seçilen cevap = doğru cevap ise tam puan
- Çoklu seçim: Tüm doğrular seçilmeli, yanlış seçilmemeli
- Doğru/Yanlış: Tam eşleşme gerekir
- Kısa cevap: Normalize edilmiş metin karşılaştırması
- Essay: SADECE öğretmen tarafından manuel değerlendirme
- Boşluk doldurma: Normalize edilmiş metin karşılaştırması
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import re
import unicodedata

from app.extensions import db
from app.modules.exams.models import (
    Question, Answer, AttemptAnswer, ExamAttempt,
    QuestionType, AttemptStatus
)


class GradingRules:
    """
    Değerlendirme kuralları.
    
    Tüm kurallar sabit ve değiştirilemez.
    """
    
    # Puan yuvarlama: 2 ondalık basamak
    DECIMAL_PLACES = 2
    
    # Kısmi puan verme kuralları
    PARTIAL_CREDIT_ENABLED = True
    
    # Çoklu seçimde kısmi puan hesaplama
    MULTIPLE_CHOICE_PARTIAL_CREDIT = True
    
    # Metin karşılaştırma kuralları
    TEXT_COMPARISON_CASE_SENSITIVE = False
    TEXT_COMPARISON_TRIM_WHITESPACE = True
    TEXT_COMPARISON_NORMALIZE_UNICODE = True
    TEXT_COMPARISON_IGNORE_PUNCTUATION = False
    
    # Zaman toleransı (saniye)
    SUBMISSION_TIME_TOLERANCE = 60  # Süre bitiminden 60 saniye sonrasına kadar kabul


class DeterministicGrader:
    """
    Deterministik sınav değerlendirici.
    
    Bu sınıf AI KULLANMAZ. Tüm değerlendirmeler
    önceden tanımlı kurallara göre yapılır.
    """
    
    @classmethod
    def grade_attempt(cls, attempt: ExamAttempt) -> Dict[str, Any]:
        """
        Sınav girişini değerlendir.
        
        Returns:
            {
                'total_points': float,
                'earned_points': float,
                'percentage': float,
                'passed': bool,
                'question_results': [...]
            }
        """
        exam = attempt.exam
        question_results = []
        total_points = Decimal('0')
        earned_points = Decimal('0')
        
        for question in exam.questions:
            total_points += Decimal(str(question.points))
            
            # Öğrencinin cevabını bul
            answer = AttemptAnswer.query.filter_by(
                attempt_id=attempt.id,
                question_id=question.id
            ).first()
            
            # Soruyu değerlendir
            result = cls._grade_question(question, answer)
            question_results.append(result)
            
            earned_points += Decimal(str(result['points_earned']))
            
            # Cevabı güncelle
            if answer:
                answer.is_correct = result['is_correct']
                answer.points_earned = float(result['points_earned'])
        
        # Yüzdeyi hesapla
        if total_points > 0:
            percentage = float((earned_points / total_points * 100).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            ))
        else:
            percentage = 0.0
        
        # Geçti/kaldı
        passed = percentage >= exam.pass_score
        
        return {
            'total_points': float(total_points),
            'earned_points': float(earned_points),
            'percentage': percentage,
            'passed': passed,
            'question_results': question_results,
            'grading_method': 'DETERMINISTIC',  # AI olmadığını belirt
            'grading_rules_version': '1.0.0',
        }
    
    @classmethod
    def _grade_question(
        cls,
        question: Question,
        answer: Optional[AttemptAnswer]
    ) -> Dict[str, Any]:
        """
        Tek soruyu değerlendir.
        """
        result = {
            'question_id': question.id,
            'question_type': question.question_type.value,
            'max_points': question.points,
            'points_earned': 0,
            'is_correct': False,
            'is_partial': False,
            'feedback': None,
            'grading_details': {},
        }
        
        if not answer:
            result['feedback'] = 'Cevap verilmedi'
            return result
        
        # Soru tipine göre değerlendir
        if question.question_type == QuestionType.SINGLE_CHOICE:
            return cls._grade_single_choice(question, answer, result)
        
        elif question.question_type == QuestionType.MULTIPLE_CHOICE:
            return cls._grade_multiple_choice(question, answer, result)
        
        elif question.question_type == QuestionType.TRUE_FALSE:
            return cls._grade_true_false(question, answer, result)
        
        elif question.question_type == QuestionType.SHORT_ANSWER:
            return cls._grade_short_answer(question, answer, result)
        
        elif question.question_type == QuestionType.FILL_BLANK:
            return cls._grade_fill_blank(question, answer, result)
        
        elif question.question_type == QuestionType.ESSAY:
            return cls._handle_essay(question, answer, result)
        
        return result
    
    @classmethod
    def _grade_single_choice(
        cls,
        question: Question,
        answer: AttemptAnswer,
        result: Dict
    ) -> Dict[str, Any]:
        """
        Tek seçimli soruyu değerlendir.
        
        KURAL: Doğru cevap seçildi = tam puan
        """
        selected_ids = answer.selected_answer_ids or []
        correct_answers = [a for a in question.answers if a.is_correct]
        
        if not correct_answers:
            result['feedback'] = 'Sistem hatası: Doğru cevap tanımlanmamış'
            return result
        
        correct_id = correct_answers[0].id
        
        if len(selected_ids) == 1 and selected_ids[0] == correct_id:
            result['is_correct'] = True
            result['points_earned'] = question.points
            result['feedback'] = 'Doğru cevap'
        else:
            result['is_correct'] = False
            result['points_earned'] = 0
            result['feedback'] = 'Yanlış cevap'
        
        result['grading_details'] = {
            'correct_answer_id': correct_id,
            'selected_answer_ids': selected_ids,
        }
        
        return result
    
    @classmethod
    def _grade_multiple_choice(
        cls,
        question: Question,
        answer: AttemptAnswer,
        result: Dict
    ) -> Dict[str, Any]:
        """
        Çoklu seçimli soruyu değerlendir.
        
        KURAL (kısmi puan aktif):
        - Her doğru seçim: +puan/toplam_doğru
        - Her yanlış seçim: -puan/toplam_seçenek (min 0)
        
        KURAL (kısmi puan pasif):
        - Tüm doğrular seçilmeli VE yanlış seçilmemeli
        """
        selected_ids = set(answer.selected_answer_ids or [])
        correct_ids = {a.id for a in question.answers if a.is_correct}
        all_ids = {a.id for a in question.answers}
        wrong_ids = all_ids - correct_ids
        
        # Seçilen doğrular ve yanlışlar
        correct_selected = selected_ids & correct_ids
        wrong_selected = selected_ids & wrong_ids
        correct_missed = correct_ids - selected_ids
        
        if GradingRules.MULTIPLE_CHOICE_PARTIAL_CREDIT:
            # Kısmi puan hesapla
            if len(correct_ids) == 0:
                points = 0
            else:
                points_per_correct = Decimal(str(question.points)) / len(correct_ids)
                penalty_per_wrong = points_per_correct / 2  # Yanlış seçim cezası
                
                earned = points_per_correct * len(correct_selected)
                penalty = penalty_per_wrong * len(wrong_selected)
                
                points = max(Decimal('0'), earned - penalty)
                points = float(points.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
            
            is_fully_correct = (correct_selected == correct_ids) and (len(wrong_selected) == 0)
            is_partial = points > 0 and not is_fully_correct
            
            result['is_correct'] = is_fully_correct
            result['is_partial'] = is_partial
            result['points_earned'] = points
            
            if is_fully_correct:
                result['feedback'] = 'Tam doğru'
            elif is_partial:
                result['feedback'] = f'Kısmi doğru ({len(correct_selected)}/{len(correct_ids)} doğru seçildi)'
            else:
                result['feedback'] = 'Yanlış cevap'
        else:
            # Kısmi puan yok - tam eşleşme gerekli
            is_correct = (selected_ids == correct_ids)
            result['is_correct'] = is_correct
            result['points_earned'] = question.points if is_correct else 0
            result['feedback'] = 'Doğru cevap' if is_correct else 'Yanlış cevap'
        
        result['grading_details'] = {
            'correct_answer_ids': list(correct_ids),
            'selected_answer_ids': list(selected_ids),
            'correct_selected_count': len(correct_selected),
            'wrong_selected_count': len(wrong_selected),
            'missed_count': len(correct_missed),
        }
        
        return result
    
    @classmethod
    def _grade_true_false(
        cls,
        question: Question,
        answer: AttemptAnswer,
        result: Dict
    ) -> Dict[str, Any]:
        """
        Doğru/Yanlış sorusunu değerlendir.
        
        KURAL: Tam eşleşme gerekli
        """
        selected_ids = answer.selected_answer_ids or []
        correct_answers = [a for a in question.answers if a.is_correct]
        
        if not correct_answers:
            result['feedback'] = 'Sistem hatası: Doğru cevap tanımlanmamış'
            return result
        
        correct_id = correct_answers[0].id
        
        is_correct = (len(selected_ids) == 1 and selected_ids[0] == correct_id)
        result['is_correct'] = is_correct
        result['points_earned'] = question.points if is_correct else 0
        result['feedback'] = 'Doğru' if is_correct else 'Yanlış'
        
        result['grading_details'] = {
            'correct_answer_id': correct_id,
            'selected_answer_id': selected_ids[0] if selected_ids else None,
        }
        
        return result
    
    @classmethod
    def _grade_short_answer(
        cls,
        question: Question,
        answer: AttemptAnswer,
        result: Dict
    ) -> Dict[str, Any]:
        """
        Kısa cevaplı soruyu değerlendir.
        
        KURAL: Normalize edilmiş metin karşılaştırması
        """
        given_text = answer.answer_text or ''
        correct_text = question.correct_answer_text or ''
        
        # Metinleri normalize et
        given_normalized = cls._normalize_text(given_text)
        correct_normalized = cls._normalize_text(correct_text)
        
        # Birden fazla kabul edilebilir cevap (virgülle ayrılmış)
        acceptable_answers = [
            cls._normalize_text(ans.strip())
            for ans in correct_text.split('|')
        ]
        
        is_correct = given_normalized in acceptable_answers
        
        result['is_correct'] = is_correct
        result['points_earned'] = question.points if is_correct else 0
        result['feedback'] = 'Doğru cevap' if is_correct else 'Yanlış cevap'
        
        result['grading_details'] = {
            'given_answer_normalized': given_normalized,
            'comparison_method': 'NORMALIZED_TEXT_MATCH',
        }
        
        return result
    
    @classmethod
    def _grade_fill_blank(
        cls,
        question: Question,
        answer: AttemptAnswer,
        result: Dict
    ) -> Dict[str, Any]:
        """
        Boşluk doldurma sorusunu değerlendir.
        
        KURAL: Normalize edilmiş metin karşılaştırması
        """
        # Kısa cevapla aynı mantık
        return cls._grade_short_answer(question, answer, result)
    
    @classmethod
    def _handle_essay(
        cls,
        question: Question,
        answer: AttemptAnswer,
        result: Dict
    ) -> Dict[str, Any]:
        """
        Essay sorusunu işle.
        
        ⚠️ ESSAY SORULARI SADECE ÖĞRETMEN TARAFINDAN DEĞERLENDİRİLİR.
        ⚠️ AI BU TİP SORULARI DEĞERLENDİRMEZ.
        
        Bu fonksiyon sadece cevabın alındığını kaydeder,
        puanlama öğretmen tarafından yapılır.
        """
        result['is_correct'] = None  # Bilinmiyor - öğretmen değerlendirecek
        result['points_earned'] = 0  # Henüz değerlendirilmedi
        result['feedback'] = 'Bu soru öğretmen tarafından değerlendirilecektir'
        result['requires_manual_grading'] = True
        
        result['grading_details'] = {
            'answer_length': len(answer.answer_text or ''),
            'grading_status': 'PENDING_TEACHER_REVIEW',
        }
        
        return result
    
    @classmethod
    def _normalize_text(cls, text: str) -> str:
        """
        Metni karşılaştırma için normalize et.
        
        Kurallar:
        - Baş/son boşlukları kaldır
        - Küçük harfe çevir (case-insensitive ise)
        - Unicode normalizasyonu
        - Çoklu boşlukları tek boşluğa indir
        """
        if not text:
            return ''
        
        normalized = text
        
        if GradingRules.TEXT_COMPARISON_TRIM_WHITESPACE:
            normalized = normalized.strip()
            normalized = re.sub(r'\s+', ' ', normalized)
        
        if GradingRules.TEXT_COMPARISON_NORMALIZE_UNICODE:
            normalized = unicodedata.normalize('NFKC', normalized)
        
        if not GradingRules.TEXT_COMPARISON_CASE_SENSITIVE:
            normalized = normalized.lower()
        
        if GradingRules.TEXT_COMPARISON_IGNORE_PUNCTUATION:
            normalized = re.sub(r'[^\w\s]', '', normalized)
        
        return normalized


class ManualGrader:
    """
    Manuel değerlendirme servisi.
    
    Essay ve diğer manuel değerlendirme gerektiren
    sorular için öğretmen değerlendirmesi.
    """
    
    @classmethod
    def grade_answer(
        cls,
        attempt_answer: AttemptAnswer,
        points: float,
        is_correct: bool,
        comment: str,
        grader_id: int
    ) -> AttemptAnswer:
        """
        Tek cevabı manuel değerlendir.
        
        Args:
            attempt_answer: Değerlendirilecek cevap
            points: Verilen puan
            is_correct: Doğru mu?
            comment: Öğretmen yorumu
            grader_id: Değerlendiren öğretmen ID
        """
        # Puan kontrolü
        max_points = attempt_answer.question.points
        if points < 0:
            raise ValueError('Puan negatif olamaz')
        if points > max_points:
            raise ValueError(f'Puan maksimum {max_points} olabilir')
        
        attempt_answer.points_earned = points
        attempt_answer.is_correct = is_correct
        attempt_answer.grader_comment = comment
        attempt_answer.graded_by = grader_id
        
        db.session.commit()
        return attempt_answer
    
    @classmethod
    def finalize_grading(cls, attempt: ExamAttempt, grader_id: int) -> Dict[str, Any]:
        """
        Sınav değerlendirmesini tamamla.
        
        Tüm sorular değerlendirildikten sonra çağrılır.
        """
        # Tüm cevapları kontrol et
        all_answers = AttemptAnswer.query.filter_by(attempt_id=attempt.id).all()
        
        # Essay soruları değerlendirilmiş mi?
        exam = attempt.exam
        for question in exam.questions:
            if question.question_type == QuestionType.ESSAY:
                answer = next(
                    (a for a in all_answers if a.question_id == question.id),
                    None
                )
                if answer and answer.graded_by is None:
                    raise ValueError(
                        f'Soru {question.id} henüz değerlendirilmedi'
                    )
        
        # Toplam puanı hesapla
        total_earned = sum(a.points_earned or 0 for a in all_answers)
        max_score = attempt.max_score or exam.total_points
        
        percentage = (total_earned / max_score * 100) if max_score > 0 else 0
        
        attempt.score = total_earned
        attempt.percentage = round(percentage, 2)
        attempt.passed = percentage >= exam.pass_score
        attempt.status = AttemptStatus.GRADED
        attempt.graded_at = datetime.utcnow()
        
        db.session.commit()
        
        return {
            'attempt_id': attempt.id,
            'score': attempt.score,
            'percentage': attempt.percentage,
            'passed': attempt.passed,
            'graded_by': grader_id,
            'graded_at': attempt.graded_at.isoformat(),
        }


class GradingAuditLog:
    """
    Değerlendirme denetim kaydı.
    
    Tüm değerlendirme işlemlerini kaydeder.
    """
    
    @staticmethod
    def log_automatic_grading(attempt: ExamAttempt, result: Dict[str, Any]):
        """Otomatik değerlendirmeyi logla."""
        from app.core.audit import audit_service
        
        audit_service.log_event(
            event_type='EXAM_AUTO_GRADED',
            resource_type='exam_attempt',
            resource_id=attempt.id,
            details={
                'exam_id': attempt.exam_id,
                'user_id': attempt.user_id,
                'score': result['earned_points'],
                'percentage': result['percentage'],
                'passed': result['passed'],
                'grading_method': 'DETERMINISTIC',
                'ai_used': False,  # AI KULLANILMADI
            }
        )
    
    @staticmethod
    def log_manual_grading(
        attempt_answer: AttemptAnswer,
        grader_id: int,
        points: float
    ):
        """Manuel değerlendirmeyi logla."""
        from app.core.audit import audit_service
        
        audit_service.log_event(
            event_type='ANSWER_MANUALLY_GRADED',
            resource_type='attempt_answer',
            resource_id=attempt_answer.id,
            user_id=grader_id,
            details={
                'question_id': attempt_answer.question_id,
                'attempt_id': attempt_answer.attempt_id,
                'points_earned': points,
                'grader_id': grader_id,
                'ai_used': False,  # AI KULLANILMADI
            }
        )
