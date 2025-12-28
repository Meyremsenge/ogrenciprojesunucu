"""
YouTube Service for video management.

Gizli YouTube videolarının yönetimi ve metadata senkronizasyonu.
"""

from typing import Optional, Dict, Tuple, List
from datetime import datetime, timedelta
import re
import logging

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from flask import current_app

from app.extensions import db
from app.services.cache_service import CacheService

logger = logging.getLogger(__name__)


class YouTubeService:
    """
    Service for YouTube API operations.
    
    Gizli video desteği, metadata senkronizasyonu ve cache.
    """
    
    # Cache TTL değerleri
    VIDEO_INFO_CACHE_TTL = 3600  # 1 saat
    PLAYLIST_CACHE_TTL = 1800    # 30 dakika
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or current_app.config.get('YOUTUBE_API_KEY')
        self._youtube = None
    
    @property
    def youtube(self):
        """Lazy initialization of YouTube API client."""
        if self._youtube is None:
            if not self.api_key:
                raise ValueError('YouTube API key is not configured')
            self._youtube = build('youtube', 'v3', developerKey=self.api_key)
        return self._youtube
    
    def get_video_info(
        self,
        video_id: str,
        use_cache: bool = True
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Get video information from YouTube.
        
        Args:
            video_id: YouTube video ID
            use_cache: Cache kullan
            
        Returns:
            Tuple of (video_info, error_message)
        """
        # Cache kontrol
        if use_cache:
            cache_key = f'youtube:video:{video_id}'
            cached = CacheService.get(cache_key)
            if cached:
                return cached, None
        
        try:
            response = self.youtube.videos().list(
                part='snippet,contentDetails,statistics,status',
                id=video_id
            ).execute()
            
            if not response.get('items'):
                return None, 'Video not found'
            
            video = response['items'][0]
            snippet = video['snippet']
            content_details = video['contentDetails']
            statistics = video.get('statistics', {})
            status = video.get('status', {})
            
            # Parse duration (ISO 8601 format)
            duration_seconds = self._parse_duration(content_details.get('duration', 'PT0S'))
            
            video_info = {
                'id': video_id,
                'title': snippet.get('title'),
                'description': snippet.get('description'),
                'thumbnail_url': self._get_best_thumbnail(snippet.get('thumbnails', {})),
                'thumbnails': snippet.get('thumbnails', {}),
                'duration_seconds': duration_seconds,
                'duration_formatted': self._format_duration(duration_seconds),
                'published_at': snippet.get('publishedAt'),
                'channel_id': snippet.get('channelId'),
                'channel_title': snippet.get('channelTitle'),
                'view_count': int(statistics.get('viewCount', 0)),
                'like_count': int(statistics.get('likeCount', 0)),
                'comment_count': int(statistics.get('commentCount', 0)),
                'privacy_status': status.get('privacyStatus'),
                'embeddable': status.get('embeddable', True),
                'license': status.get('license'),
                'tags': snippet.get('tags', []),
                'category_id': snippet.get('categoryId'),
                'default_language': snippet.get('defaultLanguage'),
                'embed_html': self._get_embed_html(video_id),
                'embed_url': self.get_video_embed_url(video_id),
            }
            
            # Cache'e kaydet
            if use_cache:
                CacheService.set(cache_key, video_info, ttl=self.VIDEO_INFO_CACHE_TTL)
            
            return video_info, None
            
        except HttpError as e:
            error_reason = str(e)
            if 'quotaExceeded' in error_reason:
                return None, 'YouTube API quota exceeded'
            if 'forbidden' in error_reason.lower():
                return None, 'Video is not accessible (private or restricted)'
            return None, f'YouTube API error: {error_reason}'
        except Exception as e:
            logger.error(f'YouTube API error: {str(e)}')
            return None, f'Error fetching video info: {str(e)}'
    
    def validate_video_id(self, video_id: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that a YouTube video ID exists and is accessible.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        video_info, error = self.get_video_info(video_id, use_cache=False)
        
        if error:
            return False, error
        
        return True, None
    
    def check_video_embeddable(self, video_id: str) -> Tuple[bool, Optional[str]]:
        """
        Video embed edilebilir mi kontrol eder.
        
        Gizli videolar için embed ayarı kontrol edilir.
        """
        video_info, error = self.get_video_info(video_id)
        
        if error:
            return False, error
        
        if not video_info.get('embeddable', True):
            return False, 'Bu video embed edilemez durumda'
        
        privacy = video_info.get('privacy_status')
        if privacy == 'private':
            return False, 'Özel videolar embed edilemez. Lütfen "unlisted" (gizli) olarak ayarlayın.'
        
        return True, None
    
    def get_video_embed_url(
        self,
        video_id: str,
        autoplay: bool = False,
        start_time: int = 0,
        privacy_enhanced: bool = True
    ) -> str:
        """
        Get YouTube embed URL with security parameters.
        
        Args:
            video_id: YouTube video ID
            autoplay: Otomatik oynat
            start_time: Başlangıç zamanı (saniye)
            privacy_enhanced: youtube-nocookie.com kullan
        """
        # Privacy-enhanced mode (recommended for GDPR)
        domain = 'www.youtube-nocookie.com' if privacy_enhanced else 'www.youtube.com'
        base_url = f'https://{domain}/embed/{video_id}'
        
        params = [
            'rel=0',              # Don't show related videos from other channels
            'modestbranding=1',   # Minimal YouTube branding
            'enablejsapi=1',      # Enable JavaScript API for tracking
        ]
        
        # Origin kontrolü için
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        params.append(f'origin={frontend_url}')
        
        if autoplay:
            params.append('autoplay=1')
            params.append('mute=1')  # Autoplay requires mute
        
        if start_time > 0:
            params.append(f'start={start_time}')
        
        return f'{base_url}?{"&".join(params)}'
        
        return base_url
    
    def _parse_duration(self, duration: str) -> int:
        """Parse ISO 8601 duration to seconds."""
        pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
        match = re.match(pattern, duration)
        
        if not match:
            return 0
        
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        return hours * 3600 + minutes * 60 + seconds
    
    def _format_duration(self, seconds: int) -> str:
        """Süreyi formatla."""
        hours, remainder = divmod(seconds, 3600)
        minutes, secs = divmod(remainder, 60)
        
        if hours > 0:
            return f'{hours:02d}:{minutes:02d}:{secs:02d}'
        return f'{minutes:02d}:{secs:02d}'
    
    def _get_best_thumbnail(self, thumbnails: Dict) -> str:
        """Get the best quality thumbnail URL."""
        # Priority: maxres > high > medium > default
        for quality in ['maxres', 'high', 'medium', 'default']:
            if quality in thumbnails:
                return thumbnails[quality]['url']
        
        return ''
    
    def _get_embed_html(
        self,
        video_id: str,
        width: int = 560,
        height: int = 315
    ) -> str:
        """Generate embed HTML for video."""
        embed_url = self.get_video_embed_url(video_id)
        
        return f'''<iframe 
    width="{width}" 
    height="{height}" 
    src="{embed_url}" 
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen>
</iframe>'''
    
    def sync_video_metadata(self, db_video_id: int) -> Tuple[bool, Optional[str]]:
        """
        Veritabanındaki video kaydını YouTube'dan güncel bilgilerle senkronize eder.
        
        Args:
            db_video_id: Veritabanındaki video ID
            
        Returns:
            Tuple of (success, error_message)
        """
        from app.modules.contents.models import Video
        
        video = Video.query.get(db_video_id)
        if not video:
            return False, 'Video bulunamadı'
        
        if not video.video_id:
            return False, 'YouTube video ID bulunamadı'
        
        # YouTube'dan bilgileri al
        yt_info, error = self.get_video_info(video.video_id, use_cache=False)
        
        if error:
            return False, error
        
        # Veritabanını güncelle
        video.title = yt_info.get('title') or video.title
        video.description = yt_info.get('description') or video.description
        video.thumbnail_url = yt_info.get('thumbnail_url') or video.thumbnail_url
        video.duration = yt_info.get('duration_seconds', 0)
        
        # Metadata'ya ek bilgileri kaydet
        video.metadata = video.metadata or {}
        video.metadata.update({
            'youtube_channel_id': yt_info.get('channel_id'),
            'youtube_channel_title': yt_info.get('channel_title'),
            'youtube_view_count': yt_info.get('view_count'),
            'youtube_like_count': yt_info.get('like_count'),
            'privacy_status': yt_info.get('privacy_status'),
            'last_synced_at': datetime.utcnow().isoformat()
        })
        
        db.session.commit()
        
        return True, None
    
    def bulk_sync_videos(self, video_ids: List[int]) -> Dict[str, any]:
        """
        Birden fazla videoyu senkronize eder.
        
        Returns:
            Dict with success_count, failed_count, errors
        """
        results = {
            'success_count': 0,
            'failed_count': 0,
            'errors': []
        }
        
        for video_id in video_ids:
            success, error = self.sync_video_metadata(video_id)
            
            if success:
                results['success_count'] += 1
            else:
                results['failed_count'] += 1
                results['errors'].append({
                    'video_id': video_id,
                    'error': error
                })
        
        return results
    
    def get_playlist_videos(
        self,
        playlist_id: str,
        max_results: int = 50,
        use_cache: bool = True
    ) -> Tuple[Optional[List], Optional[str]]:
        """
        Get all videos from a YouTube playlist.
        
        Returns:
            Tuple of (videos_list, error_message)
        """
        # Cache kontrol
        if use_cache:
            cache_key = f'youtube:playlist:{playlist_id}'
            cached = CacheService.get(cache_key)
            if cached:
                return cached, None
        
        try:
            videos = []
            next_page_token = None
            
            while True:
                response = self.youtube.playlistItems().list(
                    part='snippet,contentDetails',
                    playlistId=playlist_id,
                    maxResults=min(50, max_results - len(videos)),
                    pageToken=next_page_token
                ).execute()
                
                for item in response.get('items', []):
                    snippet = item['snippet']
                    videos.append({
                        'video_id': snippet['resourceId']['videoId'],
                        'title': snippet['title'],
                        'description': snippet['description'],
                        'thumbnail_url': self._get_best_thumbnail(snippet.get('thumbnails', {})),
                        'position': snippet['position'],
                        'published_at': snippet['publishedAt'],
                    })
                
                next_page_token = response.get('nextPageToken')
                
                if not next_page_token or len(videos) >= max_results:
                    break
            
            # Cache'e kaydet
            if use_cache:
                CacheService.set(cache_key, videos, ttl=self.PLAYLIST_CACHE_TTL)
            
            return videos, None
            
        except HttpError as e:
            return None, f'YouTube API error: {str(e)}'
        except Exception as e:
            return None, f'Error fetching playlist: {str(e)}'
    
    def import_playlist_as_topic(
        self,
        playlist_id: str,
        topic_id: int,
        uploaded_by: int
    ) -> Tuple[Optional[List], Optional[str]]:
        """
        YouTube playlist'ini topic'e video olarak import eder.
        
        Returns:
            Tuple of (created_videos, error_message)
        """
        from app.modules.contents.models import Video, ContentStatus
        from app.modules.contents.services import VideoService
        
        videos, error = self.get_playlist_videos(playlist_id)
        
        if error:
            return None, error
        
        created_videos = []
        
        for i, yt_video in enumerate(videos):
            video_data = {
                'topic_id': topic_id,
                'uploaded_by': uploaded_by,
                'title': yt_video['title'],
                'description': yt_video['description'],
                'video_url': f"https://www.youtube.com/watch?v={yt_video['video_id']}",
                'video_id': yt_video['video_id'],
                'thumbnail_url': yt_video['thumbnail_url'],
                'order': yt_video['position'],
                'content_status': ContentStatus.DRAFT
            }
            
            try:
                video = VideoService.create(video_data, create_version=True)
                
                # Metadata senkronize et
                self.sync_video_metadata(video.id)
                
                created_videos.append(video)
            except Exception as e:
                logger.error(f'Error creating video {yt_video["video_id"]}: {str(e)}')
        
        return created_videos, None


def extract_video_id(url: str) -> Optional[str]:
    """
    Extract YouTube video ID from various URL formats.
    
    Supports:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - VIDEO_ID (direct ID)
    """
    # Direct video ID (11 characters)
    if re.match(r'^[\w-]{11}$', url):
        return url
    
    patterns = [
        r'(?:youtube\.com\/watch\?v=)([\w-]{11})',
        r'(?:youtu\.be\/)([\w-]{11})',
        r'(?:youtube\.com\/embed\/)([\w-]{11})',
        r'(?:youtube\.com\/v\/)([\w-]{11})',
        r'(?:youtube\.com\/shorts\/)([\w-]{11})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


def extract_playlist_id(url: str) -> Optional[str]:
    """
    Extract YouTube playlist ID from URL.
    
    Supports:
    - https://www.youtube.com/playlist?list=PLAYLIST_ID
    - https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
    """
    patterns = [
        r'(?:list=)([\w-]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None
