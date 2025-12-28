"""
Organizations Module
═══════════════════════════════════════════════════════════════════════════════

Multi-tenant kurum yönetimi modülü.

Bu modül şunları sağlar:
- Kurum CRUD işlemleri
- Kurum bazlı kullanıcı yönetimi
- Kurum davetleri
- Kurum istatistikleri
"""

from app.modules.organizations.services import OrganizationService
from app.modules.organizations.routes import organizations_bp

__all__ = ['OrganizationService', 'organizations_bp']
