"""
Video Module - AI Danışman Servisi.

YouTube videoları için AI destekli öğrenci yardımı.

ÖNEMLİ MİMARİ KARARLAR:
=======================
1. AI video içeriğini ANALİZ ETMEZ
2. AI otomatik ETİKETLEME yapmaz
3. AI otomatik DEĞERLENDİRME yapmaz
4. AI sadece öğrenci sorularına yardım eder
5. Tüm AI yanıtları anlık ve geçicidir

AI'nın YAPTIĞI:
- Öğrenci video sonrası soru sorar -> AI cevaplar
- Video konularını açıklar (description/metadata'dan)
- Tekrar önerileri sunar (izleme geçmişine göre)

AI'nın YAPMADIĞI:
- Video içeriğini otomatik analiz etme
- Video transcript'ini işleme
- Otomatik etiketleme/kategorileme
- Kalite/içerik değerlendirmesi
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

from app.extensions import db
from app.modules.ai.services import ai_service
from app.modules.ai.core import AIFeature
from app.modules.contents.models import Video, ContentStatus
from app.models.content import VideoProgress
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError


class VideoAIFeature:
    """Video AI özellikleri."""
    ASK_ABOUT_VIDEO = 'ask_about_video'           # Video hakkında soru sor
    EXPLAIN_VIDEO_TOPIC = 'explain_video_topic'   # Video konusunu açıkla
    GET_KEY_POINTS = 'get_key_points'             # Ana noktaları listele
    SUGGEST_REVIEW = 'suggest_review'             # Tekrar önerisi ver
    QUIZ_ME = 'quiz_me'                           # Kısa quiz oluştur


class VideoAIService:
    """
    Video için AI danışman servisi.
    
    NOT: Bu servis video içeriğini ANALİZ ETMEZ.
    Sadece video metadata'sı (title, description, tags) ve
    öğrenci soruları üzerinden çalışır.
    """
    
    # ==========================================================================
    # ÖĞRENCİ SORU-CEVAP
    # ==========================================================================
    
    @classmethod
    def ask_about_video(
        cls,
        user_id: int,
        video_id: int,
        question: str,
        timestamp: int = None  # Video'nun hangi saniyesinde soru soruluyor
    ) -> Dict[str, Any]:
        """
        Video hakkında soru sor.
        
        NOT: AI video içeriğini analiz etmez.
        Sadece video metadata'sı ve kullanıcı sorusu üzerinden cevap verir.
        
        Args:
            user_id: Öğrenci ID
            video_id: Video ID
            question: Öğrencinin sorusu
            timestamp: Video'daki konum (saniye)
            
        Returns:
            AI yanıtı (kalıcı olarak saklanmaz)
        """
        if len(question) < 5:
            raise ValidationError('Soru en az 5 karakter olmalıdır')
        if len(question) > 1000:
            raise ValidationError('Soru en fazla 1000 karakter olabilir')
        
        video = cls._get_video(video_id)
        context = cls._build_video_context(video, timestamp)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.CONTENT_ENHANCEMENT,
            context={
                'action': VideoAIFeature.ASK_ABOUT_VIDEO,
                'video_title': video.title,
                'video_description': video.description or '',
                'video_tags': video.tags or [],
                'student_question': question,
                'video_timestamp': timestamp,
                'video_context': context,
            },
            system_prompt=cls._get_qa_prompt(),
            max_tokens=800
        )
        
        return {
            'answer': result.get('content', ''),
            'question': question,
            'video_id': video_id,
            'video_title': video.title,
            'timestamp': timestamp,
            'disclaimer': cls._get_disclaimer('qa'),
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    @classmethod
    def explain_video_topic(
        cls,
        user_id: int,
        video_id: int,
        detail_level: str = 'medium'  # brief, medium, detailed
    ) -> Dict[str, Any]:
        """
        Video konusunu açıkla.
        
        NOT: AI video'yu izlemez veya analiz etmez.
        Sadece başlık, açıklama ve etiketlerden konu çıkarır.
        """
        video = cls._get_video(video_id)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.CONTENT_ENHANCEMENT,
            context={
                'action': VideoAIFeature.EXPLAIN_VIDEO_TOPIC,
                'video_title': video.title,
                'video_description': video.description or '',
                'video_tags': video.tags or [],
                'detail_level': detail_level,
            },
            system_prompt=cls._get_explain_prompt(detail_level),
            max_tokens=1000 if detail_level == 'detailed' else 600
        )
        
        return {
            'explanation': result.get('content', ''),
            'video_id': video_id,
            'video_title': video.title,
            'detail_level': detail_level,
            'disclaimer': cls._get_disclaimer('explain'),
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    @classmethod
    def get_key_points(
        cls,
        user_id: int,
        video_id: int
    ) -> Dict[str, Any]:
        """
        Video'nun ana noktalarını listele.
        
        NOT: Bu bilgi video metadata'sından çıkarılır,
        video içeriği analiz edilmez.
        """
        video = cls._get_video(video_id)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.CONTENT_ENHANCEMENT,
            context={
                'action': VideoAIFeature.GET_KEY_POINTS,
                'video_title': video.title,
                'video_description': video.description or '',
                'video_tags': video.tags or [],
                'video_duration_minutes': video.duration // 60 if video.duration else 0,
            },
            system_prompt=cls._get_key_points_prompt(),
            max_tokens=800
        )
        
        return {
            'key_points': result.get('content', ''),
            'video_id': video_id,
            'video_title': video.title,
            'disclaimer': cls._get_disclaimer('key_points'),
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    # ==========================================================================
    # TEKRAR ÖNERİLERİ
    # ==========================================================================
    
    @classmethod
    def get_review_suggestions(
        cls,
        user_id: int,
        video_id: int = None,
        topic_id: int = None
    ) -> Dict[str, Any]:
        """
        Tekrar önerileri sun.
        
        İzleme geçmişine ve performansa göre hangi videoların
        tekrar izlenmesi gerektiğini önerir.
        
        NOT: AI burada video içeriğini değil, 
        izleme metriklerini değerlendirir.
        """
        from app.models.content import VideoProgress
        
        # Kullanıcının izleme geçmişini al
        progress_query = VideoProgress.query.filter_by(user_id=user_id)
        
        if video_id:
            # Belirli bir video için
            video = cls._get_video(video_id)
            progress = progress_query.filter_by(video_id=video_id).first()
            
            suggestions = cls._analyze_single_video_progress(video, progress)
        elif topic_id:
            # Belirli bir konu için tüm videolar
            from app.modules.contents.models import Video
            videos = Video.query.filter_by(
                topic_id=topic_id,
                content_status=ContentStatus.PUBLISHED,
                is_deleted=False
            ).all()
            
            suggestions = cls._analyze_topic_progress(videos, progress_query.all())
        else:
            # Genel tekrar önerileri
            all_progress = progress_query.all()
            suggestions = cls._analyze_overall_progress(user_id, all_progress)
        
        return {
            'suggestions': suggestions,
            'video_id': video_id,
            'topic_id': topic_id,
            'disclaimer': 'Bu öneriler izleme geçmişinize göre oluşturulmuştur.',
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    @classmethod
    def _analyze_single_video_progress(
        cls,
        video: Video,
        progress: VideoProgress
    ) -> List[Dict[str, Any]]:
        """Tek video için tekrar önerisi."""
        suggestions = []
        
        if not progress:
            suggestions.append({
                'type': 'not_started',
                'message': 'Bu videoyu henüz izlemediniz. İzlemenizi öneriyoruz.',
                'priority': 'high'
            })
            return suggestions
        
        # İzleme oranı
        if video.duration and video.duration > 0:
            watch_ratio = progress.watched_seconds / video.duration
            
            if watch_ratio < 0.5:
                suggestions.append({
                    'type': 'incomplete',
                    'message': f'Bu videonun sadece %{int(watch_ratio * 100)} kadarını izlediniz. Tamamlamanızı öneriyoruz.',
                    'priority': 'high',
                    'resume_position': progress.last_position
                })
            elif watch_ratio < 0.9 and not progress.is_completed:
                suggestions.append({
                    'type': 'almost_complete',
                    'message': 'Videoyu neredeyse tamamladınız. Son kısmı da izleyin.',
                    'priority': 'medium',
                    'resume_position': progress.last_position
                })
        
        # Tekrar izleme önerisi (uzun süredir izlenmemişse)
        if progress.last_watched_at:
            days_since = (datetime.utcnow() - progress.last_watched_at).days
            if days_since > 14:
                suggestions.append({
                    'type': 'review_needed',
                    'message': f'Bu videoyu {days_since} gündür izlemediniz. Pekiştirmek için tekrar izleyebilirsiniz.',
                    'priority': 'low'
                })
        
        return suggestions
    
    @classmethod
    def _analyze_topic_progress(
        cls,
        videos: List[Video],
        all_progress: List[VideoProgress]
    ) -> List[Dict[str, Any]]:
        """Konu bazlı tekrar önerileri."""
        suggestions = []
        progress_map = {p.video_id: p for p in all_progress}
        
        # İzlenmemiş videolar
        unwatched = [v for v in videos if v.id not in progress_map]
        if unwatched:
            suggestions.append({
                'type': 'unwatched_videos',
                'message': f'{len(unwatched)} video henüz izlenmedi',
                'priority': 'high',
                'video_ids': [v.id for v in unwatched[:5]],
                'video_titles': [v.title for v in unwatched[:5]]
            })
        
        # Tamamlanmamış videolar
        incomplete = []
        for video in videos:
            progress = progress_map.get(video.id)
            if progress and not progress.is_completed:
                if video.duration and progress.watched_seconds < video.duration * 0.9:
                    incomplete.append({
                        'video_id': video.id,
                        'title': video.title,
                        'watch_ratio': progress.watched_seconds / video.duration if video.duration else 0
                    })
        
        if incomplete:
            suggestions.append({
                'type': 'incomplete_videos',
                'message': f'{len(incomplete)} video yarım kalmış',
                'priority': 'medium',
                'videos': incomplete[:5]
            })
        
        return suggestions
    
    @classmethod
    def _analyze_overall_progress(
        cls,
        user_id: int,
        all_progress: List[VideoProgress]
    ) -> List[Dict[str, Any]]:
        """Genel tekrar önerileri."""
        suggestions = []
        
        # İstatistikler
        total_watched = len(all_progress)
        completed = len([p for p in all_progress if p.is_completed])
        
        if total_watched == 0:
            suggestions.append({
                'type': 'getting_started',
                'message': 'Henüz video izlemeye başlamamışsınız. Derslere göz atın!',
                'priority': 'high'
            })
            return suggestions
        
        completion_rate = completed / total_watched if total_watched > 0 else 0
        
        if completion_rate < 0.5:
            suggestions.append({
                'type': 'low_completion',
                'message': f'İzlemeye başladığınız videoların sadece %{int(completion_rate * 100)} kadarını tamamladınız. Yarım kalanları tamamlamayı deneyin.',
                'priority': 'medium'
            })
        
        # En eski izlenen ama tekrar edilmemiş
        old_videos = sorted(
            [p for p in all_progress if p.is_completed],
            key=lambda x: x.completed_at or datetime.min
        )[:3]
        
        if old_videos:
            old_days = [(datetime.utcnow() - (p.completed_at or datetime.utcnow())).days for p in old_videos]
            if any(d > 30 for d in old_days):
                suggestions.append({
                    'type': 'spaced_repetition',
                    'message': 'Bazı eski videolarınızı tekrar izlemek öğrenmenizi pekiştirebilir.',
                    'priority': 'low',
                    'video_ids': [p.video_id for p in old_videos]
                })
        
        return suggestions
    
    # ==========================================================================
    # QUIZ OLUŞTURMA (AI destekli)
    # ==========================================================================
    
    @classmethod
    def generate_video_quiz(
        cls,
        user_id: int,
        video_id: int,
        question_count: int = 3
    ) -> Dict[str, Any]:
        """
        Video konusu için kısa quiz oluştur.
        
        NOT: AI video içeriğini analiz etmez.
        Quiz soruları video başlığı, açıklaması ve etiketlerinden üretilir.
        Bu sorular kalıcı olarak kaydedilmez, anlıktır.
        """
        video = cls._get_video(video_id)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.QUESTION_GENERATION,
            context={
                'video_title': video.title,
                'video_description': video.description or '',
                'video_tags': video.tags or [],
                'question_count': min(question_count, 5),
            },
            system_prompt=cls._get_quiz_prompt(question_count),
            max_tokens=1500
        )
        
        return {
            'quiz': result.get('content', ''),
            'video_id': video_id,
            'video_title': video.title,
            'question_count': question_count,
            'disclaimer': cls._get_disclaimer('quiz'),
            'is_ai_generated': True,
            'is_temporary': True,  # Kalıcı değil
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    # ==========================================================================
    # YARDIMCI METODLAR
    # ==========================================================================
    
    @classmethod
    def _get_video(cls, video_id: int) -> Video:
        """Video'yu getir ve erişim kontrolü yap."""
        video = Video.query.filter_by(id=video_id, is_deleted=False).first()
        
        if not video:
            raise NotFoundError('Video bulunamadı')
        
        if video.content_status != ContentStatus.PUBLISHED:
            raise ForbiddenError('Bu video henüz yayınlanmamış')
        
        return video
    
    @classmethod
    def _build_video_context(cls, video: Video, timestamp: int = None) -> str:
        """Video bağlam bilgisi oluştur."""
        parts = [
            f"Video Başlığı: {video.title}",
        ]
        
        if video.description:
            # Description'ı kısalt
            desc = video.description[:500] + '...' if len(video.description) > 500 else video.description
            parts.append(f"Açıklama: {desc}")
        
        if video.tags:
            parts.append(f"Konular: {', '.join(video.tags[:10])}")
        
        if video.duration:
            minutes = video.duration // 60
            parts.append(f"Video Süresi: {minutes} dakika")
        
        if timestamp:
            parts.append(f"Öğrenci şu anda videonun {timestamp // 60}. dakikasında")
        
        return '\n'.join(parts)
    
    @classmethod
    def _get_disclaimer(cls, feature_type: str) -> str:
        """Disclaimer mesajı."""
        disclaimers = {
            'qa': 'Bu yanıt AI tarafından video başlığı ve açıklamasından üretilmiştir. Video içeriği analiz edilmemiştir.',
            'explain': 'Bu açıklama video metadata\'sından üretilmiştir. AI videoyu izlemez veya analiz etmez.',
            'key_points': 'Bu ana noktalar video bilgilerinden çıkarılmıştır. Tam içerik için videoyu izleyin.',
            'quiz': 'Bu sorular video konusuna göre üretilmiştir. Kalıcı değildir ve sisteme kaydedilmez.',
        }
        return disclaimers.get(feature_type, 'Bu içerik AI tarafından üretilmiştir.')
    
    @classmethod
    def _get_qa_prompt(cls) -> str:
        """Soru-cevap prompt'u."""
        return """Sen bir eğitim asistanısın. Öğrenci bir ders videosu hakkında soru soruyor.

ÖNEMLİ: Sen videoyu izlemedin ve içeriğini analiz etmedin.
Sadece video başlığı, açıklaması ve etiketleri sana verildi.

Kurallar:
- Soruyu bu bilgiler ışığında cevapla
- Emin olmadığın konularda "Bu bilgi video açıklamasında yok, videoyu izlemenizi öneririm" de
- Genel konu bilgisi verebilirsin ama spesifik video içeriği hakkında tahmin yapma
- Türkçe yanıt ver
- Kısa ve öz ol"""
    
    @classmethod
    def _get_explain_prompt(cls, detail_level: str) -> str:
        """Konu açıklama prompt'u."""
        length_map = {
            'brief': 'kısa (2-3 cümle)',
            'medium': 'orta (1 paragraf)',
            'detailed': 'detaylı (2-3 paragraf)',
        }
        length = length_map.get(detail_level, length_map['medium'])
        
        return f"""Sen bir eğitim asistanısın. Video konusunu {length} açıklayacaksın.

ÖNEMLİ: Video içeriğini analiz etmedin.
Sadece başlık, açıklama ve etiketlerden konu hakkında bilgi ver.

Kurallar:
- Konunun genel açıklamasını yap
- Videoyu izlemenin önemini vurgula
- Türkçe yanıt ver"""
    
    @classmethod
    def _get_key_points_prompt(cls) -> str:
        """Ana noktalar prompt'u."""
        return """Sen bir eğitim asistanısın. Video hakkında muhtemel ana noktaları listele.

ÖNEMLİ: Video içeriğini analiz etmedin.
Bu liste video başlığı ve açıklamasından çıkarılan MUHTEMEL konulardır.

Kurallar:
- Madde işaretleri kullan
- 3-5 ana nokta listele
- Her nokta kısa olsun
- "Muhtemelen", "Büyük ihtimalle" gibi ifadeler kullan
- Türkçe yanıt ver

NOT: Kesin içerik için videoyu izleyin."""
    
    @classmethod
    def _get_quiz_prompt(cls, count: int) -> str:
        """Quiz prompt'u."""
        return f"""Sen bir eğitim asistanısın. Video konusu hakkında {count} adet çoktan seçmeli soru üret.

ÖNEMLİ: Video içeriğini analiz etmedin.
Sorular video başlığı ve açıklamasındaki konular hakkında olmalı.

Her soru için:
- Soru metni
- 4 şık (A, B, C, D)
- Doğru cevap
- Kısa açıklama

Kurallar:
- Sorular genel konu bilgisini test etsin
- Spesifik video içeriği hakkında soru sorma
- Türkçe yanıt ver

NOT: Bu quiz anlık üretilmiştir ve sisteme kaydedilmez."""
