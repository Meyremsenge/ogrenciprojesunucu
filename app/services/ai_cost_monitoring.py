"""
AI Cost Monitoring Service.

Bu modül AI maliyetlerini izler, raporlar ve bütçe kontrolü yapar.

Features:
- Real-time cost tracking
- Budget alerts
- Usage reports
- Cost optimization suggestions
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta, date
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import func, desc, and_

from app.extensions import db
from app.models.ai import AIUsageLog
from config.ai_production import CostConfig, get_ai_production_config


logger = logging.getLogger(__name__)


class AlertLevel(str, Enum):
    """Maliyet uyarı seviyeleri."""
    INFO = 'info'           # Bilgilendirme
    WARNING = 'warning'     # %80 bütçe
    CRITICAL = 'critical'   # %100 bütçe
    EMERGENCY = 'emergency' # Aşım


@dataclass
class CostAlert:
    """Maliyet uyarısı."""
    level: AlertLevel
    message: str
    current_cost: float
    budget: float
    percentage: float
    timestamp: datetime


class AICostMonitoringService:
    """
    AI maliyet izleme servisi.
    
    Kullanım:
        from app.services.ai_cost_monitoring import AICostMonitoringService
        
        # Günlük rapor
        report = AICostMonitoringService.get_daily_report()
        
        # Bütçe kontrolü
        is_ok = AICostMonitoringService.check_budget()
    """
    
    _alerts: List[CostAlert] = []
    
    # ==========================================================================
    # COST CALCULATION
    # ==========================================================================
    
    @classmethod
    def calculate_token_cost(
        cls,
        model: str,
        input_tokens: int,
        output_tokens: int
    ) -> float:
        """Token kullanımından maliyet hesapla."""
        config = get_ai_production_config()
        return config.cost.calculate_cost(model, input_tokens, output_tokens)
    
    @classmethod
    def estimate_request_cost(
        cls,
        prompt_length: int,
        expected_response_length: int = 500,
        model: Optional[str] = None
    ) -> float:
        """İstek öncesi tahmini maliyet hesapla."""
        config = get_ai_production_config()
        model = model or config.model
        
        # Yaklaşık token hesabı (4 karakter ~ 1 token)
        estimated_input_tokens = prompt_length // 4
        estimated_output_tokens = expected_response_length // 4
        
        return cls.calculate_token_cost(model, estimated_input_tokens, estimated_output_tokens)
    
    # ==========================================================================
    # USAGE TRACKING
    # ==========================================================================
    
    @classmethod
    def get_daily_usage(cls, date_filter: Optional[date] = None) -> Dict[str, Any]:
        """Günlük kullanım istatistikleri."""
        target_date = date_filter or date.today()
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())
        
        # Veritabanından toplam kullanım
        result = db.session.query(
            func.count(AIUsageLog.id).label('request_count'),
            func.sum(AIUsageLog.tokens_used).label('total_tokens'),
            func.avg(AIUsageLog.processing_time_ms).label('avg_latency'),
            func.count(func.distinct(AIUsageLog.user_id)).label('unique_users')
        ).filter(
            AIUsageLog.created_at >= start_of_day,
            AIUsageLog.created_at <= end_of_day,
            AIUsageLog.is_mock == False
        ).first()
        
        # Feature bazlı kullanım
        by_feature = db.session.query(
            AIUsageLog.feature,
            func.count(AIUsageLog.id).label('count'),
            func.sum(AIUsageLog.tokens_used).label('tokens')
        ).filter(
            AIUsageLog.created_at >= start_of_day,
            AIUsageLog.created_at <= end_of_day,
            AIUsageLog.is_mock == False
        ).group_by(AIUsageLog.feature).all()
        
        total_tokens = int(result.total_tokens or 0)
        
        # Maliyet hesapla (varsayılan model ile)
        config = get_ai_production_config()
        estimated_cost = cls.calculate_token_cost(
            config.model,
            total_tokens // 2,  # Yaklaşık input
            total_tokens // 2   # Yaklaşık output
        )
        
        return {
            'date': target_date.isoformat(),
            'request_count': result.request_count or 0,
            'total_tokens': total_tokens,
            'avg_latency_ms': round(result.avg_latency or 0, 2),
            'unique_users': result.unique_users or 0,
            'estimated_cost_usd': round(estimated_cost, 4),
            'by_feature': [
                {
                    'feature': f.feature,
                    'requests': f.count,
                    'tokens': f.tokens
                }
                for f in by_feature
            ]
        }
    
    @classmethod
    def get_monthly_usage(cls, year: int = None, month: int = None) -> Dict[str, Any]:
        """Aylık kullanım istatistikleri."""
        today = date.today()
        year = year or today.year
        month = month or today.month
        
        start_of_month = datetime(year, month, 1)
        if month == 12:
            end_of_month = datetime(year + 1, 1, 1) - timedelta(seconds=1)
        else:
            end_of_month = datetime(year, month + 1, 1) - timedelta(seconds=1)
        
        # Günlük kullanım trendi
        daily_trend = db.session.query(
            func.date(AIUsageLog.created_at).label('date'),
            func.count(AIUsageLog.id).label('requests'),
            func.sum(AIUsageLog.tokens_used).label('tokens')
        ).filter(
            AIUsageLog.created_at >= start_of_month,
            AIUsageLog.created_at <= end_of_month,
            AIUsageLog.is_mock == False
        ).group_by(
            func.date(AIUsageLog.created_at)
        ).order_by(
            func.date(AIUsageLog.created_at)
        ).all()
        
        # Toplam
        total_requests = sum(d.requests for d in daily_trend)
        total_tokens = sum(d.tokens or 0 for d in daily_trend)
        
        # Maliyet hesapla
        config = get_ai_production_config()
        estimated_cost = cls.calculate_token_cost(
            config.model,
            total_tokens // 2,
            total_tokens // 2
        )
        
        return {
            'year': year,
            'month': month,
            'total_requests': total_requests,
            'total_tokens': total_tokens,
            'estimated_cost_usd': round(estimated_cost, 4),
            'budget_usd': config.cost.monthly_budget_usd,
            'budget_percentage': round((estimated_cost / config.cost.monthly_budget_usd) * 100, 2),
            'daily_trend': [
                {
                    'date': d.date.isoformat(),
                    'requests': d.requests,
                    'tokens': d.tokens or 0
                }
                for d in daily_trend
            ]
        }
    
    # ==========================================================================
    # BUDGET CONTROL
    # ==========================================================================
    
    @classmethod
    def check_budget(cls) -> Dict[str, Any]:
        """
        Bütçe kontrolü yap.
        
        Returns:
            {
                'within_budget': bool,
                'daily': {...},
                'monthly': {...},
                'alerts': [...]
            }
        """
        config = get_ai_production_config()
        
        daily_usage = cls.get_daily_usage()
        monthly_usage = cls.get_monthly_usage()
        
        daily_cost = daily_usage['estimated_cost_usd']
        monthly_cost = monthly_usage['estimated_cost_usd']
        
        daily_budget = config.cost.daily_budget_usd
        monthly_budget = config.cost.monthly_budget_usd
        
        daily_percentage = (daily_cost / daily_budget) * 100 if daily_budget > 0 else 0
        monthly_percentage = (monthly_cost / monthly_budget) * 100 if monthly_budget > 0 else 0
        
        alerts = []
        
        # Günlük kontrol
        if daily_percentage >= 100:
            alerts.append(CostAlert(
                level=AlertLevel.CRITICAL,
                message=f'Günlük bütçe aşıldı! ${daily_cost:.2f} / ${daily_budget:.2f}',
                current_cost=daily_cost,
                budget=daily_budget,
                percentage=daily_percentage,
                timestamp=datetime.utcnow()
            ))
        elif daily_percentage >= config.cost.alert_threshold_percent:
            alerts.append(CostAlert(
                level=AlertLevel.WARNING,
                message=f'Günlük bütçe uyarısı: %{daily_percentage:.1f} kullanıldı',
                current_cost=daily_cost,
                budget=daily_budget,
                percentage=daily_percentage,
                timestamp=datetime.utcnow()
            ))
        
        # Aylık kontrol
        if monthly_percentage >= 100:
            alerts.append(CostAlert(
                level=AlertLevel.CRITICAL,
                message=f'Aylık bütçe aşıldı! ${monthly_cost:.2f} / ${monthly_budget:.2f}',
                current_cost=monthly_cost,
                budget=monthly_budget,
                percentage=monthly_percentage,
                timestamp=datetime.utcnow()
            ))
        elif monthly_percentage >= config.cost.alert_threshold_percent:
            alerts.append(CostAlert(
                level=AlertLevel.WARNING,
                message=f'Aylık bütçe uyarısı: %{monthly_percentage:.1f} kullanıldı',
                current_cost=monthly_cost,
                budget=monthly_budget,
                percentage=monthly_percentage,
                timestamp=datetime.utcnow()
            ))
        
        # Alert'leri kaydet
        cls._alerts.extend(alerts)
        
        return {
            'within_budget': daily_percentage < 100 and monthly_percentage < 100,
            'daily': {
                'cost_usd': round(daily_cost, 4),
                'budget_usd': daily_budget,
                'percentage': round(daily_percentage, 2),
                'remaining_usd': round(max(0, daily_budget - daily_cost), 4)
            },
            'monthly': {
                'cost_usd': round(monthly_cost, 4),
                'budget_usd': monthly_budget,
                'percentage': round(monthly_percentage, 2),
                'remaining_usd': round(max(0, monthly_budget - monthly_cost), 4)
            },
            'alerts': [
                {
                    'level': a.level.value,
                    'message': a.message,
                    'percentage': a.percentage
                }
                for a in alerts
            ]
        }
    
    @classmethod
    def can_make_request(cls, estimated_tokens: int = 1000) -> tuple[bool, Optional[str]]:
        """
        İstek yapılabilir mi kontrol et.
        
        Args:
            estimated_tokens: Tahmini token kullanımı
            
        Returns:
            (can_proceed, reason_if_not)
        """
        config = get_ai_production_config()
        
        # Tahmini maliyet
        estimated_cost = cls.calculate_token_cost(
            config.model,
            estimated_tokens // 2,
            estimated_tokens // 2
        )
        
        budget_status = cls.check_budget()
        
        # Günlük limit kontrolü
        daily_remaining = budget_status['daily']['remaining_usd']
        if estimated_cost > daily_remaining:
            return False, f"Günlük bütçe yetersiz. Kalan: ${daily_remaining:.4f}"
        
        # Aylık limit kontrolü
        monthly_remaining = budget_status['monthly']['remaining_usd']
        if estimated_cost > monthly_remaining:
            return False, f"Aylık bütçe yetersiz. Kalan: ${monthly_remaining:.4f}"
        
        return True, None
    
    # ==========================================================================
    # REPORTS
    # ==========================================================================
    
    @classmethod
    def get_cost_report(cls, days: int = 30) -> Dict[str, Any]:
        """
        Detaylı maliyet raporu.
        
        Args:
            days: Son kaç günü raporla
        """
        config = get_ai_production_config()
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Günlük trend
        daily_data = db.session.query(
            func.date(AIUsageLog.created_at).label('date'),
            func.sum(AIUsageLog.tokens_used).label('tokens'),
            func.count(AIUsageLog.id).label('requests')
        ).filter(
            AIUsageLog.created_at >= start_date,
            AIUsageLog.is_mock == False
        ).group_by(
            func.date(AIUsageLog.created_at)
        ).order_by(
            func.date(AIUsageLog.created_at)
        ).all()
        
        # Feature bazlı
        by_feature = db.session.query(
            AIUsageLog.feature,
            func.sum(AIUsageLog.tokens_used).label('tokens'),
            func.count(AIUsageLog.id).label('requests')
        ).filter(
            AIUsageLog.created_at >= start_date,
            AIUsageLog.is_mock == False
        ).group_by(AIUsageLog.feature).all()
        
        # Toplam
        total_tokens = sum(d.tokens or 0 for d in daily_data)
        total_requests = sum(d.requests for d in daily_data)
        
        total_cost = cls.calculate_token_cost(
            config.model,
            total_tokens // 2,
            total_tokens // 2
        )
        
        # Ortalamalar
        avg_tokens_per_request = total_tokens / total_requests if total_requests > 0 else 0
        avg_cost_per_request = total_cost / total_requests if total_requests > 0 else 0
        avg_daily_cost = total_cost / days
        
        return {
            'period_days': days,
            'generated_at': datetime.utcnow().isoformat(),
            'model': config.model,
            
            'summary': {
                'total_requests': total_requests,
                'total_tokens': total_tokens,
                'total_cost_usd': round(total_cost, 4),
                'avg_tokens_per_request': round(avg_tokens_per_request, 2),
                'avg_cost_per_request_usd': round(avg_cost_per_request, 6),
                'avg_daily_cost_usd': round(avg_daily_cost, 4)
            },
            
            'by_feature': [
                {
                    'feature': f.feature,
                    'requests': f.requests,
                    'tokens': f.tokens or 0,
                    'estimated_cost_usd': round(
                        cls.calculate_token_cost(config.model, (f.tokens or 0) // 2, (f.tokens or 0) // 2), 
                        4
                    )
                }
                for f in by_feature
            ],
            
            'daily_trend': [
                {
                    'date': d.date.isoformat(),
                    'requests': d.requests,
                    'tokens': d.tokens or 0,
                    'estimated_cost_usd': round(
                        cls.calculate_token_cost(config.model, (d.tokens or 0) // 2, (d.tokens or 0) // 2), 
                        4
                    )
                }
                for d in daily_data
            ],
            
            'budget': {
                'daily_budget_usd': config.cost.daily_budget_usd,
                'monthly_budget_usd': config.cost.monthly_budget_usd,
                'alert_threshold_percent': config.cost.alert_threshold_percent
            },
            
            'projections': {
                'monthly_projected_cost_usd': round(avg_daily_cost * 30, 2),
                'monthly_budget_percent': round((avg_daily_cost * 30 / config.cost.monthly_budget_usd) * 100, 2)
            }
        }
    
    @classmethod
    def get_optimization_suggestions(cls) -> List[Dict[str, Any]]:
        """Maliyet optimizasyonu önerileri."""
        config = get_ai_production_config()
        report = cls.get_cost_report(days=7)
        suggestions = []
        
        # Token kullanımı yüksekse
        avg_tokens = report['summary']['avg_tokens_per_request']
        if avg_tokens > 800:
            suggestions.append({
                'type': 'token_optimization',
                'priority': 'high',
                'title': 'Token kullanımını azaltın',
                'description': f'Ortalama {avg_tokens:.0f} token/istek kullanılıyor. '
                              f'Prompt\'ları kısaltarak %20-30 tasarruf sağlanabilir.',
                'potential_savings_percent': 25
            })
        
        # Model değişikliği önerisi
        if config.model in ['gpt-4o', 'gpt-4-turbo']:
            suggestions.append({
                'type': 'model_change',
                'priority': 'medium',
                'title': 'Daha ekonomik model kullanın',
                'description': 'gpt-4o-mini modeli benzer kalitede %80 daha ucuzdur.',
                'current_model': config.model,
                'suggested_model': 'gpt-4o-mini',
                'potential_savings_percent': 80
            })
        
        # Feature bazlı analiz
        for feature in report['by_feature']:
            if feature['requests'] > 100 and feature['tokens'] / feature['requests'] > 1000:
                suggestions.append({
                    'type': 'feature_optimization',
                    'priority': 'medium',
                    'title': f'{feature["feature"]} özelliğini optimize edin',
                    'description': f'Bu özellik yüksek token kullanıyor. Caching ekleyebilirsiniz.',
                    'feature': feature['feature'],
                    'potential_savings_percent': 30
                })
        
        # Bütçe uyarısı
        monthly_projection = report['projections']['monthly_projected_cost_usd']
        if monthly_projection > config.cost.monthly_budget_usd * 0.8:
            suggestions.append({
                'type': 'budget_warning',
                'priority': 'critical',
                'title': 'Bütçe aşım riski',
                'description': f'Mevcut hızla ayda ${monthly_projection:.2f} harcanacak. '
                              f'Bütçe: ${config.cost.monthly_budget_usd}',
                'projected_cost': monthly_projection,
                'budget': config.cost.monthly_budget_usd
            })
        
        return suggestions
    
    # ==========================================================================
    # ALERTS
    # ==========================================================================
    
    @classmethod
    def get_recent_alerts(cls, limit: int = 10) -> List[Dict[str, Any]]:
        """Son uyarıları getir."""
        return [
            {
                'level': a.level.value,
                'message': a.message,
                'current_cost': a.current_cost,
                'budget': a.budget,
                'percentage': a.percentage,
                'timestamp': a.timestamp.isoformat()
            }
            for a in cls._alerts[-limit:]
        ]
    
    @classmethod
    def clear_alerts(cls):
        """Uyarıları temizle."""
        cls._alerts.clear()
