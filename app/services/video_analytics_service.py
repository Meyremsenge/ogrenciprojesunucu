"""
Video Analytics Service.

Redis tabanlı video izlenme sayacı ve analytics servisi.
Real-time izlenme istatistikleri ve kullanıcı davranış analizi.
"""

import json
import time
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from flask import current_app

from app.extensions import db
from app.services.cache_service import CacheService


class WatchEventType(Enum):
    """İzleme olayı türleri."""
    PLAY = 'play'              # Video başladı
    PAUSE = 'pause'            # Video duraklatıldı
    RESUME = 'resume'          # Video devam etti
    SEEK = 'seek'              # Video ileri/geri alındı
    COMPLETE = 'complete'      # Video tamamlandı
    PROGRESS = 'progress'      # İlerleme güncellendi
    BUFFER = 'buffer'          # Buffering başladı
    ERROR = 'error'            # Hata oluştu


@dataclass
class WatchSession:
    """Video izleme oturumu."""
    session_id: str
    video_id: int
    user_id: int
    youtube_video_id: str
    started_at: datetime
    last_activity: datetime
    current_position: int  # saniye
    total_watched: int     # toplam izlenen saniye
    is_completed: bool
    events: List[Dict]


class VideoAnalyticsService:
    """
    Video analytics servisi.
    
    Redis ile real-time izlenme sayacı ve analytics.
    """
    
    # Redis key prefixes
    PREFIX = 'video_analytics:'
    VIEW_COUNT_KEY = PREFIX + 'views:{video_id}'
    UNIQUE_VIEWS_KEY = PREFIX + 'unique_views:{video_id}'
    DAILY_VIEWS_KEY = PREFIX + 'daily:{video_id}:{date}'
    HOURLY_VIEWS_KEY = PREFIX + 'hourly:{video_id}:{date}:{hour}'
    WATCH_SESSION_KEY = PREFIX + 'session:{session_id}'
    USER_HISTORY_KEY = PREFIX + 'history:{user_id}'
    POPULAR_VIDEOS_KEY = PREFIX + 'popular:{period}'
    REALTIME_VIEWERS_KEY = PREFIX + 'realtime:{video_id}'
    
    # TTL values
    SESSION_TTL = 3600 * 2      # 2 saat
    DAILY_TTL = 86400 * 7       # 7 gün
    HOURLY_TTL = 86400          # 1 gün
    HISTORY_TTL = 86400 * 30    # 30 gün
    REALTIME_TTL = 60           # 1 dakika
    
    @classmethod
    def _get_redis(cls):
        """Redis client döner."""
        return CacheService._redis
    
    @classmethod
    def _get_today(cls) -> str:
        """Bugünün tarihini döner."""
        return datetime.utcnow().strftime('%Y-%m-%d')
    
    @classmethod
    def _get_current_hour(cls) -> int:
        """Şu anki saati döner."""
        return datetime.utcnow().hour
    
    # =========================================================================
    # View Count Operations
    # =========================================================================
    
    @classmethod
    def increment_view_count(
        cls,
        video_id: int,
        user_id: int = None,
        increment_unique: bool = True
    ) -> int:
        """
        Video izlenme sayacını artırır.
        
        Args:
            video_id: Video ID
            user_id: Kullanıcı ID (unique views için)
            increment_unique: Unique views sayacını da artır
            
        Returns:
            Yeni toplam izlenme sayısı
        """
        redis = cls._get_redis()
        
        if not redis:
            # Redis yoksa DB'ye doğrudan yaz
            return cls._increment_db_view_count(video_id)
        
        # Toplam view count
        view_key = cls.VIEW_COUNT_KEY.format(video_id=video_id)
        total_views = redis.incr(view_key)
        
        # Günlük view count
        daily_key = cls.DAILY_VIEWS_KEY.format(
            video_id=video_id,
            date=cls._get_today()
        )
        redis.incr(daily_key)
        redis.expire(daily_key, cls.DAILY_TTL)
        
        # Saatlik view count
        hourly_key = cls.HOURLY_VIEWS_KEY.format(
            video_id=video_id,
            date=cls._get_today(),
            hour=cls._get_current_hour()
        )
        redis.incr(hourly_key)
        redis.expire(hourly_key, cls.HOURLY_TTL)
        
        # Unique views (user bazlı)
        if user_id and increment_unique:
            unique_key = cls.UNIQUE_VIEWS_KEY.format(video_id=video_id)
            redis.sadd(unique_key, user_id)
        
        # Real-time viewers
        cls._update_realtime_viewers(video_id, user_id, 'add')
        
        # Periyodik olarak DB'ye sync et
        if total_views % 10 == 0:  # Her 10 izlenmede bir
            cls._sync_to_database(video_id, total_views)
        
        return total_views
    
    @classmethod
    def get_view_count(cls, video_id: int) -> int:
        """Video izlenme sayısını döner."""
        redis = cls._get_redis()
        
        if redis:
            view_key = cls.VIEW_COUNT_KEY.format(video_id=video_id)
            count = redis.get(view_key)
            if count:
                return int(count)
        
        # Redis'te yoksa DB'den al
        from app.modules.contents.models import Video
        video = Video.query.get(video_id)
        return video.view_count if video else 0
    
    @classmethod
    def get_unique_view_count(cls, video_id: int) -> int:
        """Benzersiz izleyici sayısını döner."""
        redis = cls._get_redis()
        
        if not redis:
            return 0
        
        unique_key = cls.UNIQUE_VIEWS_KEY.format(video_id=video_id)
        return redis.scard(unique_key)
    
    @classmethod
    def get_daily_views(cls, video_id: int, days: int = 7) -> Dict[str, int]:
        """Son N günün izlenme sayılarını döner."""
        redis = cls._get_redis()
        result = {}
        
        if not redis:
            return result
        
        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d')
            key = cls.DAILY_VIEWS_KEY.format(video_id=video_id, date=date)
            count = redis.get(key)
            result[date] = int(count) if count else 0
        
        return result
    
    @classmethod
    def get_hourly_views(cls, video_id: int, date: str = None) -> Dict[int, int]:
        """Belirli bir günün saatlik izlenme sayılarını döner."""
        redis = cls._get_redis()
        result = {}
        date = date or cls._get_today()
        
        if not redis:
            return result
        
        for hour in range(24):
            key = cls.HOURLY_VIEWS_KEY.format(
                video_id=video_id,
                date=date,
                hour=hour
            )
            count = redis.get(key)
            result[hour] = int(count) if count else 0
        
        return result
    
    @classmethod
    def get_realtime_viewers(cls, video_id: int) -> int:
        """Şu an videoyu izleyen kullanıcı sayısını döner."""
        redis = cls._get_redis()
        
        if not redis:
            return 0
        
        key = cls.REALTIME_VIEWERS_KEY.format(video_id=video_id)
        return redis.scard(key)
    
    @classmethod
    def _update_realtime_viewers(
        cls,
        video_id: int,
        user_id: int,
        action: str = 'add'
    ):
        """Real-time viewers setini günceller."""
        redis = cls._get_redis()
        
        if not redis or not user_id:
            return
        
        key = cls.REALTIME_VIEWERS_KEY.format(video_id=video_id)
        
        if action == 'add':
            redis.sadd(key, user_id)
            redis.expire(key, cls.REALTIME_TTL)
        else:
            redis.srem(key, user_id)
    
    @classmethod
    def _increment_db_view_count(cls, video_id: int) -> int:
        """Veritabanında view count artırır."""
        from app.modules.contents.models import Video
        
        video = Video.query.get(video_id)
        if video:
            video.view_count += 1
            db.session.commit()
            return video.view_count
        return 0
    
    @classmethod
    def _sync_to_database(cls, video_id: int, count: int):
        """Redis'teki count'u veritabanına senkronize eder."""
        from app.modules.contents.models import Video
        
        try:
            video = Video.query.get(video_id)
            if video:
                video.view_count = count
                db.session.commit()
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f'View count sync error: {str(e)}')
    
    # =========================================================================
    # Watch Session Operations
    # =========================================================================
    
    @classmethod
    def start_watch_session(
        cls,
        video_id: int,
        user_id: int,
        youtube_video_id: str
    ) -> str:
        """
        Yeni izleme oturumu başlatır.
        
        Returns:
            Session ID
        """
        import secrets
        
        session_id = secrets.token_urlsafe(16)
        now = datetime.utcnow()
        
        session_data = {
            'session_id': session_id,
            'video_id': video_id,
            'user_id': user_id,
            'youtube_video_id': youtube_video_id,
            'started_at': now.isoformat(),
            'last_activity': now.isoformat(),
            'current_position': 0,
            'total_watched': 0,
            'is_completed': False,
            'events': []
        }
        
        redis = cls._get_redis()
        
        if redis:
            key = cls.WATCH_SESSION_KEY.format(session_id=session_id)
            redis.setex(key, cls.SESSION_TTL, json.dumps(session_data))
        
        # İzlenme sayacını artır
        cls.increment_view_count(video_id, user_id)
        
        return session_id
    
    @classmethod
    def update_watch_session(
        cls,
        session_id: str,
        position: int,
        event_type: WatchEventType,
        extra_data: Dict = None
    ) -> Optional[Dict]:
        """
        İzleme oturumunu günceller.
        
        Args:
            session_id: Oturum ID
            position: Video pozisyonu (saniye)
            event_type: Olay türü
            extra_data: Ek veriler
            
        Returns:
            Güncel oturum verisi
        """
        redis = cls._get_redis()
        
        if not redis:
            return None
        
        key = cls.WATCH_SESSION_KEY.format(session_id=session_id)
        session_json = redis.get(key)
        
        if not session_json:
            return None
        
        session_data = json.loads(session_json)
        now = datetime.utcnow()
        
        # Pozisyon farkını hesapla (gerçek izleme süresi için)
        old_position = session_data.get('current_position', 0)
        if position > old_position:
            session_data['total_watched'] += (position - old_position)
        
        session_data['current_position'] = position
        session_data['last_activity'] = now.isoformat()
        
        # Event kaydet
        event = {
            'type': event_type.value,
            'position': position,
            'timestamp': now.isoformat()
        }
        if extra_data:
            event['data'] = extra_data
        
        session_data['events'].append(event)
        
        # Tamamlanma kontrolü
        if event_type == WatchEventType.COMPLETE:
            session_data['is_completed'] = True
            cls._on_video_completed(session_data)
        
        redis.setex(key, cls.SESSION_TTL, json.dumps(session_data))
        
        return session_data
    
    @classmethod
    def end_watch_session(cls, session_id: str) -> Optional[Dict]:
        """
        İzleme oturumunu sonlandırır.
        
        Returns:
            Final oturum verileri
        """
        redis = cls._get_redis()
        
        if not redis:
            return None
        
        key = cls.WATCH_SESSION_KEY.format(session_id=session_id)
        session_json = redis.get(key)
        
        if not session_json:
            return None
        
        session_data = json.loads(session_json)
        
        # Real-time viewers'dan çıkar
        video_id = session_data.get('video_id')
        user_id = session_data.get('user_id')
        cls._update_realtime_viewers(video_id, user_id, 'remove')
        
        # İlerlemeyi kaydet
        cls._save_watch_progress(session_data)
        
        # Kullanıcı geçmişine ekle
        cls._add_to_user_history(session_data)
        
        # Session'ı sil
        redis.delete(key)
        
        return session_data
    
    @classmethod
    def _on_video_completed(cls, session_data: Dict):
        """Video tamamlandığında çağrılır."""
        video_id = session_data.get('video_id')
        user_id = session_data.get('user_id')
        
        # ContentProgress'i güncelle
        from app.modules.contents.services import ProgressService
        
        try:
            ProgressService.update_video_progress(
                user_id=user_id,
                video_id=video_id,
                position=session_data.get('current_position', 0),
                progress_percentage=100.0
            )
        except Exception as e:
            current_app.logger.error(f'Progress update error: {str(e)}')
    
    @classmethod
    def _save_watch_progress(cls, session_data: Dict):
        """İzleme ilerlemesini kaydeder."""
        video_id = session_data.get('video_id')
        user_id = session_data.get('user_id')
        position = session_data.get('current_position', 0)
        total_watched = session_data.get('total_watched', 0)
        
        # Video süresini al
        from app.modules.contents.models import Video
        video = Video.query.get(video_id)
        
        if not video:
            return
        
        duration = video.duration or 1
        progress = min(100.0, (total_watched / duration) * 100)
        
        from app.modules.contents.services import ProgressService
        
        try:
            ProgressService.update_video_progress(
                user_id=user_id,
                video_id=video_id,
                position=position,
                progress_percentage=progress
            )
        except Exception as e:
            current_app.logger.error(f'Progress save error: {str(e)}')
    
    @classmethod
    def _add_to_user_history(cls, session_data: Dict):
        """Kullanıcı izleme geçmişine ekler."""
        redis = cls._get_redis()
        
        if not redis:
            return
        
        user_id = session_data.get('user_id')
        key = cls.USER_HISTORY_KEY.format(user_id=user_id)
        
        history_entry = {
            'video_id': session_data.get('video_id'),
            'youtube_video_id': session_data.get('youtube_video_id'),
            'watched_at': datetime.utcnow().isoformat(),
            'duration_watched': session_data.get('total_watched', 0),
            'completed': session_data.get('is_completed', False)
        }
        
        redis.lpush(key, json.dumps(history_entry))
        redis.ltrim(key, 0, 99)  # Son 100 izleme
        redis.expire(key, cls.HISTORY_TTL)
    
    # =========================================================================
    # Analytics & Reporting
    # =========================================================================
    
    @classmethod
    def get_video_analytics(cls, video_id: int) -> Dict[str, Any]:
        """Video için tüm analytics verilerini döner."""
        return {
            'total_views': cls.get_view_count(video_id),
            'unique_views': cls.get_unique_view_count(video_id),
            'realtime_viewers': cls.get_realtime_viewers(video_id),
            'daily_views': cls.get_daily_views(video_id, 7),
            'hourly_views': cls.get_hourly_views(video_id)
        }
    
    @classmethod
    def get_user_watch_history(
        cls,
        user_id: int,
        limit: int = 20
    ) -> List[Dict]:
        """Kullanıcının izleme geçmişini döner."""
        redis = cls._get_redis()
        
        if not redis:
            return []
        
        key = cls.USER_HISTORY_KEY.format(user_id=user_id)
        items = redis.lrange(key, 0, limit - 1)
        
        return [json.loads(item) for item in items]
    
    @classmethod
    def get_popular_videos(
        cls,
        period: str = 'daily',
        limit: int = 10
    ) -> List[Dict]:
        """
        Popüler videoları döner.
        
        Args:
            period: 'daily', 'weekly', 'monthly'
            limit: Maksimum video sayısı
        """
        redis = cls._get_redis()
        
        if not redis:
            return []
        
        # Tüm günlük view'ları topla
        from app.modules.contents.models import Video
        
        videos = Video.query.filter_by(
            is_deleted=False
        ).order_by(Video.view_count.desc()).limit(limit).all()
        
        return [
            {
                'video_id': v.id,
                'title': v.title,
                'view_count': v.view_count,
                'thumbnail_url': v.thumbnail_url
            }
            for v in videos
        ]
    
    @classmethod
    def sync_all_to_database(cls):
        """Tüm Redis view count'larını DB'ye senkronize eder."""
        redis = cls._get_redis()
        
        if not redis:
            return
        
        # Tüm view count anahtarlarını bul
        pattern = cls.VIEW_COUNT_KEY.format(video_id='*')
        keys = redis.keys(pattern)
        
        for key in keys:
            try:
                video_id = int(key.split(':')[-1])
                count = int(redis.get(key) or 0)
                cls._sync_to_database(video_id, count)
            except Exception as e:
                current_app.logger.error(f'Sync error for {key}: {str(e)}')
