"""
Admin Module - Routes.

Admin ve Super Admin API endpoints.
"""

from flask import request, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from app.modules.admin import admin_bp
from app.modules.admin.services import (
    AdminUserService,
    ContentApprovalService,
    PackageManagementService,
    SystemSettingsService,
    AdminActionService,
    AnnouncementService,
    AdminDashboardService
)
from app.modules.admin.schemas import (
    UserCreateSchema, UserUpdateSchema, UserBulkActionSchema,
    RoleChangeSchema, PasswordResetSchema,
    ContentApprovalSchema, ContentRejectSchema,
    PackageCreateSchema, PackageUpdateSchema, PackageAssignSchema,
    SettingUpdateSchema, SettingBulkUpdateSchema,
    AnnouncementCreateSchema, AnnouncementUpdateSchema
)
from app.core.responses import success_response, created_response, no_content_response, paginated_response
from app.core.decorators import require_role, validate_json, handle_exceptions
from app.core.pagination import PaginationParams


# =============================================================================
# Dashboard Routes
# =============================================================================

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_dashboard():
    """
    Admin dashboard istatistikleri.
    """
    stats = AdminDashboardService.get_overview_stats()
    
    return success_response(data={'stats': stats})


@admin_bp.route('/dashboard/charts/users', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_user_growth_chart():
    """
    Kullanıcı büyüme grafiği.
    """
    days = request.args.get('days', 30, type=int)
    data = AdminDashboardService.get_user_growth_chart(days)
    
    return success_response(data={'chart_data': data})


@admin_bp.route('/dashboard/charts/revenue', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_revenue_chart():
    """
    Gelir grafiği.
    """
    days = request.args.get('days', 30, type=int)
    data = AdminDashboardService.get_revenue_chart(days)
    
    return success_response(data={'chart_data': data})


@admin_bp.route('/dashboard/activities', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_recent_activities():
    """
    Son admin aktiviteleri.
    """
    limit = request.args.get('limit', 20, type=int)
    activities = AdminDashboardService.get_recent_activities(limit)
    
    return success_response(data={'activities': activities})


# =============================================================================
# User Management Routes
# =============================================================================

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def list_users():
    """
    Kullanıcı listesi.
    
    Query params:
        - page, per_page: Sayfalama
        - role: Rol filtresi
        - is_active: Aktiflik filtresi
        - is_verified: Doğrulanmış filtresi
        - search: Arama
        - sort_by: Sıralama alanı
        - sort_order: asc/desc
    """
    params = PaginationParams.from_request()
    
    result = AdminUserService.get_users(
        page=params.page,
        per_page=params.per_page,
        role=request.args.get('role'),
        is_active=request.args.get('is_active', type=lambda x: x.lower() == 'true') if request.args.get('is_active') else None,
        is_verified=request.args.get('is_verified', type=lambda x: x.lower() == 'true') if request.args.get('is_verified') else None,
        search=request.args.get('search'),
        sort_by=request.args.get('sort_by', 'created_at'),
        sort_order=request.args.get('sort_order', 'desc')
    )
    
    return paginated_response(
        items=[u.to_dict() for u in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_user_details(user_id: int):
    """
    Kullanıcı detayları.
    """
    data = AdminUserService.get_user_details(user_id)
    
    return success_response(data=data)


@admin_bp.route('/users', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(UserCreateSchema)
def create_user():
    """
    Yeni kullanıcı oluştur.
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    user = AdminUserService.create_user(data, admin_id)
    
    return created_response(
        data={'user': user.to_dict()},
        message='Kullanıcı başarıyla oluşturuldu'
    )


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(UserUpdateSchema)
def update_user(user_id: int):
    """
    Kullanıcı güncelle.
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    user = AdminUserService.update_user(user_id, data, admin_id)
    
    return success_response(
        data={'user': user.to_dict()},
        message='Kullanıcı başarıyla güncellendi'
    )


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def delete_user(user_id: int):
    """
    Kullanıcı sil (soft delete).
    """
    admin_id = get_jwt_identity()
    hard_delete = request.args.get('hard', 'false').lower() == 'true'
    
    AdminUserService.delete_user(user_id, admin_id, hard_delete=hard_delete)
    
    return no_content_response()


@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(RoleChangeSchema)
def change_user_role(user_id: int):
    """
    Kullanıcı rolünü değiştir.
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    user = AdminUserService.change_user_role(user_id, data['role'], admin_id)
    
    return success_response(
        data={'user': user.to_dict()},
        message='Kullanıcı rolü başarıyla değiştirildi'
    )


@admin_bp.route('/users/<int:user_id>/activate', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def activate_user(user_id: int):
    """
    Kullanıcıyı aktifleştir.
    """
    admin_id = get_jwt_identity()
    
    user = AdminUserService.activate_user(user_id, admin_id, activate=True)
    
    return success_response(
        data={'user': user.to_dict()},
        message='Kullanıcı aktifleştirildi'
    )


@admin_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def deactivate_user(user_id: int):
    """
    Kullanıcıyı deaktifleştir.
    """
    admin_id = get_jwt_identity()
    
    user = AdminUserService.activate_user(user_id, admin_id, activate=False)
    
    return success_response(
        data={'user': user.to_dict()},
        message='Kullanıcı deaktifleştirildi'
    )


@admin_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def reset_user_password(user_id: int):
    """
    Kullanıcı şifresini sıfırla.
    """
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    
    new_password = AdminUserService.reset_password(
        user_id, 
        admin_id,
        new_password=data.get('new_password')
    )
    
    return success_response(
        data={'temporary_password': new_password},
        message='Şifre sıfırlandı. Kullanıcı ilk girişte şifresini değiştirmek zorundadır.'
    )


@admin_bp.route('/users/<int:user_id>/unlock', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def unlock_user(user_id: int):
    """
    Kilitli hesabı aç.
    """
    admin_id = get_jwt_identity()
    
    user = AdminUserService.unlock_user(user_id, admin_id)
    
    return success_response(
        data={'user': user.to_dict()},
        message='Hesap kilidi açıldı'
    )


@admin_bp.route('/users/bulk', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(UserBulkActionSchema)
def bulk_user_action():
    """
    Toplu kullanıcı işlemi.
    
    Body:
        - user_ids: [1, 2, 3]
        - action: activate | deactivate | delete | change_role
        - new_role: (change_role için)
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    result = AdminUserService.bulk_action(
        user_ids=data['user_ids'],
        action=data['action'],
        admin_id=admin_id,
        **{k: v for k, v in data.items() if k not in ['user_ids', 'action']}
    )
    
    return success_response(
        data=result,
        message=f'{result["success_count"]} işlem başarılı, {result["failed_count"]} başarısız'
    )


# =============================================================================
# Content Approval Routes
# =============================================================================

@admin_bp.route('/approvals', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def list_pending_approvals():
    """
    Onay bekleyen içerik listesi.
    """
    params = PaginationParams.from_request()
    
    result = ContentApprovalService.get_pending_queue(
        page=params.page,
        per_page=params.per_page,
        content_type=request.args.get('content_type'),
        priority=request.args.get('priority', type=int),
        assigned_to_id=request.args.get('assigned_to_id', type=int)
    )
    
    return paginated_response(
        items=[item.to_dict() for item in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@admin_bp.route('/approvals/stats', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_approval_stats():
    """
    Onay kuyruğu istatistikleri.
    """
    stats = ContentApprovalService.get_queue_stats()
    
    return success_response(data={'stats': stats})


@admin_bp.route('/approvals/<int:queue_id>/assign', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def assign_approval(queue_id: int):
    """
    İçeriği bir admine ata.
    """
    data = request.get_json() or {}
    admin_id = data.get('admin_id', get_jwt_identity())
    assigner_id = get_jwt_identity()
    
    item = ContentApprovalService.assign_to_admin(queue_id, admin_id, assigner_id)
    
    return success_response(
        data={'item': item.to_dict()},
        message='İçerik atandı'
    )


@admin_bp.route('/approvals/<int:queue_id>/approve', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(ContentApprovalSchema)
def approve_content(queue_id: int):
    """
    İçeriği onayla.
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    item = ContentApprovalService.approve_content(
        queue_id,
        admin_id,
        notes=data.get('notes')
    )
    
    return success_response(
        data={'item': item.to_dict()},
        message='İçerik onaylandı'
    )


@admin_bp.route('/approvals/<int:queue_id>/reject', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(ContentRejectSchema)
def reject_content(queue_id: int):
    """
    İçeriği reddet.
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    item = ContentApprovalService.reject_content(
        queue_id,
        admin_id,
        reason=data['reason'],
        details=data.get('details')
    )
    
    return success_response(
        data={'item': item.to_dict()},
        message='İçerik reddedildi'
    )


# =============================================================================
# Package Management Routes
# =============================================================================

@admin_bp.route('/packages', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def list_packages():
    """
    Paket listesi.
    """
    params = PaginationParams.from_request()
    
    result = PackageManagementService.get_packages(
        page=params.page,
        per_page=params.per_page,
        status=request.args.get('status'),
        package_type=request.args.get('package_type'),
        include_stats=request.args.get('include_stats', 'false').lower() == 'true'
    )
    
    return paginated_response(
        items=[p.to_dict(include_stats=True) for p in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@admin_bp.route('/packages/<int:package_id>', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_package_details(package_id: int):
    """
    Paket detayları.
    """
    data = PackageManagementService.get_package_details(package_id)
    
    return success_response(data=data)


@admin_bp.route('/packages', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(PackageCreateSchema)
def create_package():
    """
    Yeni paket oluştur.
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    package = PackageManagementService.create_package(data, admin_id)
    
    return created_response(
        data={'package': package.to_dict(include_stats=True)},
        message='Paket başarıyla oluşturuldu'
    )


@admin_bp.route('/packages/<int:package_id>', methods=['PUT'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(PackageUpdateSchema)
def update_package(package_id: int):
    """
    Paket güncelle.
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    package = PackageManagementService.update_package(package_id, data, admin_id)
    
    return success_response(
        data={'package': package.to_dict(include_stats=True)},
        message='Paket başarıyla güncellendi'
    )


@admin_bp.route('/packages/<int:package_id>', methods=['DELETE'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def delete_package(package_id: int):
    """
    Paket sil (sadece super admin).
    """
    admin_id = get_jwt_identity()
    
    PackageManagementService.delete_package(package_id, admin_id)
    
    return no_content_response()


@admin_bp.route('/packages/assign', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(PackageAssignSchema)
def assign_package():
    """
    Kullanıcıya paket ata.
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    user_package = PackageManagementService.assign_package_to_user(
        package_id=data['package_id'],
        user_id=data['user_id'],
        admin_id=admin_id,
        duration_days=data.get('duration_days'),
        amount=data.get('amount', 0),
        notes=data.get('notes')
    )
    
    return created_response(
        data={'subscription': user_package.to_dict()},
        message='Paket başarıyla atandı'
    )


@admin_bp.route('/packages/subscriptions/<int:subscription_id>/revoke', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def revoke_subscription(subscription_id: int):
    """
    Kullanıcının paket erişimini iptal et.
    """
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    
    user_package = PackageManagementService.revoke_package(
        subscription_id,
        admin_id,
        reason=data.get('reason')
    )
    
    return success_response(
        data={'subscription': user_package.to_dict()},
        message='Paket erişimi iptal edildi'
    )


# =============================================================================
# System Settings Routes
# =============================================================================

@admin_bp.route('/settings', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def list_settings():
    """
    Sistem ayarları listesi.
    """
    category = request.args.get('category')
    grouped = request.args.get('grouped', 'false').lower() == 'true'
    
    if grouped:
        data = SystemSettingsService.get_settings_by_category()
        return success_response(data={'settings': data})
    
    settings = SystemSettingsService.get_all_settings(category=category)
    
    return success_response(data={'settings': settings})


@admin_bp.route('/settings/<string:key>', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_setting(key: str):
    """
    Tek bir ayar.
    """
    value = SystemSettingsService.get_setting(key)
    
    return success_response(data={'key': key, 'value': value})


@admin_bp.route('/settings/<string:key>', methods=['PUT'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
@validate_json(SettingUpdateSchema)
def update_setting(key: str):
    """
    Ayar güncelle (sadece super admin).
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    setting = SystemSettingsService.set_setting(key, data['value'], admin_id)
    
    return success_response(
        data={'setting': setting.to_dict()},
        message='Ayar başarıyla güncellendi'
    )


@admin_bp.route('/settings', methods=['PUT'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
@validate_json(SettingBulkUpdateSchema)
def bulk_update_settings():
    """
    Toplu ayar güncelleme (sadece super admin).
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    settings = SystemSettingsService.bulk_update(data['settings'], admin_id)
    
    return success_response(
        data={'updated_count': len(settings)},
        message=f'{len(settings)} ayar güncellendi'
    )


@admin_bp.route('/settings/initialize', methods=['POST'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def initialize_settings():
    """
    Varsayılan ayarları yükle (sadece super admin).
    """
    SystemSettingsService.initialize_defaults()
    
    return success_response(message='Varsayılan ayarlar yüklendi')


# =============================================================================
# Announcement Routes
# =============================================================================

@admin_bp.route('/announcements', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def list_announcements():
    """
    Duyuru listesi.
    """
    params = PaginationParams.from_request()
    active_only = request.args.get('active_only', 'false').lower() == 'true'
    
    result = AnnouncementService.get_announcements(
        page=params.page,
        per_page=params.per_page,
        active_only=active_only
    )
    
    return paginated_response(
        items=[a.to_dict(include_stats=True) for a in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@admin_bp.route('/announcements', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(AnnouncementCreateSchema)
def create_announcement():
    """
    Yeni duyuru oluştur.
    """
    admin_id = get_jwt_identity()
    data = g.validated_data
    
    announcement = AnnouncementService.create_announcement(data, admin_id)
    
    return created_response(
        data={'announcement': announcement.to_dict()},
        message='Duyuru başarıyla oluşturuldu'
    )


@admin_bp.route('/announcements/<int:announcement_id>', methods=['PUT'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(AnnouncementUpdateSchema)
def update_announcement(announcement_id: int):
    """
    Duyuru güncelle.
    """
    data = g.validated_data
    
    announcement = AnnouncementService.update_announcement(announcement_id, data)
    
    return success_response(
        data={'announcement': announcement.to_dict()},
        message='Duyuru başarıyla güncellendi'
    )


@admin_bp.route('/announcements/<int:announcement_id>', methods=['DELETE'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def delete_announcement(announcement_id: int):
    """
    Duyuru sil.
    """
    AnnouncementService.delete_announcement(announcement_id)
    
    return no_content_response()


# =============================================================================
# Admin Action Logs Routes
# =============================================================================

@admin_bp.route('/logs', methods=['GET'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def list_admin_logs():
    """
    Admin işlem logları (sadece super admin).
    """
    params = PaginationParams.from_request()
    
    # Tarih filtreleri
    start_date = None
    end_date = None
    
    if request.args.get('start_date'):
        start_date = datetime.fromisoformat(request.args.get('start_date'))
    if request.args.get('end_date'):
        end_date = datetime.fromisoformat(request.args.get('end_date'))
    
    result = AdminActionService.get_logs(
        page=params.page,
        per_page=params.per_page,
        admin_id=request.args.get('admin_id', type=int),
        action_type=request.args.get('action_type'),
        target_type=request.args.get('target_type'),
        start_date=start_date,
        end_date=end_date
    )
    
    return paginated_response(
        items=[log.to_dict() for log in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


# =============================================================================
# System Maintenance Routes (Super Admin Only)
# =============================================================================

@admin_bp.route('/system/maintenance', methods=['POST'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def toggle_maintenance_mode():
    """
    Bakım modunu aç/kapat.
    """
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    enable = data.get('enable', True)
    
    SystemSettingsService.set_setting('maintenance_mode', enable, admin_id)
    
    AdminActionService.log_action(
        action_type='system_maintenance',
        admin_id=admin_id,
        description=f'Bakım modu {"açıldı" if enable else "kapatıldı"}'
    )
    
    return success_response(
        message=f'Bakım modu {"açıldı" if enable else "kapatıldı"}'
    )


@admin_bp.route('/system/cache/clear', methods=['POST'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def clear_cache():
    """
    Önbelleği temizle.
    """
    admin_id = get_jwt_identity()
    
    from app.services.cache_service import CacheService
    CacheService.clear_all()
    
    AdminActionService.log_action(
        action_type='cache_clear',
        admin_id=admin_id,
        description='Önbellek temizlendi'
    )
    
    return success_response(message='Önbellek temizlendi')


@admin_bp.route('/system/health', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_system_health():
    """
    Sistem sağlık durumu.
    """
    from app.extensions import db, redis_client
    
    health = {
        'database': 'ok',
        'redis': 'ok',
        'celery': 'unknown',
    }
    
    # Database check
    try:
        db.session.execute('SELECT 1')
    except Exception as e:
        health['database'] = f'error: {str(e)}'
    
    # Redis check
    try:
        if redis_client:
            redis_client.ping()
    except Exception as e:
        health['redis'] = f'error: {str(e)}'
    
    return success_response(data={'health': health})


# =============================================================================
# AI CONTROL ROUTES
# =============================================================================
#
# YETKİ FARKLARI:
# ---------------
# ADMIN:
#   - AI durumunu görüntüleme
#   - AI kullanım istatistikleri
#   - Kullanıcı AI kotalarını görüntüleme/sıfırlama
#   - Kullanıcı AI engelini yönetme
#   - AI ihlal raporlarını görüntüleme
#   - Prompt template'leri görüntüleme
#
# SUPER ADMIN:
#   - Yukarıdaki tüm yetkiler +
#   - AI özelliğini global açma/kapama
#   - AI Kill Switch (acil devre dışı bırakma)
#   - AI limitlerini değiştirme
#   - Prompt template'leri düzenleme/rollback
#   - AI özelliklerini aç/kapat
#   - AI provider/model konfigürasyonu
#
# =============================================================================

@admin_bp.route('/ai/status', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_ai_status():
    """
    AI sisteminin genel durumu.
    
    Admin & Super Admin erişebilir.
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    status = AIControlService.get_ai_status(admin_id)
    
    return success_response(data={'ai_status': status})


@admin_bp.route('/ai/enable', methods=['POST'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def toggle_ai_enabled():
    """
    AI özelliğini global olarak aç/kapa.
    
    SADECE SUPER ADMIN.
    
    Body:
        enabled: bool - AI aktif mi
        reason: str - Açma/kapama nedeni (opsiyonel)
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    
    enabled = data.get('enabled', True)
    reason = data.get('reason')
    
    result = AIControlService.set_ai_enabled(enabled, admin_id, reason)
    
    return success_response(
        data={'result': result},
        message=f'AI sistemi {"aktif" if enabled else "devre dışı"} edildi'
    )


@admin_bp.route('/ai/kill-switch', methods=['POST'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def activate_ai_kill_switch():
    """
    AI KILL SWITCH - Acil devre dışı bırakma.
    
    SADECE SUPER ADMIN.
    
    Bu endpoint AI sistemini ANINDA devre dışı bırakır.
    Güvenlik ihlali, maliyet aşımı veya beklenmeyen davranışlarda kullanılır.
    
    Body:
        reason: str - Kapatma nedeni (ZORUNLU, min 10 karakter)
        duration_hours: int - Kapalı kalma süresi (opsiyonel, None = manuel açılana kadar)
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    
    reason = data.get('reason')
    duration_hours = data.get('duration_hours')
    
    if not reason:
        return success_response(
            data=None,
            message='Kill switch için neden belirtilmeli',
            status_code=400
        )
    
    result = AIControlService.activate_kill_switch(
        admin_id=admin_id,
        reason=reason,
        duration_hours=duration_hours
    )
    
    return success_response(
        data={'result': result},
        message='AI KILL SWITCH AKTİF!'
    )


@admin_bp.route('/ai/kill-switch', methods=['DELETE'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def deactivate_ai_kill_switch():
    """
    AI Kill Switch'i kapat.
    
    SADECE SUPER ADMIN.
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    reason = data.get('reason')
    
    result = AIControlService.deactivate_kill_switch(admin_id, reason)
    
    return success_response(
        data={'result': result},
        message='AI Kill Switch devre dışı bırakıldı'
    )


# =============================================================================
# AI LIMITS ROUTES
# =============================================================================

@admin_bp.route('/ai/limits', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_ai_limits():
    """
    Mevcut AI limitlerini görüntüle.
    
    Admin & Super Admin erişebilir.
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    limits = AIControlService.get_ai_limits(admin_id)
    
    return success_response(data={'limits': limits})


@admin_bp.route('/ai/limits/<limit_type>', methods=['PUT'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def update_ai_limits(limit_type: str):
    """
    AI limitlerini güncelle.
    
    SADECE SUPER ADMIN.
    
    Args:
        limit_type: 'global', 'student', 'teacher'
        
    Body:
        Global için: daily_limit, monthly_limit, max_tokens_per_request
        Rol için: daily_tokens, monthly_tokens
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    
    result = AIControlService.update_ai_limits(admin_id, limit_type, data)
    
    return success_response(
        data={'result': result},
        message=f'{limit_type} AI limitleri güncellendi'
    )


# =============================================================================
# AI USER QUOTA ROUTES
# =============================================================================

@admin_bp.route('/ai/users/<int:user_id>/quota', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_user_ai_quota(user_id: int):
    """
    Kullanıcının AI kota bilgisini görüntüle.
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    quota = AIControlService.get_user_quota(admin_id, user_id)
    
    return success_response(data={'quota_info': quota})


@admin_bp.route('/ai/users/<int:user_id>/quota/reset', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def reset_user_ai_quota(user_id: int):
    """
    Kullanıcının AI kotasını sıfırla.
    
    Body:
        reset_type: 'daily', 'monthly', 'all'
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    reset_type = data.get('reset_type', 'daily')
    
    result = AIControlService.reset_user_quota(admin_id, user_id, reset_type)
    
    return success_response(
        data={'result': result},
        message=f'Kullanıcı AI kotası sıfırlandı ({reset_type})'
    )


@admin_bp.route('/ai/users/<int:user_id>/block', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def block_user_ai(user_id: int):
    """
    Kullanıcının AI erişimini engelle.
    
    Body:
        reason: str - Engelleme nedeni
        duration_hours: int - Engel süresi (opsiyonel, None = süresiz)
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    
    reason = data.get('reason')
    duration_hours = data.get('duration_hours')
    
    if not reason:
        return success_response(
            data=None,
            message='Engelleme nedeni belirtilmeli',
            status_code=400
        )
    
    result = AIControlService.block_user_ai(admin_id, user_id, reason, duration_hours)
    
    return success_response(
        data={'result': result},
        message='Kullanıcı AI erişimi engellendi'
    )


@admin_bp.route('/ai/users/<int:user_id>/block', methods=['DELETE'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def unblock_user_ai(user_id: int):
    """
    Kullanıcının AI engelini kaldır.
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    result = AIControlService.unblock_user_ai(admin_id, user_id)
    
    return success_response(
        data={'result': result},
        message='Kullanıcı AI engeli kaldırıldı'
    )


# =============================================================================
# AI PROMPT TEMPLATE ROUTES
# =============================================================================

@admin_bp.route('/ai/templates', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def list_prompt_templates():
    """
    Prompt template listesi.
    
    Admin: Sadece isim ve açıklama görür
    Super Admin: İçerik de görür
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    templates = AIControlService.get_prompt_templates(admin_id)
    
    return success_response(data={'templates': templates})


@admin_bp.route('/ai/templates/<template_name>', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_prompt_template(template_name: str):
    """
    Belirli bir prompt template'i görüntüle.
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    template = AIControlService.get_prompt_template(admin_id, template_name)
    
    return success_response(data={'template': template})


@admin_bp.route('/ai/templates/<template_name>', methods=['PUT'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def update_prompt_template(template_name: str):
    """
    Prompt template'i güncelle.
    
    SADECE SUPER ADMIN.
    
    Versiyon kontrolü ile günceller, eski versiyon saklanır.
    
    Body:
        content: str - Yeni template içeriği
        description: str - Açıklama (opsiyonel)
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    
    content = data.get('content')
    description = data.get('description')
    
    if not content:
        return success_response(
            data=None,
            message='Template içeriği boş olamaz',
            status_code=400
        )
    
    result = AIControlService.update_prompt_template(
        admin_id, template_name, content, description
    )
    
    return success_response(
        data={'result': result},
        message='Prompt template güncellendi'
    )


@admin_bp.route('/ai/templates/<template_name>/rollback', methods=['POST'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def rollback_prompt_template(template_name: str):
    """
    Prompt template'i önceki versiyona geri al.
    
    SADECE SUPER ADMIN.
    
    Body:
        version_index: int - Geri dönülecek versiyon indeksi
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    
    version_index = data.get('version_index')
    
    if version_index is None:
        return success_response(
            data=None,
            message='Versiyon indeksi belirtilmeli',
            status_code=400
        )
    
    result = AIControlService.rollback_prompt_template(
        admin_id, template_name, version_index
    )
    
    return success_response(
        data={'result': result},
        message='Prompt template geri alındı'
    )


# =============================================================================
# AI FEATURES ROUTES
# =============================================================================

@admin_bp.route('/ai/features', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_ai_features():
    """
    AI özelliklerinin durumunu listele.
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    features = AIControlService.get_ai_features(admin_id)
    
    return success_response(data={'features': features})


@admin_bp.route('/ai/features/<feature_name>', methods=['PUT'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def toggle_ai_feature(feature_name: str):
    """
    Belirli bir AI özelliğini aç/kapat.
    
    SADECE SUPER ADMIN.
    
    Body:
        enabled: bool
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    
    enabled = data.get('enabled', True)
    
    result = AIControlService.toggle_ai_feature(admin_id, feature_name, enabled)
    
    return success_response(
        data={'result': result},
        message=f'AI özelliği {"aktif" if enabled else "devre dışı"}: {feature_name}'
    )


# =============================================================================
# AI STATISTICS ROUTES
# =============================================================================

@admin_bp.route('/ai/stats', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_ai_usage_stats():
    """
    AI kullanım istatistikleri.
    
    Query params:
        days: int - Son kaç gün (default: 30)
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    days = request.args.get('days', 30, type=int)
    
    stats = AIControlService.get_ai_usage_stats(admin_id, days)
    
    return success_response(data={'stats': stats})


@admin_bp.route('/ai/violations', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_ai_violations():
    """
    AI ihlal raporları.
    
    Query params:
        page, per_page: Sayfalama
    """
    from app.modules.admin.ai_control_service import AIControlService
    
    admin_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    result = AIControlService.get_ai_violations(admin_id, page, per_page)
    
    return success_response(data=result)
