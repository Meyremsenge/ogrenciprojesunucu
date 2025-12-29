"""
Goals Module - Routes

Hedef yönetimi endpoint'leri.
"""

from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.modules.goals import goals_bp
from app.services.goal_service import GoalService
from app.models.goal import Goal, GoalType, GoalStatus
from app.models.user import User
from app.core.responses import success_response, created_response, error_response, paginated_response
from app.core.decorators import require_role, handle_exceptions
from app.core.pagination import PaginationParams


@goals_bp.route('', methods=['GET'])
@jwt_required()
@handle_exceptions
def list_goals():
    """
    Hedef listesi.
    
    Öğrenci: Kendi hedeflerini görür
    Öğretmen/Admin: Tüm öğrencilerin hedeflerini görür (kendi kurumu)
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    params = PaginationParams.from_request()
    status = request.args.get('status')
    goal_type = request.args.get('goal_type')
    student_id = request.args.get('student_id', type=int)
    
    # Query başlat
    query = Goal.query
    
    # Erişim kontrolü
    if user_role == 'student':
        query = query.filter(Goal.student_id == current_user_id)
    elif user_role in ['teacher', 'admin']:
        # Kendi kurumundaki öğrencilerin hedeflerini görebilir
        query = query.filter(Goal.organization_id == user.organization_id)
        if student_id:
            query = query.filter(Goal.student_id == student_id)
    elif user_role == 'super_admin':
        if student_id:
            query = query.filter(Goal.student_id == student_id)
    else:
        query = query.filter(Goal.student_id == current_user_id)
    
    # Filtreler
    if status:
        try:
            query = query.filter(Goal.status == GoalStatus(status))
        except ValueError:
            pass
    
    if goal_type:
        try:
            query = query.filter(Goal.goal_type == GoalType(goal_type))
        except ValueError:
            pass
    
    # Sıralama: due_date yaklaşan önce
    query = query.order_by(Goal.due_date.asc().nullslast(), Goal.created_at.desc())
    
    # Sayfalama
    pagination = query.paginate(page=params.page, per_page=params.per_page, error_out=False)
    
    return paginated_response(
        items=[g.to_dict() for g in pagination.items],
        page=params.page,
        per_page=params.per_page,
        total=pagination.total
    )


@goals_bp.route('/my', methods=['GET'])
@jwt_required()
@handle_exceptions
def my_goals():
    """Kendi hedeflerim"""
    current_user_id = get_jwt_identity()
    
    status = request.args.get('status')
    goal_type = request.args.get('goal_type')
    
    status_enum = GoalStatus(status) if status else None
    type_enum = GoalType(goal_type) if goal_type else None
    
    goals = GoalService.get_student_goals(
        student_id=current_user_id,
        status=status_enum,
        goal_type=type_enum
    )
    
    return success_response(data={
        'goals': [g.to_dict() for g in goals],
        'count': len(goals)
    })


@goals_bp.route('/my/statistics', methods=['GET'])
@jwt_required()
@handle_exceptions
def my_goal_statistics():
    """Kendi hedef istatistiklerim"""
    current_user_id = get_jwt_identity()
    
    stats = GoalService.get_goal_statistics(current_user_id)
    
    return success_response(data=stats)


@goals_bp.route('/<int:goal_id>', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_goal(goal_id: int):
    """Hedef detayı"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    goal = Goal.query.get(goal_id)
    if not goal:
        return error_response('Hedef bulunamadı', status_code=404)
    
    # Erişim kontrolü
    if user_role == 'student' and goal.student_id != current_user_id:
        return error_response('Bu hedefe erişim yetkiniz yok', status_code=403)
    elif user_role in ['teacher', 'admin'] and goal.organization_id != user.organization_id:
        return error_response('Bu hedefe erişim yetkiniz yok', status_code=403)
    
    return success_response(data={'goal': goal.to_dict()})


@goals_bp.route('/<int:goal_id>/progress', methods=['PUT'])
@jwt_required()
@handle_exceptions
def update_progress(goal_id: int):
    """Hedef ilerlemesi güncelle"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    goal = Goal.query.get(goal_id)
    if not goal:
        return error_response('Hedef bulunamadı', status_code=404)
    
    # Öğrenci sadece kendi hedefini güncelleyebilir
    if user_role == 'student' and goal.student_id != current_user_id:
        return error_response('Bu hedefi güncelleme yetkiniz yok', status_code=403)
    
    data = request.get_json() or {}
    progress = data.get('progress')
    achieved_score = data.get('achieved_score')
    
    updated_goal = GoalService.update_goal_progress(
        goal_id=goal_id,
        progress=progress,
        achieved_score=achieved_score
    )
    
    return success_response(
        data={'goal': updated_goal.to_dict()},
        message='Hedef güncellendi'
    )


@goals_bp.route('/assign-exam', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def assign_exam_goals():
    """
    Quiz'i öğrencilere hedef olarak ata.
    
    Body:
    - exam_id: int
    - exam_title: str
    - grade_level: str
    - organization_id: int (optional)
    - due_date: str (optional, ISO format)
    - target_score: int (optional, default 60)
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    data = request.get_json() or {}
    
    exam_id = data.get('exam_id')
    exam_title = data.get('exam_title')
    grade_level = data.get('grade_level')
    target_score = data.get('target_score', 60)
    
    if not exam_id or not exam_title:
        return error_response('exam_id ve exam_title zorunludur', status_code=400)
    
    # Organization belirleme
    organization_id = data.get('organization_id')
    if user_role != 'super_admin':
        organization_id = user.organization_id
    
    # Due date parse
    due_date = None
    if data.get('due_date'):
        from datetime import datetime
        try:
            due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        except ValueError:
            pass
    
    result = GoalService.assign_exam_to_students(
        exam_id=exam_id,
        exam_title=exam_title,
        grade_level=grade_level,
        organization_id=organization_id,
        due_date=due_date,
        target_score=target_score,
        created_by=current_user_id
    )
    
    return created_response(
        data=result,
        message=f'{result["assigned_count"]} öğrenciye hedef atandı'
    )


@goals_bp.route('/<int:goal_id>', methods=['DELETE'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def delete_goal(goal_id: int):
    """Hedef sil"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    goal = Goal.query.get(goal_id)
    if not goal:
        return error_response('Hedef bulunamadı', status_code=404)
    
    # Erişim kontrolü
    if user_role != 'super_admin' and goal.organization_id != user.organization_id:
        return error_response('Bu hedefi silme yetkiniz yok', status_code=403)
    
    db.session.delete(goal)
    db.session.commit()
    
    return success_response(message='Hedef silindi')
