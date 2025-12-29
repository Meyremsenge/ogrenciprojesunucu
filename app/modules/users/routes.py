"""
Users Module - Routes.

Kullanıcı yönetimi endpoint'leri.
"""

from flask import request, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.modules.users import users_bp
from app.modules.users.services import UserService, RoleService, PermissionService
from app.modules.users.schemas import (
    UserSchema,
    UserCreateSchema,
    UserUpdateSchema,
    UserListSchema,
    ProfileUpdateSchema,
    AdminUserCreateSchema,
    BulkUserCreateSchema,
    PasswordChangeSchema,
    ForcePasswordChangeSchema,
    RoleSchema,
    RoleCreateSchema,
    RoleUpdateSchema,
    PermissionSchema
)
from app.core.responses import success_response, created_response, no_content_response, paginated_response
from app.core.decorators import require_role, validate_json, handle_exceptions
from app.core.pagination import PaginationParams


@users_bp.route('/', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def list_users():
    """
    Kullanıcı listesi.
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: per_page
        in: query
        schema:
          type: integer
          default: 20
      - name: role
        in: query
        schema:
          type: string
      - name: is_active
        in: query
        schema:
          type: boolean
      - name: search
        in: query
        schema:
          type: string
    responses:
      200:
        description: Kullanıcı listesi
    """
    params = PaginationParams.from_request()
    
    filters = {
        'role': request.args.get('role'),
        'is_active': request.args.get('is_active'),
        'search': request.args.get('search')
    }
    
    result = UserService.get_paginated(
        page=params.page,
        per_page=params.per_page,
        **{k: v for k, v in filters.items() if v is not None}
    )
    
    return paginated_response(
        items=[u.to_dict() for u in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_user(user_id: int):
    """
    Kullanıcı detayı.
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - name: user_id
        in: path
        required: true
        schema:
          type: integer
    responses:
      200:
        description: Kullanıcı bilgileri
      404:
        description: Kullanıcı bulunamadı
    """
    user = UserService.get_or_404(user_id)
    
    return success_response(data={'user': user.to_dict()})


@users_bp.route('/', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(UserCreateSchema)
def create_user():
    """
    Yeni kullanıcı oluştur.
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UserCreate'
    responses:
      201:
        description: Kullanıcı oluşturuldu
      400:
        description: Validation hatası
      409:
        description: E-posta zaten kayıtlı
    """
    data = g.validated_data
    
    user = UserService.create_user(data)
    
    return created_response(
        data={'user': user.to_dict()},
        message='Kullanıcı başarıyla oluşturuldu'
    )


@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(UserUpdateSchema)
def update_user(user_id: int):
    """
    Kullanıcı güncelle.
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - name: user_id
        in: path
        required: true
        schema:
          type: integer
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UserUpdate'
    responses:
      200:
        description: Kullanıcı güncellendi
      404:
        description: Kullanıcı bulunamadı
    """
    data = g.validated_data
    
    user = UserService.update_user(user_id, data)
    
    return success_response(
        data={'user': user.to_dict()},
        message='Kullanıcı başarıyla güncellendi'
    )


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def delete_user(user_id: int):
    """
    Kullanıcı sil (soft delete).
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - name: user_id
        in: path
        required: true
        schema:
          type: integer
    responses:
      204:
        description: Kullanıcı silindi
      404:
        description: Kullanıcı bulunamadı
    """
    UserService.soft_delete(user_id)
    
    return no_content_response()


@users_bp.route('/profile', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_profile():
    """
    Kendi profilini getir.
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    responses:
      200:
        description: Profil bilgileri
    """
    user_id = get_jwt_identity()
    user = UserService.get_or_404(user_id)
    
    return success_response(data={'user': user.to_dict()})


@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
@handle_exceptions
@validate_json(ProfileUpdateSchema)
def update_profile():
    """
    Kendi profilini güncelle.
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProfileUpdate'
    responses:
      200:
        description: Profil güncellendi
    """
    user_id = get_jwt_identity()
    data = g.validated_data
    
    user = UserService.update_profile(user_id, data)
    
    return success_response(
        data={'user': user.to_dict()},
        message='Profil başarıyla güncellendi'
    )


@users_bp.route('/<int:user_id>/activate', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def activate_user(user_id: int):
    """
    Kullanıcıyı aktif et.
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - name: user_id
        in: path
        required: true
        schema:
          type: integer
    responses:
      200:
        description: Kullanıcı aktif edildi
    """
    user = UserService.activate_user(user_id)
    
    return success_response(
        data={'user': user.to_dict()},
        message='Kullanıcı aktif edildi'
    )


@users_bp.route('/<int:user_id>/deactivate', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def deactivate_user(user_id: int):
    """
    Kullanıcıyı deaktif et.
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - name: user_id
        in: path
        required: true
        schema:
          type: integer
    responses:
      200:
        description: Kullanıcı deaktif edildi
    """
    user = UserService.deactivate_user(user_id)
    
    return success_response(
        data={'user': user.to_dict()},
        message='Kullanıcı deaktif edildi'
    )


# =============================================================================
# ADMIN USER CREATION
# =============================================================================

@users_bp.route('/admin/create', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(AdminUserCreateSchema)
def admin_create_user():
    """
    Admin tarafından kullanıcı oluştur.
    
    İlk girişte şifre değiştirme zorunlu olur.
    
    ---
    tags:
      - Users
      - Admin
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/AdminUserCreate'
    responses:
      201:
        description: Kullanıcı oluşturuldu
      400:
        description: Validation hatası
      409:
        description: E-posta zaten kayıtlı
    """
    data = g.validated_data
    admin_id = get_jwt_identity()
    
    user, temp_password = UserService.admin_create_user(
        data=data,
        created_by=admin_id,
        send_email=data.get('send_email', True)
    )
    
    response_data = {
        'user': user.to_dict(),
        'force_password_change': True
    }
    
    # Geçici şifreyi sadece e-posta gönderilmediyse döndür
    if not data.get('send_email', True):
        response_data['temp_password'] = temp_password
    
    return created_response(
        data=response_data,
        message='Kullanıcı başarıyla oluşturuldu. İlk girişte şifre değişikliği gerekecektir.'
    )


@users_bp.route('/admin/bulk-create', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(BulkUserCreateSchema)
def admin_bulk_create_users():
    """
    Toplu kullanıcı oluştur.
    
    ---
    tags:
      - Users
      - Admin
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              users:
                type: array
                items:
                  $ref: '#/components/schemas/AdminUserCreate'
    responses:
      201:
        description: Kullanıcılar oluşturuldu
    """
    data = g.validated_data
    admin_id = get_jwt_identity()
    
    created_users, errors = UserService.bulk_create_users(
        users_data=data.get('users', []),
        created_by=admin_id
    )
    
    return created_response(
        data={
            'created': created_users,
            'errors': errors,
            'total_created': len(created_users),
            'total_errors': len(errors)
        },
        message=f'{len(created_users)} kullanıcı oluşturuldu, {len(errors)} hata oluştu'
    )


@users_bp.route('/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def admin_reset_password(user_id: int):
    """
    Admin tarafından şifre sıfırla.
    
    Geçici şifre oluşturur ve e-posta gönderir.
    
    ---
    tags:
      - Users
      - Admin
    security:
      - bearerAuth: []
    parameters:
      - name: user_id
        in: path
        required: true
        schema:
          type: integer
    responses:
      200:
        description: Şifre sıfırlandı
    """
    admin_id = get_jwt_identity()
    
    user, temp_password = UserService.admin_reset_password(
        user_id=user_id,
        admin_id=admin_id
    )
    
    return success_response(
        data={
            'user': user.to_dict(),
            'temp_password': temp_password,
            'force_password_change': True
        },
        message='Şifre sıfırlandı ve kullanıcıya e-posta gönderildi'
    )


@users_bp.route('/<int:user_id>/unlock', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def admin_unlock_user(user_id: int):
    """
    Kilitli hesabı aç.
    
    ---
    tags:
      - Users
      - Admin
    security:
      - bearerAuth: []
    parameters:
      - name: user_id
        in: path
        required: true
        schema:
          type: integer
    responses:
      200:
        description: Hesap kilidi açıldı
    """
    admin_id = get_jwt_identity()
    
    user = UserService.unlock_user_account(
        user_id=user_id,
        admin_id=admin_id
    )
    
    return success_response(
        data={'user': user.to_dict()},
        message='Hesap kilidi açıldı'
    )


# =============================================================================
# PASSWORD CHANGE
# =============================================================================

@users_bp.route('/password/change', methods=['POST'])
@jwt_required()
@handle_exceptions
@validate_json(PasswordChangeSchema)
def change_password():
    """
    Kendi şifresini değiştir.
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - old_password
              - new_password
            properties:
              old_password:
                type: string
              new_password:
                type: string
    responses:
      200:
        description: Şifre değiştirildi
      400:
        description: Mevcut şifre yanlış
    """
    data = g.validated_data
    user_id = get_jwt_identity()
    
    user = UserService.change_password(
        user_id=user_id,
        old_password=data['old_password'],
        new_password=data['new_password']
    )
    
    return success_response(
        data={'user': user.to_dict()},
        message='Şifreniz başarıyla değiştirildi'
    )


@users_bp.route('/password/force-change', methods=['POST'])
@jwt_required()
@handle_exceptions
@validate_json(ForcePasswordChangeSchema)
def force_change_password():
    """
    İlk giriş sonrası zorunlu şifre değişikliği.
    
    force_password_change flag'i aktifse kullanılabilir.
    
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - new_password
            properties:
              new_password:
                type: string
    responses:
      200:
        description: Şifre değiştirildi
      400:
        description: Şifre değişikliği gerekli değil
    """
    data = g.validated_data
    user_id = get_jwt_identity()
    
    user = UserService.force_change_password(
        user_id=user_id,
        new_password=data['new_password']
    )
    
    return success_response(
        data={'user': user.to_dict()},
        message='Şifreniz başarıyla değiştirildi'
    )


# =============================================================================
# ROLE MANAGEMENT
# =============================================================================

@users_bp.route('/roles', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def list_roles():
    """
    Rol listesi.
    
    ---
    tags:
      - Roles
    security:
      - bearerAuth: []
    responses:
      200:
        description: Rol listesi
    """
    roles = RoleService.get_all_roles()
    user_counts = RoleService.get_users_count_by_role()
    
    roles_data = []
    for role in roles:
        role_dict = {
            'id': role.id,
            'name': role.name,
            'description': role.description,
            'is_system': role.is_system,
            'permissions': [p.name for p in role.permissions],
            'user_count': user_counts.get(role.name, 0)
        }
        roles_data.append(role_dict)
    
    return success_response(data={'roles': roles_data})


@users_bp.route('/roles/<int:role_id>', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_role(role_id: int):
    """
    Rol detayı.
    
    ---
    tags:
      - Roles
    security:
      - bearerAuth: []
    responses:
      200:
        description: Rol bilgileri
    """
    role = RoleService.get_or_404(role_id)
    
    role_data = {
        'id': role.id,
        'name': role.name,
        'description': role.description,
        'is_system': role.is_system,
        'permissions': [{'id': p.id, 'name': p.name, 'description': p.description} for p in role.permissions],
        'user_count': role.users.count()
    }
    
    return success_response(data={'role': role_data})


@users_bp.route('/roles', methods=['POST'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
@validate_json(RoleCreateSchema)
def create_role():
    """
    Yeni rol oluştur.
    
    ---
    tags:
      - Roles
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/RoleCreate'
    responses:
      201:
        description: Rol oluşturuldu
    """
    data = g.validated_data
    
    role = RoleService.create_role(
        name=data['name'],
        description=data.get('description')
    )
    
    return created_response(
        data={'role': {'id': role.id, 'name': role.name, 'description': role.description}},
        message='Rol başarıyla oluşturuldu'
    )


@users_bp.route('/roles/<int:role_id>', methods=['PUT'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
@validate_json(RoleUpdateSchema)
def update_role(role_id: int):
    """
    Rol güncelle.
    
    ---
    tags:
      - Roles
    security:
      - bearerAuth: []
    responses:
      200:
        description: Rol güncellendi
    """
    data = g.validated_data
    
    role = RoleService.update_role(role_id, data)
    
    return success_response(
        data={'role': {'id': role.id, 'name': role.name, 'description': role.description}},
        message='Rol başarıyla güncellendi'
    )


@users_bp.route('/roles/<int:role_id>', methods=['DELETE'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def delete_role(role_id: int):
    """
    Rol sil.
    
    ---
    tags:
      - Roles
    security:
      - bearerAuth: []
    responses:
      204:
        description: Rol silindi
    """
    RoleService.delete_role(role_id)
    
    return no_content_response()


@users_bp.route('/roles/<int:role_id>/permissions', methods=['POST'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def assign_permission_to_role(role_id: int):
    """
    Role yetki ekle.
    
    ---
    tags:
      - Roles
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - permission_name
            properties:
              permission_name:
                type: string
    responses:
      200:
        description: Yetki eklendi
    """
    role = RoleService.get_or_404(role_id)
    permission_name = request.json.get('permission_name')
    
    RoleService.assign_permission(role.name, permission_name)
    
    return success_response(message=f'{permission_name} yetkisi eklendi')


@users_bp.route('/roles/<int:role_id>/permissions/<permission_name>', methods=['DELETE'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def remove_permission_from_role(role_id: int, permission_name: str):
    """
    Rolden yetki kaldır.
    
    ---
    tags:
      - Roles
    security:
      - bearerAuth: []
    responses:
      200:
        description: Yetki kaldırıldı
    """
    role = RoleService.get_or_404(role_id)
    
    RoleService.remove_permission(role.name, permission_name)
    
    return success_response(message=f'{permission_name} yetkisi kaldırıldı')


# =============================================================================
# PERMISSION MANAGEMENT
# =============================================================================

@users_bp.route('/permissions', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def list_permissions():
    """
    Yetki listesi.
    
    ---
    tags:
      - Permissions
    security:
      - bearerAuth: []
    responses:
      200:
        description: Yetki listesi
    """
    permissions = PermissionService.get_all_permissions()
    
    permissions_data = [
        {
            'id': p.id,
            'name': p.name,
            'resource': p.resource,
            'action': p.action,
            'description': p.description
        }
        for p in permissions
    ]
    
    # Kaynak tipine göre grupla
    grouped = {}
    for p in permissions_data:
        resource = p['resource']
        if resource not in grouped:
            grouped[resource] = []
        grouped[resource].append(p)
    
    return success_response(data={
        'permissions': permissions_data,
        'grouped': grouped
    })


@users_bp.route('/permissions', methods=['POST'])
@jwt_required()
@require_role('super_admin')
@handle_exceptions
def create_permission():
    """
    Yeni yetki oluştur.
    
    ---
    tags:
      - Permissions
    security:
      - bearerAuth: []
    responses:
      201:
        description: Yetki oluşturuldu
    """
    data = request.json
    
    permission = PermissionService.create_permission(
        name=data['name'],
        resource=data['resource'],
        action=data['action'],
        description=data.get('description')
    )
    
    return created_response(
        data={'permission': {'id': permission.id, 'name': permission.name}},
        message='Yetki başarıyla oluşturuldu'
    )

