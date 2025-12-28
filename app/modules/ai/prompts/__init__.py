"""
Prompt Layer Package.

Kurumsal prompt yönetim sistemi:
- YAML tabanlı template'ler
- Versiyon kontrolü
- A/B testing
- Rollback
- Audit logging

KULLANIM:
=========
    # Legacy (basit kullanım)
    from app.modules.ai.prompts import prompt_manager
    system, user, template = prompt_manager.get_prompt(feature, variables, role)
    
    # Enterprise (versioned)
    from app.modules.ai.prompts import prompt_version_manager
    prompt = prompt_version_manager.get_active_prompt('question_hint')
    
    # A/B test variant
    prompt, variant = prompt_version_manager.get_ab_test_variant('question_hint', user_id)
"""

# Legacy Manager
from app.modules.ai.prompts.manager import (
    PromptTemplate,
    PromptValidator,
    PromptBuilder,
    PromptRegistry,
    PromptManager,
    prompt_manager
)

# Enterprise Versioning
from app.modules.ai.prompts.versioning import (
    PromptVersion,
    PromptStatus,
    PromptChangeType,
    PromptAuditEntry,
    ABTestConfig,
    PromptVersionStorage,
    PromptVersionManager,
    prompt_version_manager
)

__all__ = [
    # Legacy
    'PromptTemplate',
    'PromptValidator',
    'PromptBuilder',
    'PromptRegistry',
    'PromptManager',
    'prompt_manager',
    
    # Enterprise Versioning
    'PromptVersion',
    'PromptStatus',
    'PromptChangeType',
    'PromptAuditEntry',
    'ABTestConfig',
    'PromptVersionStorage',
    'PromptVersionManager',
    'prompt_version_manager',
]
