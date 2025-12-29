"""
Goals Service - Hedef Yönetimi Servisi

Quiz, kurs ve video için otomatik hedef atama işlemleri.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import and_, or_

from app.extensions import db
from app.models.goal import Goal, GoalAssignment, GoalType, GoalStatus
from app.models.user import User


class GoalService:
    """Hedef yönetimi servisi"""
    
    @staticmethod
    def create_goal(
        title: str,
        student_id: int,
        goal_type: GoalType,
        target_id: int = None,
        target_type: str = None,
        description: str = None,
        due_date: datetime = None,
        target_score: int = 60,
        grade_level: str = None,
        organization_id: int = None,
        created_by: int = None
    ) -> Goal:
        """Yeni hedef oluştur"""
        goal = Goal(
            title=title,
            description=description,
            goal_type=goal_type,
            status=GoalStatus.PENDING,
            target_id=target_id,
            target_type=target_type,
            student_id=student_id,
            organization_id=organization_id,
            created_by=created_by,
            due_date=due_date,
            target_score=target_score,
            grade_level=grade_level,
            progress=0
        )
        db.session.add(goal)
        db.session.commit()
        return goal
    
    @staticmethod
    def assign_exam_to_students(
        exam_id: int,
        exam_title: str,
        grade_level: str,
        organization_id: int = None,
        due_date: datetime = None,
        target_score: int = 60,
        created_by: int = None
    ) -> Dict[str, Any]:
        """
        Quiz'i ilgili sınıf seviyesindeki öğrencilere hedef olarak ata.
        
        Returns:
            Dict: assigned_count, goal_ids
        """
        # Öğrencileri bul
        query = User.query.filter(
            User.is_active == True,
            User.role.has(name='student')
        )
        
        # Organizasyon filtresi (öğretmen sınavı ise)
        if organization_id:
            query = query.filter(User.organization_id == organization_id)
        
        # Sınıf seviyesi filtresi
        if grade_level:
            query = query.filter(User.grade_level == grade_level)
        
        students = query.all()
        
        if not students:
            return {'assigned_count': 0, 'goal_ids': []}
        
        # Default due date: 1 hafta sonra
        if not due_date:
            due_date = datetime.utcnow() + timedelta(days=7)
        
        goal_ids = []
        for student in students:
            # Aynı hedef zaten var mı kontrol et
            existing = Goal.query.filter(
                Goal.student_id == student.id,
                Goal.target_type == 'exam',
                Goal.target_id == exam_id
            ).first()
            
            if not existing:
                goal = Goal(
                    title=f"Quiz Tamamla: {exam_title}",
                    description=f"{exam_title} quizini tamamla ve en az %{target_score} başarı elde et.",
                    goal_type=GoalType.QUIZ,
                    status=GoalStatus.PENDING,
                    target_id=exam_id,
                    target_type='exam',
                    student_id=student.id,
                    organization_id=student.organization_id,
                    created_by=created_by,
                    due_date=due_date,
                    target_score=target_score,
                    grade_level=grade_level,
                    progress=0
                )
                db.session.add(goal)
                goal_ids.append(goal.id)
        
        # Atama kaydı oluştur
        assignment = GoalAssignment(
            source_type='exam',
            source_id=exam_id,
            grade_level=grade_level,
            organization_id=organization_id,
            assigned_by=created_by,
            assigned_count=len(goal_ids)
        )
        db.session.add(assignment)
        
        db.session.commit()
        
        return {
            'assigned_count': len(goal_ids),
            'goal_ids': goal_ids
        }
    
    @staticmethod
    def get_student_goals(
        student_id: int,
        status: GoalStatus = None,
        goal_type: GoalType = None,
        include_expired: bool = False
    ) -> List[Goal]:
        """Öğrencinin hedeflerini getir"""
        query = Goal.query.filter(Goal.student_id == student_id)
        
        if status:
            query = query.filter(Goal.status == status)
        elif not include_expired:
            query = query.filter(Goal.status != GoalStatus.EXPIRED)
        
        if goal_type:
            query = query.filter(Goal.goal_type == goal_type)
        
        return query.order_by(Goal.due_date.asc()).all()
    
    @staticmethod
    def get_goal_by_id(goal_id: int) -> Optional[Goal]:
        """ID ile hedef getir"""
        return Goal.query.get(goal_id)
    
    @staticmethod
    def update_goal_progress(
        goal_id: int,
        progress: int = None,
        achieved_score: int = None
    ) -> Optional[Goal]:
        """Hedef ilerlemesini güncelle"""
        goal = Goal.query.get(goal_id)
        if not goal:
            return None
        
        if progress is not None:
            goal.progress = min(100, max(0, progress))
            if goal.status == GoalStatus.PENDING:
                goal.status = GoalStatus.IN_PROGRESS
        
        if achieved_score is not None:
            goal.achieved_score = achieved_score
        
        # Tamamlanma kontrolü
        if goal.progress >= 100 or (achieved_score and achieved_score >= goal.target_score):
            goal.status = GoalStatus.COMPLETED
            goal.completed_at = datetime.utcnow()
            goal.progress = 100
        
        db.session.commit()
        return goal
    
    @staticmethod
    def complete_goal_for_exam(student_id: int, exam_id: int, score: int) -> Optional[Goal]:
        """Quiz tamamlandığında hedefi güncelle"""
        goal = Goal.query.filter(
            Goal.student_id == student_id,
            Goal.target_type == 'exam',
            Goal.target_id == exam_id
        ).first()
        
        if goal:
            goal.achieved_score = score
            goal.progress = 100
            goal.completed_at = datetime.utcnow()
            
            if score >= goal.target_score:
                goal.status = GoalStatus.COMPLETED
            else:
                goal.status = GoalStatus.IN_PROGRESS  # Başarısız ama tamamlandı
            
            db.session.commit()
        
        return goal
    
    @staticmethod
    def delete_goals_for_exam(exam_id: int) -> int:
        """Bir sınava ait tüm hedefleri sil"""
        result = Goal.query.filter(
            Goal.target_type == 'exam',
            Goal.target_id == exam_id
        ).delete()
        
        GoalAssignment.query.filter(
            GoalAssignment.source_type == 'exam',
            GoalAssignment.source_id == exam_id
        ).delete()
        
        db.session.commit()
        return result
    
    @staticmethod
    def check_and_expire_goals() -> int:
        """Süresi dolan hedefleri expire olarak işaretle"""
        now = datetime.utcnow()
        expired = Goal.query.filter(
            Goal.due_date < now,
            Goal.status.in_([GoalStatus.PENDING, GoalStatus.IN_PROGRESS])
        ).update({'status': GoalStatus.EXPIRED})
        
        db.session.commit()
        return expired
    
    @staticmethod
    def get_goal_statistics(student_id: int) -> Dict[str, Any]:
        """Öğrenci hedef istatistikleri"""
        goals = Goal.query.filter(Goal.student_id == student_id).all()
        
        total = len(goals)
        completed = sum(1 for g in goals if g.status == GoalStatus.COMPLETED)
        in_progress = sum(1 for g in goals if g.status == GoalStatus.IN_PROGRESS)
        pending = sum(1 for g in goals if g.status == GoalStatus.PENDING)
        expired = sum(1 for g in goals if g.status == GoalStatus.EXPIRED)
        
        # Yaklaşan hedefler (7 gün içinde)
        upcoming_deadline = datetime.utcnow() + timedelta(days=7)
        upcoming = sum(1 for g in goals if g.due_date and g.due_date <= upcoming_deadline and g.status in [GoalStatus.PENDING, GoalStatus.IN_PROGRESS])
        
        return {
            'total': total,
            'completed': completed,
            'in_progress': in_progress,
            'pending': pending,
            'expired': expired,
            'upcoming_deadline': upcoming,
            'completion_rate': round((completed / total * 100), 1) if total > 0 else 0
        }
