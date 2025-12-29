"""
Database models package.
"""

from app.models.user import User, Role, Permission, RolePermission
from app.models.organization import (
    Organization, OrganizationInvitation, OrganizationStatus,
    get_organization_by_slug, get_organization_users, create_organization
)
from app.models.course import Course, Category, Topic, Enrollment
from app.models.content import Video, Document, VideoProgress
from app.models.question import Question, Answer, QuestionAttempt
from app.models.exam import Exam, ExamStatus, ExamType, ExamAttempt, AttemptStatus, AttemptAnswer
from app.models.evaluation import Evaluation, StudentProgress
from app.models.live_session import LiveSession, SessionAttendance
from app.models.ai import AIUsageLog, AIQuota, AIConfiguration, AIViolation
from app.models.package import (
    Package, UserPackage, PackageStatus, PackageType, 
    PaymentStatus, SubscriptionStatus,
    get_user_active_packages, check_user_course_access,
    expire_subscriptions, get_expiring_subscriptions
)
from app.models.audit import (
    AuditLog, AuditAction, AuditSeverity, AuditLogger,
    get_user_audit_logs, get_resource_audit_logs,
    get_security_audit_logs, get_failed_logins, cleanup_old_logs
)
from app.models.ai_chat import (
    AIChatSession, AIChatMessage, AIDataRetentionLog,
    ChatSessionStatus, MessageRole,
    anonymize_old_sessions, delete_anonymized_sessions,
    get_user_chat_history, create_chat_session
)
from app.models.ai_prompt import (
    AIPromptTemplate, AIPromptUsageLog, AIUsageSummary,
    AIDataRetentionPolicy, PromptTemplateStatus
)
from app.models.education_video import (
    EducationVideo, VideoWatchHistory,
    GradeLevel, EducationLevel, Subject, VideoOwnerType,
    GRADE_LABELS, EDUCATION_LEVEL_LABELS, SUBJECT_LABELS
)
from app.models.goal import (
    Goal, GoalAssignment, GoalType, GoalStatus
)

__all__ = [
    # Organization models (Multi-tenant)
    'Organization',
    'OrganizationInvitation',
    'OrganizationStatus',
    'get_organization_by_slug',
    'get_organization_users',
    'create_organization',
    
    # User models
    'User',
    'Role', 
    'Permission',
    'RolePermission',
    
    # Course models
    'Course',
    'Category',
    'Topic',
    'Enrollment',
    
    # Content models
    'Video',
    'Document',
    'VideoProgress',
    
    # Question models
    'Question',
    'Answer',
    'QuestionAttempt',
    
    # Exam models
    'Exam',
<<<<<<< HEAD
    'ExamQuestion',
    'ExamResult',
    'ExamAnswer',
=======
    'ExamStatus',
    'ExamType',
    'ExamAttempt',
    'AttemptStatus',
    'AttemptAnswer',
>>>>>>> eski/main
    
    # Evaluation models
    'Evaluation',
    'StudentProgress',
    
    # Live Session models
    'LiveSession',
    'SessionAttendance',
    
    # AI models
    'AIUsageLog',
    'AIQuota',
    'AIConfiguration',
    'AIViolation',
    
    # Package models
    'Package',
    'UserPackage',
    'PackageStatus',
    'PackageType',
    'PaymentStatus',
    'SubscriptionStatus',
    'get_user_active_packages',
    'check_user_course_access',
    'expire_subscriptions',
    'get_expiring_subscriptions',
    
    # Audit models
    'AuditLog',
    'AuditAction',
    'AuditSeverity',
    'AuditLogger',
    'get_user_audit_logs',
    'get_resource_audit_logs',
    'get_security_audit_logs',
    'get_failed_logins',
    'cleanup_old_logs',
    
    # AI Chat models
    'AIChatSession',
    'AIChatMessage',
    'AIDataRetentionLog',
    'ChatSessionStatus',
    'MessageRole',
    'anonymize_old_sessions',
    'delete_anonymized_sessions',
    'get_user_chat_history',
    'create_chat_session',
    
    # AI Prompt models
    'AIPromptTemplate',
    'AIPromptUsageLog',
    'AIUsageSummary',
    'AIDataRetentionPolicy',
    'PromptTemplateStatus',
<<<<<<< HEAD
=======
    
    # Education Video models
    'EducationVideo',
    'VideoWatchHistory',
    'GradeLevel',
    'EducationLevel',
    'Subject',
    'VideoOwnerType',
    'GRADE_LABELS',
    'EDUCATION_LEVEL_LABELS',
    'SUBJECT_LABELS',
    
    # Goal models (Hedefler)
    'Goal',
    'GoalAssignment',
    'GoalType',
    'GoalStatus',
>>>>>>> eski/main
]
