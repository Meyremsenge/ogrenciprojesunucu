"""
AI Routes - Streaming Response Handler.

Server-Sent Events (SSE) ile streaming AI yanıtları.
"""

import json
import logging
import time
from typing import Generator, Dict, Any, Optional
from functools import wraps

from flask import Response, stream_with_context, request, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.modules.ai import ai_bp
from app.modules.ai.services import ai_service
from app.modules.ai.core import AIFeature
from app.modules.ai.middleware import exam_guard, context_limiter
from app.modules.ai.security.guard import ai_security_guard
from app.core.decorators import handle_exceptions
from app.models.user import User

logger = logging.getLogger(__name__)


# =============================================================================
# STREAMING UTILITIES
# =============================================================================

def create_sse_message(data: Dict[str, Any], event: str = None) -> str:
    """
    SSE formatında mesaj oluştur.
    
    Args:
        data: Mesaj içeriği
        event: Event türü (opsiyonel)
        
    Returns:
        SSE formatında string
    """
    message = ""
    if event:
        message += f"event: {event}\n"
    message += f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
    return message


def stream_response(generator: Generator, content_type: str = "text/event-stream") -> Response:
    """
    Streaming response oluştur.
    
    Args:
        generator: Veri üreteci
        content_type: Content type
        
    Returns:
        Flask Response
    """
    return Response(
        stream_with_context(generator),
        mimetype=content_type,
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',  # Nginx buffering'i devre dışı bırak
            'Connection': 'keep-alive'
        }
    )


# =============================================================================
# STREAMING ENDPOINTS
# =============================================================================

@ai_bp.route('/stream/hint', methods=['POST'])
@jwt_required()
def stream_hint():
    """
    Streaming ile soru ipucu al.
    
    SSE (Server-Sent Events) kullanarak parça parça yanıt döner.
    Frontend EventSource API ile bağlanabilir.
    
    Events:
    - start: Akış başladı
    - chunk: İçerik parçası
    - done: Akış tamamlandı
    - error: Hata oluştu
    
    ---
    tags:
      - AI Streaming
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - question_text
            properties:
              question_text:
                type: string
              difficulty_level:
                type: string
    responses:
      200:
        description: SSE akışı başlatıldı
        content:
          text/event-stream:
            schema:
              type: string
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return Response(
            create_sse_message({"error": "Kullanıcı bulunamadı"}, event="error"),
            mimetype="text/event-stream"
        )
    
    # Sınav kontrolü
    try:
        exam_guard.check_exam_context(user_id, feature='question_hint')
    except Exception as e:
        return Response(
            create_sse_message({"error": str(e)}, event="error"),
            mimetype="text/event-stream"
        )
    
    data = request.get_json() or {}
    question_text = data.get('question_text', '')
    difficulty_level = data.get('difficulty_level', 'orta')
    
    # Güvenlik kontrolü
    security_result = ai_security_guard.check_input(
        user_id=user_id,
        content=question_text,
        context={'feature': 'question_hint'}
    )
    
    if not security_result.is_safe:
        return Response(
            create_sse_message({"error": security_result.message or "Güvenlik kontrolü başarısız"}, event="error"),
            mimetype="text/event-stream"
        )
    
    def generate():
        """Streaming generator."""
        try:
            # Başlangıç eventi
            yield create_sse_message({
                "status": "started",
                "timestamp": time.time()
            }, event="start")
            
            # AI'dan streaming yanıt al
            full_response = ""
            
            # Mock streaming (gerçek implementasyon provider'a bağlı)
            # Burada örnek olarak normal yanıtı parçalara böleriz
            result = ai_service.get_hint(
                user_id=user.id,
                question_text=question_text,
                difficulty_level=difficulty_level,
                role=user.role
            )
            
            hint_text = result.get('hint', '')
            
            # Parçalara böl ve gönder
            chunk_size = 20  # Karakter sayısı
            for i in range(0, len(hint_text), chunk_size):
                chunk = hint_text[i:i+chunk_size]
                full_response += chunk
                
                yield create_sse_message({
                    "chunk": chunk,
                    "accumulated": full_response
                }, event="chunk")
                
                # Doğal yazım efekti için kısa bekleme
                time.sleep(0.05)
            
            # Tamamlandı eventi
            yield create_sse_message({
                "status": "completed",
                "full_response": full_response,
                "disclaimer": "Bu ipucu AI tarafından üretilmiştir.",
                "tokens_used": result.get('tokens_used', 0)
            }, event="done")
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield create_sse_message({
                "error": str(e),
                "status": "failed"
            }, event="error")
    
    return stream_response(generate())


@ai_bp.route('/stream/explain', methods=['POST'])
@jwt_required()
def stream_explain():
    """
    Streaming ile konu açıklaması al.
    
    ---
    tags:
      - AI Streaming
    security:
      - BearerAuth: []
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return Response(
            create_sse_message({"error": "Kullanıcı bulunamadı"}, event="error"),
            mimetype="text/event-stream"
        )
    
    # Sınav kontrolü
    try:
        exam_guard.check_exam_context(user_id, feature='topic_explanation')
    except Exception as e:
        return Response(
            create_sse_message({"error": str(e)}, event="error"),
            mimetype="text/event-stream"
        )
    
    data = request.get_json() or {}
    topic = data.get('topic', '')
    subject = data.get('subject')
    difficulty = data.get('difficulty', 'medium')
    
    # Güvenlik kontrolü
    security_result = ai_security_guard.check_input(
        user_id=user_id,
        content=topic,
        context={'feature': 'topic_explanation'}
    )
    
    if not security_result.is_safe:
        return Response(
            create_sse_message({"error": security_result.message or "Güvenlik kontrolü başarısız"}, event="error"),
            mimetype="text/event-stream"
        )
    
    def generate():
        """Streaming generator."""
        try:
            yield create_sse_message({
                "status": "started",
                "topic": topic
            }, event="start")
            
            # AI yanıtı al
            result = ai_service.explain_topic(
                user_id=user.id,
                topic=topic,
                subject=subject,
                difficulty=difficulty,
                role=user.role
            )
            
            explanation = result.get('explanation', '')
            full_response = ""
            
            # Paragraf paragraf gönder
            paragraphs = explanation.split('\n\n')
            for para in paragraphs:
                if para.strip():
                    full_response += para + '\n\n'
                    yield create_sse_message({
                        "chunk": para + '\n\n',
                        "accumulated_length": len(full_response)
                    }, event="chunk")
                    time.sleep(0.1)
            
            yield create_sse_message({
                "status": "completed",
                "full_response": full_response.strip(),
                "disclaimer": "Bu açıklama AI tarafından üretilmiştir. Detaylı bilgi için öğretmeninize danışın."
            }, event="done")
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield create_sse_message({
                "error": str(e)
            }, event="error")
    
    return stream_response(generate())


@ai_bp.route('/stream/status', methods=['GET'])
@jwt_required()
def stream_status():
    """
    Streaming durumunu kontrol et (health check).
    
    ---
    tags:
      - AI Streaming
    security:
      - BearerAuth: []
    responses:
      200:
        description: Streaming aktif
    """
    return {
        "streaming_enabled": True,
        "supported_endpoints": [
            "/api/v1/ai/stream/hint",
            "/api/v1/ai/stream/explain"
        ],
        "client_requirements": {
            "api": "EventSource (SSE)",
            "fallback": "Fetch with ReadableStream"
        }
    }
