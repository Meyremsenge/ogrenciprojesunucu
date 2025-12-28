"""
Organization Routes
═══════════════════════════════════════════════════════════════════════════════

Kurum yönetimi API endpoint'leri.
Super Admin yetkisi gerektirir.
"""

from flask import Blueprint, request, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.core.responses import success_response, error_response, paginated_response
from app.core.decorators import super_admin_required, admin_required
from app.core.exceptions import ValidationError, NotFoundError
from app.modules.organizations.services import OrganizationService
from app.models import User

organizations_bp = Blueprint('organizations', __name__, url_prefix='/api/v1/organizations')


# ═══════════════════════════════════════════════════════════════════════════════
# CRUD Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@organizations_bp.route('', methods=['GET'])
@jwt_required()
@super_admin_required
def list_organizations():
    """
    Tüm kurumları listele.
    
    Query params:
        - page: Sayfa numarası
        - per_page: Sayfa başına kayıt
        - status: Durum filtresi
        - search: Arama terimi
        - is_active: Aktiflik filtresi
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    search = request.args.get('search')
    is_active = request.args.get('is_active')
    
    if is_active is not None:
        is_active = is_active.lower() == 'true'
    
    organizations, total = OrganizationService.list_all(
        page=page,
        per_page=per_page,
        status=status,
        search=search,
        is_active=is_active
    )
    
    return paginated_response(
        items=[org.to_dict() for org in organizations],
        total=total,
        page=page,
        per_page=per_page,
        message='Kurumlar listelendi'
    )


@organizations_bp.route('', methods=['POST'])
@jwt_required()
@super_admin_required
def create_organization():
    """
    Yeni kurum oluştur.
    
    Body:
        - name: Kurum adı (zorunlu)
        - email: Email
        - phone: Telefon
        - description: Açıklama
        - max_students: Maks öğrenci
        - max_teachers: Maks öğretmen
        - subscription_plan: Abonelik planı
    """
    data = request.get_json() or {}
    
    if not data.get('name'):
        return error_response('Kurum adı zorunludur', status_code=400)
    
    org = OrganizationService.create(data)
    
    return success_response(
        data=org.to_dict(),
        message='Kurum oluşturuldu',
        status_code=201
    )


@organizations_bp.route('/<int:org_id>', methods=['GET'])
@jwt_required()
@super_admin_required
def get_organization(org_id):
    """Kurum detaylarını getir."""
    org = OrganizationService.get_by_id(org_id)
    return success_response(data=org.to_dict())


@organizations_bp.route('/<int:org_id>', methods=['PUT'])
@jwt_required()
@super_admin_required
def update_organization(org_id):
    """Kurum güncelle."""
    data = request.get_json() or {}
    org = OrganizationService.update(org_id, data)
    return success_response(data=org.to_dict(), message='Kurum güncellendi')


@organizations_bp.route('/<int:org_id>', methods=['DELETE'])
@jwt_required()
@super_admin_required
def delete_organization(org_id):
    """Kurum sil."""
    hard_delete = request.args.get('hard', 'false').lower() == 'true'
    OrganizationService.delete(org_id, hard_delete=hard_delete)
    return success_response(message='Kurum silindi')


# ═══════════════════════════════════════════════════════════════════════════════
# Stats & Dashboard
# ═══════════════════════════════════════════════════════════════════════════════

@organizations_bp.route('/<int:org_id>/stats', methods=['GET'])
@jwt_required()
@super_admin_required
def get_organization_stats(org_id):
    """Kurum istatistiklerini getir."""
    stats = OrganizationService.get_organization_stats(org_id)
    return success_response(data=stats)


@organizations_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@super_admin_required
def get_organizations_dashboard():
    """Tüm kurumlar için özet dashboard."""
    from app.models import Organization
    from sqlalchemy import func
    from app.extensions import db
    
    # Total counts
    total_orgs = Organization.query.count()
    active_orgs = Organization.query.filter_by(is_active=True).count()
    
    # By status
    status_counts = db.session.query(
        Organization.status,
        func.count(Organization.id)
    ).group_by(Organization.status).all()
    
    # By plan
    plan_counts = db.session.query(
        Organization.subscription_plan,
        func.count(Organization.id)
    ).group_by(Organization.subscription_plan).all()
    
    # Recent organizations
    recent = Organization.query.order_by(
        Organization.created_at.desc()
    ).limit(5).all()
    
    # Expiring soon
    expiring = OrganizationService.check_expiring_subscriptions(days=14)
    
    return success_response(data={
        'total': total_orgs,
        'active': active_orgs,
        'by_status': {status: count for status, count in status_counts},
        'by_plan': {plan: count for plan, count in plan_counts},
        'recent': [org.to_dict(include_stats=False) for org in recent],
        'expiring_soon': [org.to_dict(include_stats=False) for org in expiring],
    })


# ═══════════════════════════════════════════════════════════════════════════════
# User Management
# ═══════════════════════════════════════════════════════════════════════════════

@organizations_bp.route('/<int:org_id>/users', methods=['GET'])
@jwt_required()
@super_admin_required
def get_organization_users(org_id):
    """Kurum kullanıcılarını listele."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    role = request.args.get('role')
    search = request.args.get('search')
    is_active = request.args.get('is_active')
    
    if is_active is not None:
        is_active = is_active.lower() == 'true'
    
    users, total = OrganizationService.get_organization_users(
        org_id=org_id,
        role=role,
        page=page,
        per_page=per_page,
        search=search,
        is_active=is_active
    )
    
    return paginated_response(
        items=[u.to_dict() for u in users],
        total=total,
        page=page,
        per_page=per_page
    )


@organizations_bp.route('/<int:org_id>/users/<int:user_id>', methods=['POST'])
@jwt_required()
@super_admin_required
def add_user_to_organization(org_id, user_id):
    """Kullanıcıyı kuruma ekle."""
    user = OrganizationService.add_user_to_organization(org_id, user_id)
    return success_response(
        data=user.to_dict(),
        message='Kullanıcı kuruma eklendi'
    )


@organizations_bp.route('/<int:org_id>/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@super_admin_required
def remove_user_from_organization(org_id, user_id):
    """Kullanıcıyı kurumdan çıkar."""
    user = OrganizationService.remove_user_from_organization(user_id)
    return success_response(message='Kullanıcı kurumdan çıkarıldı')


# ═══════════════════════════════════════════════════════════════════════════════
# Invitation Management
# ═══════════════════════════════════════════════════════════════════════════════

@organizations_bp.route('/<int:org_id>/invitations', methods=['GET'])
@jwt_required()
@super_admin_required
def get_invitations(org_id):
    """Bekleyen davetleri listele."""
    invitations = OrganizationService.get_pending_invitations(org_id)
    return success_response(data=[inv.to_dict() for inv in invitations])


@organizations_bp.route('/<int:org_id>/invitations', methods=['POST'])
@jwt_required()
@super_admin_required
def create_invitation(org_id):
    """
    Kurum daveti oluştur.
    
    Body:
        - email: Davet edilecek email
        - role: Rol (student, teacher, admin)
    """
    data = request.get_json() or {}
    
    if not data.get('email'):
        return error_response('Email zorunludur', status_code=400)
    
    if not data.get('role'):
        return error_response('Rol zorunludur', status_code=400)
    
    current_user_id = int(get_jwt_identity())
    
    invitation = OrganizationService.create_invitation(
        org_id=org_id,
        email=data['email'],
        role=data['role'],
        invited_by_id=current_user_id,
        expires_days=data.get('expires_days', 7)
    )
    
    return success_response(
        data=invitation.to_dict(),
        message='Davet oluşturuldu',
        status_code=201
    )


@organizations_bp.route('/invitations/<int:invitation_id>', methods=['DELETE'])
@jwt_required()
@super_admin_required
def cancel_invitation(invitation_id):
    """Daveti iptal et."""
    OrganizationService.cancel_invitation(invitation_id)
    return success_response(message='Davet iptal edildi')


@organizations_bp.route('/invitations/accept', methods=['POST'])
@jwt_required()
def accept_invitation():
    """
    Daveti kabul et.
    
    Body:
        - token: Davet tokeni
    """
    data = request.get_json() or {}
    
    if not data.get('token'):
        return error_response('Token zorunludur', status_code=400)
    
    current_user_id = int(get_jwt_identity())
    
    org, user = OrganizationService.accept_invitation(
        token=data['token'],
        user_id=current_user_id
    )
    
    return success_response(
        data={
            'organization': org.to_dict(include_stats=False),
            'user': user.to_dict()
        },
        message='Davet kabul edildi'
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Subscription Management
# ═══════════════════════════════════════════════════════════════════════════════

@organizations_bp.route('/<int:org_id>/subscription', methods=['PUT'])
@jwt_required()
@super_admin_required
def update_subscription(org_id):
    """
    Abonelik güncelle.
    
    Body:
        - plan: Abonelik planı (trial, basic, pro, enterprise)
        - duration_months: Süre (ay)
    """
    data = request.get_json() or {}
    
    if not data.get('plan'):
        return error_response('Plan zorunludur', status_code=400)
    
    org = OrganizationService.update_subscription(
        org_id=org_id,
        plan=data['plan'],
        duration_months=data.get('duration_months', 12)
    )
    
    return success_response(
        data=org.to_dict(),
        message='Abonelik güncellendi'
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Current User Organization
# ═══════════════════════════════════════════════════════════════════════════════

@organizations_bp.route('/my-organization', methods=['GET'])
@jwt_required()
def get_my_organization():
    """Mevcut kullanıcının kurumunu getir."""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return error_response('Kuruma ait değilsiniz', status_code=404)
    
    org = OrganizationService.get_by_id(user.organization_id)
    
    return success_response(data=org.to_dict(include_stats=False))


@organizations_bp.route('/my-organization/users', methods=['GET'])
@jwt_required()
@admin_required
def get_my_organization_users():
    """Kullanıcının kurumundaki diğer kullanıcıları getir (Admin yetkisi gerekir)."""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return error_response('Kuruma ait değilsiniz', status_code=404)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    role = request.args.get('role')
    search = request.args.get('search')
    
    users, total = OrganizationService.get_organization_users(
        org_id=user.organization_id,
        role=role,
        page=page,
        per_page=per_page,
        search=search
    )
    
    return paginated_response(
        items=[u.to_dict() for u in users],
        total=total,
        page=page,
        per_page=per_page
    )
