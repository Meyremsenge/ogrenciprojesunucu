"""
Live Classes Module - Ders Sonrası AI Danışman Servisi.

CANLI DERS SIRASINDA AI KULLANILMAZ!
====================================

Bu servis SADECE ders bittikten sonra çalışır.
Öğrenciler ders sonrasında AI'ye sorular sorabilir ve
tekrar önerileri alabilir.

TEKNİK GEREKÇELER - AI'NIN CANLI DERSTE KULLANILMAMASI:
=======================================================

1. GERÇEK ZAMANLI İŞLEM GECİKMESİ (Latency)
   ----------------------------------------
   - AI modelleri (GPT-4, Claude) 500ms-3s yanıt süresi gerektirir
   - Canlı sohbet 100ms altı gecikme bekler
   - 100 öğrenci × 3s = 5 dakika potansiyel gecikme kuyruğu
   - WebSocket/real-time sistemlerde bu gecikme kabul edilemez
   
2. KAYNAK VE MALİYET
   ------------------
   - Canlı derste saniyede onlarca AI isteği oluşabilir
   - Her istek $0.01-0.03 maliyetli (GPT-4)
   - 1 saatlik ders × 100 öğrenci = $50-150 potansiyel maliyet
   - Rate limiting canlı dersi bozar
   
3. BAĞLAM TUTARSIZLIĞI
   --------------------
   - Canlı derste sürekli yeni bilgi akışı var
   - AI önceki bağlamı bilemez (öğretmen ne söyledi?)
   - Öğretmenle çelişen yanıtlar verilebilir
   - Senkronizasyon imkansız
   
4. ÖĞRETMENİN OTORİTESİ
   ---------------------
   - Canlı derste öğretmen tek otorite olmalı
   - AI araya girerse dikkat dağılır
   - Öğrenciler AI'ye güvenip öğretmeni dinlemeyebilir
   - Pedagojik akış bozulur
   
5. TEKNİK ALTYAPI KARMAŞIKLIĞI
   ---------------------------
   - Zoom/Meet/Teams entegrasyonu zaten karmaşık
   - AI chat için ikinci bir real-time kanal gerekir
   - Senkronizasyon, hata yönetimi zorlaşır
   - Tek hata noktası (SPOF) artar
   
6. GÜVENLİK VE MODERASYON
   -----------------------
   - Canlı ortamda AI yanıtı moderasyona gidemez
   - Yanlış/uygunsuz yanıt anında görünür
   - Geri alınamaz
   - Hukuki sorumluluk riski
   
7. ÖLÇEKLENEBİLİRLİK
   ------------------
   - 1000 eş zamanlı ders × 50 öğrenci = 50,000 potansiyel AI isteği/dakika
   - OpenAI rate limit: ~10,000 istek/dakika (Tier 5)
   - Sistem çöker veya çok yavaşlar

SONUÇ:
======
AI, ders SONRASINDA kullanılır:
- Öğrenci düşünme zamanı var
- İstek sayısı kontrollü
- Moderasyon yapılabilir
- Öğretmen otoritesi korunur
- Maliyet öngörülebilir
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

from sqlalchemy import and_

from app.extensions import db
from app.modules.ai.services import ai_service
from app.modules.ai.core import AIFeature
from app.modules.live_classes.models import (
    LiveSession, SessionAttendance, 
    SessionStatus, AttendanceStatus
)
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError


class PostSessionAIFeature:
    """Ders sonrası AI özellikleri."""
    ASK_ABOUT_SESSION = 'ask_about_session'       # Ders hakkında soru sor
    GET_SESSION_SUMMARY = 'get_session_summary'   # Ders özeti al
    SUGGEST_REVIEW = 'suggest_review'             # Tekrar önerisi
    EXPLAIN_TOPIC = 'explain_topic'               # Konu açıklaması
    GENERATE_NOTES = 'generate_notes'             # Çalışma notları oluştur


class PostSessionAIService:
    """
    Ders sonrası AI danışman servisi.
    
    ÖNEMLİ: Bu servis SADECE bitmiş dersler için çalışır.
    Devam eden veya planlanmış dersler için AI yanıt VERMEZ.
    
    AI'nın YAPTIĞI (SADECE DERS SONRASI):
    - Ders konusuyla ilgili soruları cevaplar
    - Tekrar önerileri sunar
    - Çalışma notları önerir
    
    AI'nın YAPMADIĞI:
    - Canlı ders sırasında chat
    - Ders içeriğini otomatik analiz
    - Öğretmenin yerine geçme
    """
    
    # ==========================================================================
    # ERİŞİM KONTROLÜ
    # ==========================================================================
    
    @classmethod
    def _verify_post_session_access(
        cls,
        session_id: int,
        user_id: int
    ) -> LiveSession:
        """
        Ders sonrası AI erişim kontrolü.
        
        Kurallar:
        1. Ders BİTMİŞ olmalı (status = ENDED)
        2. Kullanıcı derse KATILMIŞ olmalı
        3. Ders bitişinden 30 gün geçmemiş olmalı
        
        Returns:
            LiveSession: Erişilebilir oturum
            
        Raises:
            NotFoundError: Oturum bulunamadı
            ForbiddenError: Erişim izni yok
            ValidationError: Ders henüz bitmemiş
        """
        # Oturumu getir
        session = LiveSession.query.filter_by(
            id=session_id,
            is_deleted=False
        ).first()
        
        if not session:
            raise NotFoundError('Canlı ders', session_id)
        
        # ====================================================================
        # KRİTİK KONTROL: Ders bitmiş mi?
        # ====================================================================
        if session.status != SessionStatus.ENDED:
            if session.status == SessionStatus.LIVE:
                raise ValidationError(
                    'Bu ders şu an devam ediyor. '
                    'AI danışman yalnızca ders bittikten sonra kullanılabilir. '
                    'Lütfen dersin bitmesini bekleyin.'
                )
            elif session.status == SessionStatus.SCHEDULED:
                raise ValidationError(
                    'Bu ders henüz başlamadı. '
                    'AI danışman yalnızca ders bittikten sonra kullanılabilir.'
                )
            elif session.status == SessionStatus.CANCELLED:
                raise ValidationError(
                    'Bu ders iptal edilmiş. AI danışman kullanılamaz.'
                )
            else:
                raise ValidationError(
                    'AI danışman yalnızca bitmiş dersler için kullanılabilir.'
                )
        
        # ====================================================================
        # KATILIM KONTROLÜ
        # ====================================================================
        attendance = SessionAttendance.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()
        
        if not attendance:
            raise ForbiddenError(
                'Bu derse katılmadığınız için AI danışman kullanamazsınız.'
            )
        
        # En az bir kez katılmış olmalı
        if attendance.status == AttendanceStatus.REGISTERED and attendance.join_count == 0:
            raise ForbiddenError(
                'Derse kayıt oldunuz ancak katılmadınız. '
                'AI danışman yalnızca derse katılan öğrenciler için kullanılabilir.'
            )
        
        # ====================================================================
        # ZAMAN SINIRI (30 gün)
        # ====================================================================
        if session.actual_end:
            days_since_end = (datetime.utcnow() - session.actual_end).days
            if days_since_end > 30:
                raise ValidationError(
                    f'Bu ders {days_since_end} gün önce sona erdi. '
                    'AI danışman yalnızca son 30 gün içinde biten dersler için kullanılabilir.'
                )
        
        return session
    
    # ==========================================================================
    # DERS SONRASI SORU-CEVAP
    # ==========================================================================
    
    @classmethod
    def ask_about_session(
        cls,
        user_id: int,
        session_id: int,
        question: str
    ) -> Dict[str, Any]:
        """
        Bitmiş ders hakkında soru sor.
        
        Bu fonksiyon:
        - Ders BİTMİŞ olmalı
        - Kullanıcı derse KATILMIŞ olmalı
        - Sadece ders konusuyla ilgili sorulara yanıt verir
        
        AI'nın BİLDİĞİ:
        - Ders başlığı, açıklaması
        - Konu ve kurs bilgisi
        - Ders materyalleri (linkler)
        
        AI'nın BİLMEDİĞİ:
        - Derste gerçekte ne konuşulduğu
        - Öğretmenin özel açıklamaları
        - Ders içi sohbetler
        
        Args:
            user_id: Öğrenci ID
            session_id: Ders oturumu ID
            question: Öğrencinin sorusu
            
        Returns:
            AI yanıtı
        """
        # Girdi validasyonu
        if not question or len(question.strip()) < 5:
            raise ValidationError('Soru en az 5 karakter olmalıdır')
        if len(question) > 1000:
            raise ValidationError('Soru en fazla 1000 karakter olabilir')
        
        # Erişim kontrolü (ders bitmiş + katılmış mı?)
        session = cls._verify_post_session_access(session_id, user_id)
        
        # Ders bağlamını oluştur
        context = cls._build_session_context(session)
        
        # AI'dan yanıt al
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.STUDY_COACH,
            context={
                'action': PostSessionAIFeature.ASK_ABOUT_SESSION,
                'session_title': session.title,
                'session_description': session.description or '',
                'course_name': session.course.title if session.course else '',
                'topic_name': session.topic.title if session.topic else '',
                'session_materials': session.materials or [],
                'session_notes': session.notes or '',
                'student_question': question.strip(),
                'session_context': context,
            },
            system_prompt=cls._get_qa_system_prompt(),
            max_tokens=800
        )
        
        return {
            'answer': result.get('content', ''),
            'question': question,
            'session_id': session_id,
            'session_title': session.title,
            'course_name': session.course.title if session.course else None,
            'disclaimer': cls._get_disclaimer('qa'),
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    @classmethod
    def get_session_summary(
        cls,
        user_id: int,
        session_id: int
    ) -> Dict[str, Any]:
        """
        Ders özeti oluştur.
        
        NOT: Bu özet ders metadata'sından oluşturulur.
        Derste gerçekte ne konuşulduğunu bilemez.
        """
        session = cls._verify_post_session_access(session_id, user_id)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.STUDY_COACH,
            context={
                'action': PostSessionAIFeature.GET_SESSION_SUMMARY,
                'session_title': session.title,
                'session_description': session.description or '',
                'course_name': session.course.title if session.course else '',
                'topic_name': session.topic.title if session.topic else '',
                'session_materials': session.materials or [],
                'session_notes': session.notes or '',
                'session_duration': session.duration_actual or session.duration_minutes,
            },
            system_prompt=cls._get_summary_system_prompt(),
            max_tokens=1000
        )
        
        return {
            'summary': result.get('content', ''),
            'session_id': session_id,
            'session_title': session.title,
            'course_name': session.course.title if session.course else None,
            'disclaimer': cls._get_disclaimer('summary'),
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    # ==========================================================================
    # TEKRAR VE ÇALIŞMA ÖNERİLERİ
    # ==========================================================================
    
    @classmethod
    def get_review_suggestions(
        cls,
        user_id: int,
        session_id: int
    ) -> Dict[str, Any]:
        """
        Tekrar önerileri al.
        
        Ders konusuna göre ne çalışılması gerektiğini önerir.
        """
        session = cls._verify_post_session_access(session_id, user_id)
        
        # Öğrencinin katılım bilgisini al
        attendance = SessionAttendance.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.STUDY_COACH,
            context={
                'action': PostSessionAIFeature.SUGGEST_REVIEW,
                'session_title': session.title,
                'session_description': session.description or '',
                'course_name': session.course.title if session.course else '',
                'topic_name': session.topic.title if session.topic else '',
                'session_materials': session.materials or [],
                'attendance_percentage': attendance.attendance_percentage if attendance else 0,
                'session_duration': session.duration_actual or session.duration_minutes,
            },
            system_prompt=cls._get_review_system_prompt(),
            max_tokens=800
        )
        
        return {
            'suggestions': result.get('content', ''),
            'session_id': session_id,
            'session_title': session.title,
            'attendance_percentage': attendance.attendance_percentage if attendance else 0,
            'disclaimer': cls._get_disclaimer('review'),
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    @classmethod
    def generate_study_notes(
        cls,
        user_id: int,
        session_id: int
    ) -> Dict[str, Any]:
        """
        Çalışma notları oluştur.
        
        Ders konusuna göre çalışma notları önerir.
        """
        session = cls._verify_post_session_access(session_id, user_id)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.STUDY_COACH,
            context={
                'action': PostSessionAIFeature.GENERATE_NOTES,
                'session_title': session.title,
                'session_description': session.description or '',
                'course_name': session.course.title if session.course else '',
                'topic_name': session.topic.title if session.topic else '',
                'session_materials': session.materials or [],
                'session_notes': session.notes or '',
            },
            system_prompt=cls._get_notes_system_prompt(),
            max_tokens=1200
        )
        
        return {
            'notes': result.get('content', ''),
            'session_id': session_id,
            'session_title': session.title,
            'disclaimer': cls._get_disclaimer('notes'),
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    @classmethod
    def explain_session_topic(
        cls,
        user_id: int,
        session_id: int,
        detail_level: str = 'medium'  # brief, medium, detailed
    ) -> Dict[str, Any]:
        """
        Ders konusunu açıkla.
        
        Konuyu farklı detay seviyelerinde açıklar.
        """
        if detail_level not in ['brief', 'medium', 'detailed']:
            detail_level = 'medium'
        
        session = cls._verify_post_session_access(session_id, user_id)
        
        result = ai_service.call_ai(
            user_id=user_id,
            feature=AIFeature.STUDY_COACH,
            context={
                'action': PostSessionAIFeature.EXPLAIN_TOPIC,
                'session_title': session.title,
                'session_description': session.description or '',
                'course_name': session.course.title if session.course else '',
                'topic_name': session.topic.title if session.topic else '',
                'detail_level': detail_level,
            },
            system_prompt=cls._get_explain_system_prompt(detail_level),
            max_tokens=1000 if detail_level == 'detailed' else 600
        )
        
        return {
            'explanation': result.get('content', ''),
            'session_id': session_id,
            'session_title': session.title,
            'detail_level': detail_level,
            'disclaimer': cls._get_disclaimer('explain'),
            'is_ai_generated': True,
            'generated_at': datetime.utcnow().isoformat(),
        }
    
    # ==========================================================================
    # DERS GEÇMİŞİ
    # ==========================================================================
    
    @classmethod
    def get_attended_sessions(
        cls,
        user_id: int,
        days: int = 30,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Kullanıcının katıldığı ve AI kullanabileceği dersleri listele.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        sessions = db.session.query(LiveSession).join(
            SessionAttendance,
            SessionAttendance.session_id == LiveSession.id
        ).filter(
            and_(
                SessionAttendance.user_id == user_id,
                SessionAttendance.join_count > 0,  # En az bir kez katılmış
                LiveSession.status == SessionStatus.ENDED,
                LiveSession.actual_end >= cutoff_date,
                LiveSession.is_deleted == False
            )
        ).order_by(LiveSession.actual_end.desc()).limit(limit).all()
        
        return [
            {
                'session_id': s.id,
                'title': s.title,
                'course_name': s.course.title if s.course else None,
                'topic_name': s.topic.title if s.topic else None,
                'ended_at': s.actual_end.isoformat() if s.actual_end else None,
                'duration_minutes': s.duration_actual or s.duration_minutes,
                'ai_available': True,
            }
            for s in sessions
        ]
    
    # ==========================================================================
    # YARDIMCI METODLAR
    # ==========================================================================
    
    @classmethod
    def _build_session_context(cls, session: LiveSession) -> str:
        """Ders bağlam metni oluştur."""
        parts = []
        
        if session.course:
            parts.append(f"Kurs: {session.course.title}")
        if session.topic:
            parts.append(f"Konu: {session.topic.title}")
        if session.description:
            parts.append(f"Açıklama: {session.description}")
        if session.notes:
            parts.append(f"Öğretmen Notları: {session.notes}")
        if session.materials:
            parts.append(f"Materyaller: {len(session.materials)} adet")
        
        return ' | '.join(parts) if parts else 'Bağlam bilgisi yok'
    
    @classmethod
    def _get_qa_system_prompt(cls) -> str:
        """Soru-cevap için sistem prompt'u."""
        return """Sen bir eğitim asistanısın. Öğrenci katıldığı ders hakkında soru soruyor.

ÖNEMLİ SINIRLAMALAR:
- Derste gerçekte ne konuşulduğunu BİLEMEZSİN
- Öğretmenin söylediklerini VARSAYAMAZSIN
- Sadece ders başlığı, açıklaması ve notlarından bilgi çıkarabilirsin

YAPMALISIN:
- Ders konusuyla ilgili genel bilgi ver
- Anlaşılmayan kavramları açıkla
- İlgili kaynak öner

YAPMAMALISIN:
- "Derste şunu konuşmuş olabilirsiniz" gibi varsayımlar
- Öğretmenin yerine geçme
- Değerlendirme veya not verme

Yanıtın kısa, öz ve yardımcı olmalı."""
    
    @classmethod
    def _get_summary_system_prompt(cls) -> str:
        """Özet için sistem prompt'u."""
        return """Sen bir eğitim asistanısın. Bitmiş bir ders için özet oluşturuyorsun.

ÖNEMLİ:
- Bu özet ders META BİLGİLERİNDEN oluşturuluyor
- Derste gerçekte ne konuşulduğunu BİLEMEZSİN
- Sadece başlık, açıklama ve notlardan bilgi çıkar

YAPMALISIN:
- Ders konusunun genel özetini ver
- Ana kavramları listele
- Konunun önemini açıkla

YAPMAMALISIN:
- "Derste şunlar anlatıldı" gibi kesin ifadeler
- Gerçek ders içeriği hakkında varsayımlar"""
    
    @classmethod
    def _get_review_system_prompt(cls) -> str:
        """Tekrar önerileri için sistem prompt'u."""
        return """Sen bir çalışma koçusun. Öğrenciye ders konusunu pekiştirmesi için öneriler veriyorsun.

YAPMALISIN:
- Konuyla ilgili tekrar önerileri ver
- Pratik yöntemler öner
- Ek kaynaklar öner

YAPMAMALISIN:
- Öğrenciyi değerlendirme
- Dersi kaçırdıysa eleştirme

Katılım oranını dikkate al - düşükse eksikleri nasıl kapatabileceğini anlat."""
    
    @classmethod
    def _get_notes_system_prompt(cls) -> str:
        """Çalışma notları için sistem prompt'u."""
        return """Sen bir eğitim asistanısın. Ders konusuna göre çalışma notları oluşturuyorsun.

YAPMALISIN:
- Ana kavramları maddeler halinde yaz
- Önemli terimleri açıkla
- Hatırlatıcı notlar ekle
- Pratik örnekler öner

FORMAT:
- Madde işaretleri kullan
- Başlıklar ve alt başlıklar
- Önemli noktaları vurgula"""
    
    @classmethod
    def _get_explain_system_prompt(cls, detail_level: str) -> str:
        """Konu açıklaması için sistem prompt'u."""
        level_instructions = {
            'brief': 'Çok kısa ve öz açıkla. Maksimum 2-3 paragraf.',
            'medium': 'Orta detayda açıkla. Temel kavramları kapsasın.',
            'detailed': 'Detaylı açıkla. Örnekler ve alt konuları da dahil et.'
        }
        
        return f"""Sen bir eğitim asistanısın. Ders konusunu açıklıyorsun.

DETAY SEVİYESİ: {detail_level.upper()}
{level_instructions.get(detail_level, level_instructions['medium'])}

YAPMALISIN:
- Konuyu anlaşılır şekilde açıkla
- Gerekirse örnekler ver
- İlgili kavramları dahil et

YAPMAMALISIN:
- Derste ne anlatıldığı hakkında varsayım yapma
- Çok uzun veya karmaşık cevaplar verme"""
    
    @classmethod
    def _get_disclaimer(cls, feature: str) -> str:
        """Uyarı metni."""
        disclaimers = {
            'qa': (
                'Bu yanıt ders metadata\'sından oluşturulmuştur. '
                'Derste gerçekte konuşulanları yansıtmayabilir. '
                'Kesin bilgi için öğretmeninize danışın.'
            ),
            'summary': (
                'Bu özet ders başlığı ve açıklamasından oluşturulmuştur. '
                'Gerçek ders içeriğini temsil etmez.'
            ),
            'review': (
                'Bu tekrar önerileri genel konuya dayanmaktadır. '
                'Derste vurgulanan özel noktaları kapsamayabilir.'
            ),
            'notes': (
                'Bu çalışma notları genel konuya dayanmaktadır. '
                'Ders içeriğiyle birebir örtüşmeyebilir.'
            ),
            'explain': (
                'Bu açıklama ders konusunun genel bilgisidir. '
                'Derste anlatılanlarla farklılık gösterebilir.'
            ),
        }
        return disclaimers.get(feature, 'Bu içerik AI tarafından oluşturulmuştur.')
