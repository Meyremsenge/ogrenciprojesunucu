"""
AI Middleware - Context Limiter.

Conversation context boyutunu sınırlar ve token maliyetini kontrol eder.
"""

import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import tiktoken

logger = logging.getLogger(__name__)


@dataclass
class ContextLimitResult:
    """Context limit sonucu."""
    original_messages: int
    final_messages: int
    original_tokens: int
    final_tokens: int
    truncated: bool
    removed_count: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "original_messages": self.original_messages,
            "final_messages": self.final_messages,
            "original_tokens": self.original_tokens,
            "final_tokens": self.final_tokens,
            "truncated": self.truncated,
            "removed_count": self.removed_count
        }


class ContextLimiter:
    """
    AI conversation context limiter.
    
    Context büyüklüğünü kontrol eder ve maliyeti optimize eder.
    
    Özellikler:
    - Token sayısı sınırlama
    - Mesaj sayısı sınırlama
    - Akıllı kırpma (sistem mesajını korur)
    - Token counting (tiktoken)
    """
    
    # Varsayılan limitler
    DEFAULT_MAX_TOKENS = 2000
    DEFAULT_MAX_MESSAGES = 10
    DEFAULT_MAX_MESSAGE_LENGTH = 4000
    
    # Rol bazlı limitler
    ROLE_LIMITS = {
        'student': {
            'max_tokens': 1500,
            'max_messages': 8,
            'max_message_length': 2000
        },
        'teacher': {
            'max_tokens': 3000,
            'max_messages': 15,
            'max_message_length': 4000
        },
        'admin': {
            'max_tokens': 5000,
            'max_messages': 20,
            'max_message_length': 6000
        },
        'super_admin': {
            'max_tokens': 10000,
            'max_messages': 50,
            'max_message_length': 10000
        }
    }
    
    def __init__(
        self,
        max_tokens: int = None,
        max_messages: int = None,
        max_message_length: int = None,
        model: str = "gpt-4o-mini"
    ):
        """
        Args:
            max_tokens: Maksimum toplam token sayısı
            max_messages: Maksimum mesaj sayısı
            max_message_length: Mesaj başına maksimum karakter
            model: Token counting için model adı
        """
        self.max_tokens = max_tokens or self.DEFAULT_MAX_TOKENS
        self.max_messages = max_messages or self.DEFAULT_MAX_MESSAGES
        self.max_message_length = max_message_length or self.DEFAULT_MAX_MESSAGE_LENGTH
        self.model = model
        
        # Tiktoken encoder
        try:
            self._encoder = tiktoken.encoding_for_model(model)
        except Exception:
            self._encoder = tiktoken.get_encoding("cl100k_base")
    
    def count_tokens(self, text: str) -> int:
        """Metin için token sayısını hesapla."""
        if not text:
            return 0
        try:
            return len(self._encoder.encode(text))
        except Exception:
            # Fallback: yaklaşık hesaplama (4 karakter = 1 token)
            return len(text) // 4
    
    def count_message_tokens(self, message: Dict[str, str]) -> int:
        """Mesaj için token sayısını hesapla."""
        tokens = 0
        tokens += self.count_tokens(message.get('role', ''))
        tokens += self.count_tokens(message.get('content', ''))
        tokens += 4  # Her mesaj için overhead
        return tokens
    
    def limit_context(
        self,
        messages: List[Dict[str, str]],
        role: str = 'student'
    ) -> ContextLimitResult:
        """
        Context'i sınırla.
        
        Args:
            messages: Mesaj listesi
            role: Kullanıcı rolü
            
        Returns:
            ContextLimitResult
        """
        if not messages:
            return ContextLimitResult(
                original_messages=0,
                final_messages=0,
                original_tokens=0,
                final_tokens=0,
                truncated=False,
                removed_count=0
            )
        
        # Rol bazlı limitleri al
        limits = self.ROLE_LIMITS.get(role, self.ROLE_LIMITS['student'])
        max_tokens = limits['max_tokens']
        max_messages = limits['max_messages']
        max_message_length = limits['max_message_length']
        
        original_count = len(messages)
        original_tokens = sum(self.count_message_tokens(m) for m in messages)
        
        # Kopyala
        limited_messages = list(messages)
        
        # 1. Uzun mesajları kırp
        for i, msg in enumerate(limited_messages):
            content = msg.get('content', '')
            if len(content) > max_message_length:
                limited_messages[i] = {
                    **msg,
                    'content': content[:max_message_length] + "...[kırpıldı]"
                }
        
        # 2. Mesaj sayısını sınırla (sistem mesajını koru)
        if len(limited_messages) > max_messages:
            # İlk mesaj sistem mesajı ise koru
            if limited_messages[0].get('role') == 'system':
                system_msg = limited_messages[0]
                other_msgs = limited_messages[1:]
                # Son mesajları al
                other_msgs = other_msgs[-(max_messages - 1):]
                limited_messages = [system_msg] + other_msgs
            else:
                limited_messages = limited_messages[-max_messages:]
        
        # 3. Token sayısını sınırla
        while True:
            total_tokens = sum(self.count_message_tokens(m) for m in limited_messages)
            if total_tokens <= max_tokens:
                break
            
            # En az 2 mesaj kalmalı (sistem + 1 kullanıcı)
            if len(limited_messages) <= 2:
                break
            
            # Sistem mesajını koruyarak en eski mesajı kaldır
            if limited_messages[0].get('role') == 'system':
                limited_messages.pop(1)
            else:
                limited_messages.pop(0)
        
        final_tokens = sum(self.count_message_tokens(m) for m in limited_messages)
        final_count = len(limited_messages)
        
        result = ContextLimitResult(
            original_messages=original_count,
            final_messages=final_count,
            original_tokens=original_tokens,
            final_tokens=final_tokens,
            truncated=(original_count != final_count or original_tokens != final_tokens),
            removed_count=original_count - final_count
        )
        
        if result.truncated:
            logger.info(
                f"Context truncated: {original_count} -> {final_count} messages, "
                f"{original_tokens} -> {final_tokens} tokens"
            )
        
        return result
    
    def get_safe_messages(
        self,
        messages: List[Dict[str, str]],
        role: str = 'student'
    ) -> List[Dict[str, str]]:
        """
        Güvenli mesaj listesi döndür.
        
        Args:
            messages: Mesaj listesi
            role: Kullanıcı rolü
            
        Returns:
            Sınırlandırılmış mesaj listesi
        """
        if not messages:
            return []
        
        # Rol bazlı limitleri al
        limits = self.ROLE_LIMITS.get(role, self.ROLE_LIMITS['student'])
        max_tokens = limits['max_tokens']
        max_messages = limits['max_messages']
        max_message_length = limits['max_message_length']
        
        # Kopyala ve işle
        safe_messages = []
        
        for msg in messages[-max_messages:]:
            content = msg.get('content', '')
            if len(content) > max_message_length:
                content = content[:max_message_length] + "...[kırpıldı]"
            
            safe_messages.append({
                **msg,
                'content': content
            })
        
        # Token sınırlaması
        total_tokens = sum(self.count_message_tokens(m) for m in safe_messages)
        while total_tokens > max_tokens and len(safe_messages) > 2:
            if safe_messages[0].get('role') == 'system':
                safe_messages.pop(1)
            else:
                safe_messages.pop(0)
            total_tokens = sum(self.count_message_tokens(m) for m in safe_messages)
        
        return safe_messages
    
    def estimate_cost(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        response_tokens: int = 500
    ) -> Dict[str, float]:
        """
        Maliyet tahmini yap.
        
        Args:
            messages: Mesaj listesi
            model: Model adı
            response_tokens: Beklenen yanıt token sayısı
            
        Returns:
            Maliyet bilgileri
        """
        # Model fiyatları (USD per 1M tokens)
        PRICING = {
            'gpt-4o-mini': {'input': 0.15, 'output': 0.6},
            'gpt-4o': {'input': 2.5, 'output': 10.0},
            'gpt-4-turbo': {'input': 10.0, 'output': 30.0},
            'gpt-3.5-turbo': {'input': 0.5, 'output': 1.5},
        }
        
        model = model or self.model
        pricing = PRICING.get(model, PRICING['gpt-4o-mini'])
        
        input_tokens = sum(self.count_message_tokens(m) for m in messages)
        
        input_cost = (input_tokens / 1_000_000) * pricing['input']
        output_cost = (response_tokens / 1_000_000) * pricing['output']
        
        return {
            'model': model,
            'input_tokens': input_tokens,
            'estimated_output_tokens': response_tokens,
            'input_cost_usd': round(input_cost, 6),
            'output_cost_usd': round(output_cost, 6),
            'total_cost_usd': round(input_cost + output_cost, 6)
        }


# Singleton instance
context_limiter = ContextLimiter()
