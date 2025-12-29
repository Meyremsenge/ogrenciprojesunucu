"""
Contents Module - AI Destekli İçerik Servisi.

AI entegrasyonu ile içerik açıklama, sadeleştirme ve örnek önerme.

ÖNEMLİ MİMARİ KARARLAR:
=======================
1. AI içeriği OTOMATİK DEĞİŞTİRMEZ
2. AI yeni içerik OLUŞTURMAZ
3. Admin onayı olmadan kalıcı veri ÜRETMEZ
4. Tüm AI önerileri "suggestion" olarak saklanır
5. Öğrenci sadece soru sorabilir, içerik değiştiremez

Akış:
    Öğrenci Sorusu -> AI Response -> (Öğrenci görür, kaybolur)
    Öğretmen İsteği -> AI Suggestion -> Admin Onayı -> İçerik Güncelleme
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json

from app.extensions import db
from app.modules.ai.services import ai_service
from app.modules.ai.core import AIFeature, AIRole
from app.modules.contents.models import Video, Document, ContentStatus, ContentCategory
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError


class ContentAIFeature:
    """İçerik AI özellikleri."""
    EXPLAIN_CONTENT = 'explain_content'       # İçeriği açıkla
    SIMPLIFY_CONTENT = 'simplify_content'     # İçeriği sadeleştir
    SUGGEST_EXAMPLES = 'suggest_examples'     # Ek örnek öner
    ANSWER_QUESTION = 'answer_question'       # İçerik hakkında soru cevapla
    SUMMARIZE_CONTENT = 'summarize_content'   # İçeriği özetle
    GENERATE_QUIZ = 'generate_quiz'           # Quiz soruları öner (admin onayı gerekir)


class ContentAIService:
    """
    AI destekli içerik servisi.
    
    Bu servis:
    - Öğrencilere içerik hakkında yardım sağlar
    - İçeriği değiştirmez, sadece açıklama yapar
    - Admin onayı olmadan kalıcı veri üretmez
    """
    
    # ==========================================================================
    # ÖĞRENCİ İÇİN READ-ONLY AI FONKSİYONLARI
    # ==========================================================================
    
    @classmethod
    def explain_content(
        cls,
        user_id: int,
        content_id: int,
        content_type: str,  # 'video' veya 'document'
        specific_part: str = None,
        level: str = 'intermediate'  # beginner, intermediate, advanced
    ) -> Dict[str, Any]:
        """
        İçeriği açıkla.
        
        NOT: Bu fonksiyon içeriği DEĞİŞTİRMEZ.
        Sadece öğrenciye anlık açıklama sağlar.
        
        Args:
            user_id: Öğrenci ID
            content_id: İçerik ID
            content_type: 'video' veya 'document'
            specific_part: Belirli bir bölüm (opsiyonel)
            level: Açıklama seviyesi
            
        Returns:
            AI açıklaması (kalıcı olarak saklanmaz)
        """
        content = cls._get_content(content_id, content_type)
        
        # İçerik bilgilerini hazırla
        content_text = cls._extract_content_text(content)
        
        prompt_context = {
            'content_title': content.title,
            'content_description': content.description or '',
            'content_text': content_text[:4000],  # Token limiti için
            'specific_part': specific_part or 'tamamı',
            'level': level,
        }
        
        # AI'dan açıklama al
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.CONTENT_ENHANCEMENT,
            context={
                'action': ContentAIFeature.EXPLAIN_CONTENT,
                **prompt_context
            },
            system_prompt=cls._get_explain_prompt(level),
            max_tokens=1000
        )
        
        return {
            'explanation': result.get('content', ''),
            'content_id': content_id,
            'content_type': content_type,
            'level': level,
            'disclaimer': 'Bu açıklama AI tarafından üretilmiştir ve orijinal içeriği değiştirmez.',
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    @classmethod
    def simplify_content(
        cls,
        user_id: int,
        content_id: int,
        content_type: str,
        target_audience: str = 'high_school'  # elementary, high_school, university
    ) -> Dict[str, Any]:
        """
        İçeriği daha basit dille açıkla.
        
        NOT: Orijinal içerik DEĞİŞMEZ.
        Sadece öğrenciye basitleştirilmiş versiyon gösterilir.
        """
        content = cls._get_content(content_id, content_type)
        content_text = cls._extract_content_text(content)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.CONTENT_ENHANCEMENT,
            context={
                'action': ContentAIFeature.SIMPLIFY_CONTENT,
                'content_title': content.title,
                'content_text': content_text[:4000],
                'target_audience': target_audience,
            },
            system_prompt=cls._get_simplify_prompt(target_audience),
            max_tokens=1200
        )
        
        return {
            'simplified_explanation': result.get('content', ''),
            'content_id': content_id,
            'content_type': content_type,
            'target_audience': target_audience,
            'disclaimer': 'Bu sadeleştirilmiş açıklama AI tarafından üretilmiştir. Orijinal içerik değişmemiştir.',
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    @classmethod
    def suggest_examples(
        cls,
        user_id: int,
        content_id: int,
        content_type: str,
        example_count: int = 3
    ) -> Dict[str, Any]:
        """
        İçerik için ek örnekler öner.
        
        NOT: Bu örnekler içeriğe EKLENMez.
        Sadece öğrenciye gösterilir.
        """
        content = cls._get_content(content_id, content_type)
        content_text = cls._extract_content_text(content)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.CONTENT_ENHANCEMENT,
            context={
                'action': ContentAIFeature.SUGGEST_EXAMPLES,
                'content_title': content.title,
                'content_text': content_text[:3000],
                'example_count': example_count,
            },
            system_prompt=cls._get_examples_prompt(example_count),
            max_tokens=1500
        )
        
        return {
            'examples': result.get('content', ''),
            'content_id': content_id,
            'content_type': content_type,
            'example_count': example_count,
            'disclaimer': 'Bu örnekler AI tarafından üretilmiştir ve içeriğe eklenmemiştir.',
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    @classmethod
    def answer_content_question(
        cls,
        user_id: int,
        content_id: int,
        content_type: str,
        question: str
    ) -> Dict[str, Any]:
        """
        İçerik hakkında sorulan soruyu cevapla.
        
        NOT: Cevap kalıcı olarak saklanmaz.
        Sadece chat benzeri bir etkileşim sağlar.
        """
        if len(question) < 5:
            raise ValidationError('Soru en az 5 karakter olmalıdır')
        if len(question) > 1000:
            raise ValidationError('Soru en fazla 1000 karakter olabilir')
        
        content = cls._get_content(content_id, content_type)
        content_text = cls._extract_content_text(content)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.CONTENT_ENHANCEMENT,
            context={
                'action': ContentAIFeature.ANSWER_QUESTION,
                'content_title': content.title,
                'content_text': content_text[:3500],
                'student_question': question,
            },
            system_prompt=cls._get_qa_prompt(),
            max_tokens=800
        )
        
        return {
            'answer': result.get('content', ''),
            'question': question,
            'content_id': content_id,
            'content_type': content_type,
            'disclaimer': 'Bu cevap AI tarafından üretilmiştir. Doğruluğunu öğretmeninizle teyit edin.',
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    @classmethod
    def summarize_content(
        cls,
        user_id: int,
        content_id: int,
        content_type: str,
        summary_length: str = 'medium'  # short, medium, long
    ) -> Dict[str, Any]:
        """
        İçeriği özetle.
        
        NOT: Özet içeriğe eklenmez, sadece gösterilir.
        """
        content = cls._get_content(content_id, content_type)
        content_text = cls._extract_content_text(content)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.CONTENT_ENHANCEMENT,
            context={
                'action': ContentAIFeature.SUMMARIZE_CONTENT,
                'content_title': content.title,
                'content_text': content_text[:4000],
                'summary_length': summary_length,
            },
            system_prompt=cls._get_summary_prompt(summary_length),
            max_tokens=600 if summary_length == 'short' else 1000
        )
        
        return {
            'summary': result.get('content', ''),
            'content_id': content_id,
            'content_type': content_type,
            'summary_length': summary_length,
            'disclaimer': 'Bu özet AI tarafından üretilmiştir. Orijinal içerik değişmemiştir.',
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    # ==========================================================================
    # ÖĞRETMEN/ADMİN İÇİN ÖNERİ OLUŞTURMA (ONAY GEREKTİRİR)
    # ==========================================================================
    
    @classmethod
    def create_enhancement_suggestion(
        cls,
        user_id: int,
        content_id: int,
        content_type: str,
        enhancement_type: str,  # 'examples', 'quiz', 'summary', 'simplified'
        details: Dict[str, Any] = None
    ) -> 'ContentAISuggestion':
        """
        İçerik iyileştirme önerisi oluştur.
        
        NOT: Bu öneri DOĞRUDAN İÇERİĞE UYGULANMAZ!
        Admin onayından sonra ayrı bir işlemle uygulanır.
        
        Akış:
        1. Öğretmen öneri ister
        2. AI öneri üretir
        3. Öneri 'pending' durumunda kaydedilir
        4. Admin inceler ve onaylar/reddeder
        5. Onaylanırsa ayrı bir işlemle içeriğe uygulanır
        """
        from app.modules.contents.models_ai import ContentAISuggestion, SuggestionStatus
        
        content = cls._get_content(content_id, content_type)
        content_text = cls._extract_content_text(content)
        
        # AI'dan öneri al
        if enhancement_type == 'examples':
            ai_result = ai_service.call_ai(
                user_id=user_id,
                feature=AIFeature.CONTENT_ENHANCEMENT,
                context={
                    'action': 'generate_examples_for_approval',
                    'content_title': content.title,
                    'content_text': content_text[:3000],
                },
                system_prompt=cls._get_examples_prompt(5),
                max_tokens=2000
            )
        elif enhancement_type == 'quiz':
            ai_result = ai_service.call_ai(
                user_id=user_id,
                feature=AIFeature.QUESTION_GENERATION,
                context={
                    'content_title': content.title,
                    'content_text': content_text[:3000],
                    'question_count': details.get('question_count', 5) if details else 5,
                },
                system_prompt=cls._get_quiz_prompt(),
                max_tokens=2500
            )
        else:
            raise ValidationError(f'Geçersiz enhancement_type: {enhancement_type}')
        
        # Öneriyi kaydet (PENDING durumunda)
        suggestion = ContentAISuggestion(
            content_category=ContentCategory.VIDEO if content_type == 'video' else ContentCategory.DOCUMENT,
            content_id=content_id,
            suggestion_type=enhancement_type,
            suggested_content=ai_result.get('content', ''),
            suggested_by_id=user_id,
            status=SuggestionStatus.PENDING,
            ai_model_used=ai_result.get('model', 'unknown'),
            ai_tokens_used=ai_result.get('tokens_used', 0),
        )
        
        db.session.add(suggestion)
        db.session.commit()
        
        return suggestion
    
    # ==========================================================================
    # YARDIMCI METODLAR
    # ==========================================================================
    
    @classmethod
    def _get_content(cls, content_id: int, content_type: str):
        """İçeriği getir."""
        if content_type == 'video':
            content = Video.query.filter_by(id=content_id, is_deleted=False).first()
        elif content_type == 'document':
            content = Document.query.filter_by(id=content_id, is_deleted=False).first()
        else:
            raise ValidationError('Geçersiz content_type. "video" veya "document" olmalı.')
        
        if not content:
            raise NotFoundError(f'{content_type.capitalize()} bulunamadı')
        
        # Sadece yayınlanmış içeriklere AI yardımı verilebilir
        if content.content_status != ContentStatus.PUBLISHED:
            raise ForbiddenError('Bu içerik henüz yayınlanmamış')
        
        return content
    
    @classmethod
    def _extract_content_text(cls, content) -> str:
        """İçerikten metin çıkar."""
        text_parts = [content.title]
        
        if content.description:
            text_parts.append(content.description)
        
        # Video için transcript varsa ekle
        if hasattr(content, 'transcript') and content.transcript:
            text_parts.append(content.transcript)
        
        # Document için içerik varsa ekle
        if hasattr(content, 'content_text') and content.content_text:
            text_parts.append(content.content_text)
        
        # Extra data içinde text varsa
        if content.extra_data and isinstance(content.extra_data, dict):
            if 'content_text' in content.extra_data:
                text_parts.append(content.extra_data['content_text'])
            if 'transcript' in content.extra_data:
                text_parts.append(content.extra_data['transcript'])
        
        return '\n\n'.join(text_parts)
    
    @classmethod
    def _get_explain_prompt(cls, level: str) -> str:
        """Açıklama prompt'u."""
        level_instructions = {
            'beginner': 'Konuyu en basit haliyle, hiç bilmeyen birine anlatır gibi açıkla.',
            'intermediate': 'Konuyu temel bilgisi olan birine açıkla.',
            'advanced': 'Konuyu detaylı ve teknik olarak açıkla.',
        }
        
        return f"""Sen bir eğitim asistanısın. 
Verilen içeriği öğrenciye açıklayacaksın.

{level_instructions.get(level, level_instructions['intermediate'])}

Kurallar:
- Net ve anlaşılır ol
- Örnekler kullan
- Türkçe yanıt ver
- Sadece içerikle ilgili açıklama yap
- İçeriği değiştirme veya yeni içerik oluşturma"""
    
    @classmethod
    def _get_simplify_prompt(cls, target_audience: str) -> str:
        """Sadeleştirme prompt'u."""
        audience_map = {
            'elementary': 'İlkokul öğrencisi',
            'middle_school': 'Ortaokul öğrencisi',
            'high_school': 'Lise öğrencisi',
            'university': 'Üniversite öğrencisi',
        }
        
        audience = audience_map.get(target_audience, 'Lise öğrencisi')
        
        return f"""Sen bir eğitim asistanısın.
Verilen içeriği {audience} seviyesinde basit bir dille açıklayacaksın.

Kurallar:
- Karmaşık terimleri basit kelimelerle açıkla
- Günlük hayattan örnekler ver
- Kısa cümleler kullan
- Türkçe yanıt ver
- Orijinal içeriği değiştirme"""
    
    @classmethod
    def _get_examples_prompt(cls, count: int) -> str:
        """Örnek önerme prompt'u."""
        return f"""Sen bir eğitim asistanısın.
Verilen içerik için {count} adet açıklayıcı örnek üreteceksin.

Kurallar:
- Her örnek gerçek hayattan olsun
- Örnekler içeriğin ana konusunu pekiştirsin
- Her örneği numaralandır
- Türkçe yanıt ver
- Bu örnekler sadece açıklama amaçlıdır, içeriğe eklenmeyecektir"""
    
    @classmethod
    def _get_qa_prompt(cls) -> str:
        """Soru-cevap prompt'u."""
        return """Sen bir eğitim asistanısın.
Öğrencinin içerik hakkındaki sorusunu cevaplayacaksın.

Kurallar:
- Cevabı sadece verilen içerik bağlamında ver
- İçerikte olmayan bilgileri uydurma
- Emin olmadığın konularda "Bu konuda içerikte bilgi yok" de
- Net ve kısa cevaplar ver
- Türkçe yanıt ver
- Öğrenciyi düşünmeye teşvik et"""
    
    @classmethod
    def _get_summary_prompt(cls, length: str) -> str:
        """Özet prompt'u."""
        length_map = {
            'short': '2-3 cümle',
            'medium': '1 paragraf (5-7 cümle)',
            'long': '2-3 paragraf',
        }
        
        target_length = length_map.get(length, length_map['medium'])
        
        return f"""Sen bir eğitim asistanısın.
Verilen içeriği {target_length} uzunluğunda özetleyeceksin.

Kurallar:
- Ana fikirleri vurgula
- Gereksiz detayları atla
- Anlaşılır ve akıcı ol
- Türkçe yanıt ver
- Bu özet sadece görüntüleme amaçlıdır, içeriğe eklenmeyecektir"""
    
    @classmethod
    def _get_quiz_prompt(cls) -> str:
        """Quiz soruları prompt'u."""
        return """Sen bir eğitim asistanısın.
Verilen içerik için çoktan seçmeli quiz soruları üreteceksin.

Her soru için:
- Soru metni
- 4 şık (A, B, C, D)
- Doğru cevap
- Açıklama

Kurallar:
- Sorular içeriğin ana konularını kapsasın
- Zorluk dengeli olsun (kolay-orta-zor)
- Şıklar mantıklı ve ayırt edici olsun
- Türkçe yanıt ver
- JSON formatında döndür

NOT: Bu sorular admin onayından sonra sisteme eklenecektir."""
