"""
Prompt Management API Routes.

Kurumsal prompt yönetim sistemi için REST API endpoint'leri.

ENDPOINTS:
==========
    GET    /prompts                     - Tüm promptları listele
    GET    /prompts/<name>              - Prompt detayı
    GET    /prompts/<name>/versions     - Versiyon geçmişi
    POST   /prompts/<name>/versions     - Yeni versiyon oluştur
    POST   /prompts/<name>/activate     - Versiyonu aktif yap
    POST   /prompts/<name>/rollback     - Geri al
    
    GET    /prompts/ab-tests            - A/B testleri listele
    POST   /prompts/<name>/ab-test      - A/B test başlat
    DELETE /prompts/<name>/ab-test      - A/B test sonlandır
    
    GET    /prompts/audit-log           - Audit log
"""

from flask import request, jsonify
from marshmallow import Schema, fields, validate
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps

from app.modules.ai import ai_bp
from app.core.responses import success_response, error_response

from app.modules.ai.prompts.versioning import (
    prompt_version_manager,
    PromptVersion,
    PromptStatus,
    PromptChangeType,
)


# =============================================================================
# DECORATORS
# =============================================================================

def require_admin(fn):
    """Admin yetkisi gerektiren endpoint'ler için decorator."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        role = claims.get('role', '')
        
        if role not in ['admin', 'super_admin']:
            return error_response(
                "Bu işlem için admin yetkisi gerekli",
                403
            )
        
        return fn(*args, **kwargs)
    return wrapper


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class CreateVersionSchema(Schema):
    """Yeni versiyon oluşturma şeması."""
    system_prompt = fields.Str(required=True, validate=validate.Length(min=10))
    user_prompt = fields.Str(required=True, validate=validate.Length(min=10))
    version = fields.Str(required=False)  # Otomatik artırılabilir
    description = fields.Str(required=False, load_default="")
    max_tokens = fields.Int(load_default=500)
    temperature = fields.Float(load_default=0.7)
    required_variables = fields.List(fields.Str(), load_default=[])
    optional_variables = fields.List(fields.Str(), load_default=[])
    roles = fields.List(fields.Str(), load_default=['student', 'teacher'])


class ActivateVersionSchema(Schema):
    """Versiyon aktivasyon şeması."""
    version = fields.Str(required=True)


class RollbackSchema(Schema):
    """Rollback şeması."""
    target_version = fields.Str(required=False)  # None ise bir önceki


class StartABTestSchema(Schema):
    """A/B test başlatma şeması."""
    test_version = fields.Str(required=True)
    test_weight = fields.Float(
        required=False,
        load_default=0.1,
        validate=validate.Range(min=0.01, max=0.5)
    )


class EndABTestSchema(Schema):
    """A/B test sonlandırma şeması."""
    winner = fields.Str(
        required=False,
        validate=validate.OneOf(['control', 'test'])
    )


# =============================================================================
# PROMPT LIST & DETAIL
# =============================================================================

@ai_bp.route('/prompts', methods=['GET'])
@jwt_required()
@require_admin
def list_prompts():
    """
    Tüm promptları listele.
    
    Response:
        {
            "prompts": [
                {
                    "name": "question_hint",
                    "active_version": "1.1.0",
                    "latest_version": "1.2.0",
                    "total_versions": 3,
                    "has_ab_test": false,
                    "description": "..."
                },
                ...
            ]
        }
    """
    try:
        prompts = prompt_version_manager.list_prompts()
        
        return success_response({
            'prompts': prompts,
            'total': len(prompts)
        })
        
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/prompts/<name>', methods=['GET'])
@jwt_required()
@require_admin
def get_prompt_detail(name: str):
    """
    Prompt detayını al.
    
    Response:
        {
            "prompt": {
                "name": "question_hint",
                "version": "1.1.0",
                "status": "active",
                "system_prompt": "...",
                "user_prompt": "...",
                ...
            },
            "ab_test": {...} or null
        }
    """
    try:
        prompt = prompt_version_manager.get_active_prompt(name)
        
        if not prompt:
            return error_response(f"Prompt bulunamadı: {name}", 404)
        
        ab_test = prompt_version_manager.storage.get_ab_test(name)
        
        return success_response({
            'prompt': prompt.to_dict(),
            'ab_test': ab_test.to_dict() if ab_test else None
        })
        
    except Exception as e:
        return error_response(str(e), 500)


# =============================================================================
# VERSION MANAGEMENT
# =============================================================================

@ai_bp.route('/prompts/<name>/versions', methods=['GET'])
@jwt_required()
@require_admin
def get_version_history(name: str):
    """
    Prompt versiyon geçmişini al.
    
    Response:
        {
            "versions": [
                {
                    "version": "1.2.0",
                    "status": "draft",
                    "is_active": false,
                    "author": "admin",
                    "created_at": "...",
                    "content_hash": "..."
                },
                ...
            ]
        }
    """
    try:
        versions = prompt_version_manager.get_version_history(name)
        
        if not versions:
            return error_response(f"Prompt bulunamadı: {name}", 404)
        
        return success_response({
            'prompt_name': name,
            'versions': versions,
            'total': len(versions)
        })
        
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/prompts/<name>/versions', methods=['POST'])
@jwt_required()
@require_admin
def create_version(name: str):
    """
    Yeni prompt versiyonu oluştur.
    
    Request:
        {
            "system_prompt": "...",
            "user_prompt": "...",
            "version": "1.2.0",  // opsiyonel
            "description": "...",
            ...
        }
    
    Response:
        {
            "prompt": {...},
            "message": "Versiyon oluşturuldu"
        }
    """
    try:
        schema = CreateVersionSchema()
        data = schema.load(request.get_json())
        
        # Kullanıcı bilgisi
        user_id = get_jwt_identity()
        claims = get_jwt()
        author = claims.get('email', str(user_id))
        
        # Versiyon oluştur
        prompt = prompt_version_manager.create_version(
            name=name,
            author=author,
            **data
        )
        
        return success_response({
            'prompt': prompt.to_dict(),
            'message': f"Versiyon oluşturuldu: {name} v{prompt.version}"
        }, 201)
        
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/prompts/<name>/activate', methods=['POST'])
@jwt_required()
@require_admin
def activate_version(name: str):
    """
    Belirli bir versiyonu aktif yap.
    
    Request:
        {"version": "1.2.0"}
    
    Response:
        {
            "prompt": {...},
            "message": "Versiyon aktif edildi"
        }
    """
    try:
        schema = ActivateVersionSchema()
        data = schema.load(request.get_json())
        
        # Kullanıcı bilgisi
        user_id = get_jwt_identity()
        claims = get_jwt()
        activated_by = claims.get('email', str(user_id))
        
        # Aktivasyon
        prompt = prompt_version_manager.activate_version(
            name=name,
            version=data['version'],
            activated_by=activated_by
        )
        
        return success_response({
            'prompt': prompt.to_dict(),
            'message': f"Versiyon aktif edildi: {name} v{prompt.version}"
        })
        
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/prompts/<name>/rollback', methods=['POST'])
@jwt_required()
@require_admin
def rollback_prompt(name: str):
    """
    Önceki versiyona geri dön.
    
    Request:
        {"target_version": "1.0.0"}  // opsiyonel, null ise bir önceki
    
    Response:
        {
            "prompt": {...},
            "message": "Rollback yapıldı"
        }
    """
    try:
        schema = RollbackSchema()
        data = schema.load(request.get_json() or {})
        
        # Kullanıcı bilgisi
        user_id = get_jwt_identity()
        claims = get_jwt()
        rolled_back_by = claims.get('email', str(user_id))
        
        # Rollback
        prompt = prompt_version_manager.rollback(
            name=name,
            target_version=data.get('target_version'),
            rolled_back_by=rolled_back_by
        )
        
        return success_response({
            'prompt': prompt.to_dict(),
            'message': f"Rollback yapıldı: {name} v{prompt.version}"
        })
        
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        return error_response(str(e), 500)


# =============================================================================
# A/B TESTING
# =============================================================================

@ai_bp.route('/prompts/ab-tests', methods=['GET'])
@jwt_required()
@require_admin
def list_ab_tests():
    """
    Aktif A/B testlerini listele.
    
    Response:
        {
            "ab_tests": [
                {
                    "prompt_name": "question_hint",
                    "control_version": "1.0.0",
                    "test_version": "1.1.0",
                    "test_weight": 0.1,
                    ...
                }
            ]
        }
    """
    try:
        ab_tests = prompt_version_manager.storage.list_ab_tests()
        
        return success_response({
            'ab_tests': [t.to_dict() for t in ab_tests],
            'total': len(ab_tests)
        })
        
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/prompts/<name>/ab-test', methods=['POST'])
@jwt_required()
@require_admin
def start_ab_test(name: str):
    """
    A/B test başlat.
    
    Request:
        {
            "test_version": "1.2.0",
            "test_weight": 0.1  // %10 trafik test'e gider
        }
    
    Response:
        {
            "ab_test": {...},
            "message": "A/B test başlatıldı"
        }
    """
    try:
        schema = StartABTestSchema()
        data = schema.load(request.get_json())
        
        # Kullanıcı bilgisi
        user_id = get_jwt_identity()
        claims = get_jwt()
        started_by = claims.get('email', str(user_id))
        
        # A/B test başlat
        config = prompt_version_manager.start_ab_test(
            name=name,
            test_version=data['test_version'],
            test_weight=data['test_weight'],
            started_by=started_by
        )
        
        return success_response({
            'ab_test': config.to_dict(),
            'message': f"A/B test başlatıldı: {name}"
        }, 201)
        
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/prompts/<name>/ab-test', methods=['DELETE'])
@jwt_required()
@require_admin
def end_ab_test(name: str):
    """
    A/B test'i sonlandır.
    
    Request:
        {"winner": "test"}  // 'control', 'test' veya null
    
    Response:
        {
            "winner_prompt": {...} or null,
            "message": "A/B test sonlandırıldı"
        }
    """
    try:
        schema = EndABTestSchema()
        data = schema.load(request.get_json() or {})
        
        # Kullanıcı bilgisi
        user_id = get_jwt_identity()
        claims = get_jwt()
        ended_by = claims.get('email', str(user_id))
        
        # A/B test sonlandır
        winner = prompt_version_manager.end_ab_test(
            name=name,
            winner=data.get('winner'),
            ended_by=ended_by
        )
        
        return success_response({
            'winner_prompt': winner.to_dict() if winner else None,
            'message': f"A/B test sonlandırıldı: {name}"
        })
        
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        return error_response(str(e), 500)


# =============================================================================
# AUDIT LOG
# =============================================================================

@ai_bp.route('/prompts/audit-log', methods=['GET'])
@jwt_required()
@require_admin
def get_audit_log():
    """
    Prompt değişiklik audit log'unu al.
    
    Query Params:
        prompt_name: Belirli prompt için filtrele
        limit: Kayıt sayısı (default: 100)
    
    Response:
        {
            "audit_log": [
                {
                    "prompt_name": "question_hint",
                    "version": "1.1.0",
                    "change_type": "activated",
                    "changed_by": "admin@example.com",
                    "changed_at": "...",
                    "previous_version": "1.0.0",
                    "details": {...}
                },
                ...
            ]
        }
    """
    try:
        prompt_name = request.args.get('prompt_name')
        limit = request.args.get('limit', 100, type=int)
        
        audit_log = prompt_version_manager.get_audit_log(
            prompt_name=prompt_name,
            limit=limit
        )
        
        return success_response({
            'audit_log': audit_log,
            'total': len(audit_log),
            'filters': {
                'prompt_name': prompt_name,
                'limit': limit
            }
        })
        
    except Exception as e:
        return error_response(str(e), 500)


# =============================================================================
# PROMPT COMPARISON
# =============================================================================

@ai_bp.route('/prompts/<name>/compare', methods=['GET'])
@jwt_required()
@require_admin
def compare_versions(name: str):
    """
    İki versiyonu karşılaştır.
    
    Query Params:
        v1: İlk versiyon
        v2: İkinci versiyon
    
    Response:
        {
            "v1": {...},
            "v2": {...},
            "diff": {
                "system_prompt_changed": true,
                "user_prompt_changed": false,
                ...
            }
        }
    """
    try:
        v1 = request.args.get('v1')
        v2 = request.args.get('v2')
        
        if not v1 or not v2:
            return error_response("v1 ve v2 parametreleri gerekli", 400)
        
        prompt_v1 = prompt_version_manager.storage.get_version(name, v1)
        prompt_v2 = prompt_version_manager.storage.get_version(name, v2)
        
        if not prompt_v1:
            return error_response(f"Versiyon bulunamadı: {v1}", 404)
        if not prompt_v2:
            return error_response(f"Versiyon bulunamadı: {v2}", 404)
        
        # Diff hesapla
        diff = {
            'system_prompt_changed': prompt_v1.system_prompt != prompt_v2.system_prompt,
            'user_prompt_changed': prompt_v1.user_prompt != prompt_v2.user_prompt,
            'max_tokens_changed': prompt_v1.max_tokens != prompt_v2.max_tokens,
            'temperature_changed': prompt_v1.temperature != prompt_v2.temperature,
            'variables_changed': (
                prompt_v1.required_variables != prompt_v2.required_variables or
                prompt_v1.optional_variables != prompt_v2.optional_variables
            ),
            'content_hash_v1': prompt_v1.content_hash,
            'content_hash_v2': prompt_v2.content_hash
        }
        
        return success_response({
            'v1': prompt_v1.to_dict(),
            'v2': prompt_v2.to_dict(),
            'diff': diff
        })
        
    except Exception as e:
        return error_response(str(e), 500)
