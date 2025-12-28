"""
AI Core - Cost Tracker.

AI API maliyetlerini takip eder ve alert sistemi sağlar.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from enum import Enum
import threading

logger = logging.getLogger(__name__)


class AlertLevel(str, Enum):
    """Alert seviyesi."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class CostEntry:
    """Maliyet kaydı."""
    user_id: int
    feature: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "feature": self.feature,
            "model": self.model,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cost_usd": round(self.cost_usd, 6),
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class CostAlert:
    """Maliyet uyarısı."""
    level: AlertLevel
    message: str
    current_value: float
    threshold: float
    metric: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level.value,
            "message": self.message,
            "current_value": round(self.current_value, 4),
            "threshold": round(self.threshold, 4),
            "metric": self.metric,
            "timestamp": self.timestamp.isoformat()
        }


class CostTracker:
    """
    AI maliyet takip sistemi.
    
    Özellikler:
    - Model bazlı fiyatlandırma
    - Günlük/aylık maliyet takibi
    - Kullanıcı bazlı maliyet limiti
    - Threshold-based alerting
    - Redis/Memory storage
    """
    
    # Model fiyatları (USD per 1M tokens)
    MODEL_PRICING = {
        'gpt-4o-mini': {'input': 0.15, 'output': 0.6},
        'gpt-4o': {'input': 2.5, 'output': 10.0},
        'gpt-4-turbo': {'input': 10.0, 'output': 30.0},
        'gpt-4': {'input': 30.0, 'output': 60.0},
        'gpt-3.5-turbo': {'input': 0.5, 'output': 1.5},
        'claude-3-opus': {'input': 15.0, 'output': 75.0},
        'claude-3-sonnet': {'input': 3.0, 'output': 15.0},
        'claude-3-haiku': {'input': 0.25, 'output': 1.25},
    }
    
    # Varsayılan threshold'lar (USD)
    DEFAULT_THRESHOLDS = {
        'daily_warning': 50.0,
        'daily_critical': 100.0,
        'monthly_warning': 500.0,
        'monthly_critical': 1000.0,
        'per_user_daily': 1.0,
        'per_request': 0.10
    }
    
    def __init__(
        self,
        redis_client=None,
        thresholds: Dict[str, float] = None,
        alert_callback: Callable[[CostAlert], None] = None
    ):
        """
        Args:
            redis_client: Redis client instance
            thresholds: Maliyet eşikleri
            alert_callback: Alert callback fonksiyonu
        """
        self._redis = redis_client
        self._thresholds = {**self.DEFAULT_THRESHOLDS, **(thresholds or {})}
        self._alert_callback = alert_callback
        
        # In-memory storage (Redis fallback)
        self._memory_store: Dict[str, Any] = {}
        self._lock = threading.Lock()
        
        # Günlük/aylık toplam cache
        self._daily_total: float = 0.0
        self._monthly_total: float = 0.0
        self._last_reset_day: Optional[str] = None
        self._last_reset_month: Optional[str] = None
    
    def calculate_cost(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int
    ) -> float:
        """
        Maliyet hesapla.
        
        Args:
            model: Model adı
            input_tokens: Giriş token sayısı
            output_tokens: Çıkış token sayısı
            
        Returns:
            Maliyet (USD)
        """
        pricing = self.MODEL_PRICING.get(model, self.MODEL_PRICING['gpt-4o-mini'])
        
        input_cost = (input_tokens / 1_000_000) * pricing['input']
        output_cost = (output_tokens / 1_000_000) * pricing['output']
        
        return input_cost + output_cost
    
    def track(
        self,
        user_id: int,
        feature: str,
        model: str,
        input_tokens: int,
        output_tokens: int
    ) -> CostEntry:
        """
        Maliyeti kaydet ve takip et.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            model: Model adı
            input_tokens: Giriş token sayısı
            output_tokens: Çıkış token sayısı
            
        Returns:
            CostEntry
        """
        cost = self.calculate_cost(model, input_tokens, output_tokens)
        
        entry = CostEntry(
            user_id=user_id,
            feature=feature,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost
        )
        
        # Kaydet
        self._save_entry(entry)
        
        # Günlük/aylık toplamları güncelle
        self._update_totals(entry)
        
        # Alert kontrolü
        self._check_alerts(entry)
        
        return entry
    
    def _save_entry(self, entry: CostEntry) -> None:
        """Entry'yi kaydet."""
        today = datetime.utcnow().strftime('%Y-%m-%d')
        month = datetime.utcnow().strftime('%Y-%m')
        
        with self._lock:
            # Günlük kayıtlar
            daily_key = f"cost:daily:{today}"
            if daily_key not in self._memory_store:
                self._memory_store[daily_key] = []
            self._memory_store[daily_key].append(entry.to_dict())
            
            # Kullanıcı bazlı günlük
            user_daily_key = f"cost:user:{entry.user_id}:{today}"
            if user_daily_key not in self._memory_store:
                self._memory_store[user_daily_key] = 0.0
            self._memory_store[user_daily_key] += entry.cost_usd
    
    def _update_totals(self, entry: CostEntry) -> None:
        """Günlük/aylık toplamları güncelle."""
        today = datetime.utcnow().strftime('%Y-%m-%d')
        month = datetime.utcnow().strftime('%Y-%m')
        
        with self._lock:
            # Gün değiştiyse reset
            if self._last_reset_day != today:
                self._daily_total = 0.0
                self._last_reset_day = today
            
            # Ay değiştiyse reset
            if self._last_reset_month != month:
                self._monthly_total = 0.0
                self._last_reset_month = month
            
            self._daily_total += entry.cost_usd
            self._monthly_total += entry.cost_usd
    
    def _check_alerts(self, entry: CostEntry) -> None:
        """Alert kontrolü yap."""
        alerts = []
        
        # İstek başı maliyet kontrolü
        if entry.cost_usd > self._thresholds['per_request']:
            alerts.append(CostAlert(
                level=AlertLevel.WARNING,
                message=f"Yüksek maliyetli istek: ${entry.cost_usd:.4f}",
                current_value=entry.cost_usd,
                threshold=self._thresholds['per_request'],
                metric="per_request"
            ))
        
        # Günlük toplam kontrolü
        if self._daily_total > self._thresholds['daily_critical']:
            alerts.append(CostAlert(
                level=AlertLevel.CRITICAL,
                message=f"Günlük maliyet kritik seviyede: ${self._daily_total:.2f}",
                current_value=self._daily_total,
                threshold=self._thresholds['daily_critical'],
                metric="daily_total"
            ))
        elif self._daily_total > self._thresholds['daily_warning']:
            alerts.append(CostAlert(
                level=AlertLevel.WARNING,
                message=f"Günlük maliyet uyarı seviyesinde: ${self._daily_total:.2f}",
                current_value=self._daily_total,
                threshold=self._thresholds['daily_warning'],
                metric="daily_total"
            ))
        
        # Aylık toplam kontrolü
        if self._monthly_total > self._thresholds['monthly_critical']:
            alerts.append(CostAlert(
                level=AlertLevel.CRITICAL,
                message=f"Aylık maliyet kritik seviyede: ${self._monthly_total:.2f}",
                current_value=self._monthly_total,
                threshold=self._thresholds['monthly_critical'],
                metric="monthly_total"
            ))
        elif self._monthly_total > self._thresholds['monthly_warning']:
            alerts.append(CostAlert(
                level=AlertLevel.WARNING,
                message=f"Aylık maliyet uyarı seviyesinde: ${self._monthly_total:.2f}",
                current_value=self._monthly_total,
                threshold=self._thresholds['monthly_warning'],
                metric="monthly_total"
            ))
        
        # Kullanıcı günlük maliyet kontrolü
        today = datetime.utcnow().strftime('%Y-%m-%d')
        user_daily_key = f"cost:user:{entry.user_id}:{today}"
        user_daily_cost = self._memory_store.get(user_daily_key, 0.0)
        
        if user_daily_cost > self._thresholds['per_user_daily']:
            alerts.append(CostAlert(
                level=AlertLevel.WARNING,
                message=f"Kullanıcı {entry.user_id} günlük limitini aştı: ${user_daily_cost:.4f}",
                current_value=user_daily_cost,
                threshold=self._thresholds['per_user_daily'],
                metric="per_user_daily"
            ))
        
        # Alert'leri işle
        for alert in alerts:
            self._handle_alert(alert)
    
    def _handle_alert(self, alert: CostAlert) -> None:
        """Alert'i işle."""
        # Log
        log_method = logger.warning if alert.level == AlertLevel.WARNING else logger.critical
        log_method(f"Cost Alert [{alert.level.value}]: {alert.message}")
        
        # Callback
        if self._alert_callback:
            try:
                self._alert_callback(alert)
            except Exception as e:
                logger.error(f"Alert callback error: {e}")
    
    def get_daily_summary(self, date: str = None) -> Dict[str, Any]:
        """
        Günlük maliyet özeti.
        
        Args:
            date: Tarih (YYYY-MM-DD), None ise bugün
            
        Returns:
            Maliyet özeti
        """
        if date is None:
            date = datetime.utcnow().strftime('%Y-%m-%d')
        
        daily_key = f"cost:daily:{date}"
        entries = self._memory_store.get(daily_key, [])
        
        total_cost = sum(e.get('cost_usd', 0) for e in entries)
        total_tokens = sum(e.get('input_tokens', 0) + e.get('output_tokens', 0) for e in entries)
        
        # Model bazlı breakdown
        by_model: Dict[str, float] = {}
        by_feature: Dict[str, float] = {}
        
        for entry in entries:
            model = entry.get('model', 'unknown')
            feature = entry.get('feature', 'unknown')
            cost = entry.get('cost_usd', 0)
            
            by_model[model] = by_model.get(model, 0) + cost
            by_feature[feature] = by_feature.get(feature, 0) + cost
        
        return {
            "date": date,
            "total_cost_usd": round(total_cost, 4),
            "total_tokens": total_tokens,
            "request_count": len(entries),
            "by_model": {k: round(v, 4) for k, v in by_model.items()},
            "by_feature": {k: round(v, 4) for k, v in by_feature.items()},
            "thresholds": {
                "daily_warning": self._thresholds['daily_warning'],
                "daily_critical": self._thresholds['daily_critical'],
                "usage_percent": round((total_cost / self._thresholds['daily_warning']) * 100, 1) if self._thresholds['daily_warning'] > 0 else 0
            }
        }
    
    def get_user_summary(self, user_id: int, date: str = None) -> Dict[str, Any]:
        """
        Kullanıcı maliyet özeti.
        
        Args:
            user_id: Kullanıcı ID
            date: Tarih (YYYY-MM-DD), None ise bugün
            
        Returns:
            Kullanıcı maliyet özeti
        """
        if date is None:
            date = datetime.utcnow().strftime('%Y-%m-%d')
        
        user_daily_key = f"cost:user:{user_id}:{date}"
        user_daily_cost = self._memory_store.get(user_daily_key, 0.0)
        
        return {
            "user_id": user_id,
            "date": date,
            "total_cost_usd": round(user_daily_cost, 4),
            "daily_limit_usd": self._thresholds['per_user_daily'],
            "remaining_usd": round(max(0, self._thresholds['per_user_daily'] - user_daily_cost), 4),
            "limit_exceeded": user_daily_cost > self._thresholds['per_user_daily']
        }
    
    def set_threshold(self, metric: str, value: float) -> None:
        """Threshold güncelle."""
        if metric in self._thresholds:
            self._thresholds[metric] = value
            logger.info(f"Cost threshold updated: {metric} = ${value}")
    
    def get_thresholds(self) -> Dict[str, float]:
        """Mevcut threshold'ları döndür."""
        return self._thresholds.copy()


# Singleton instance
cost_tracker = CostTracker()
