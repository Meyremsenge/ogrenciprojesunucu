"""
Database Design Guards Module.

Veritabanı tasarım hatalarını ve anti-pattern'leri önlemek için araçlar.
Senior Software Reviewer perspektifinden hazırlanmıştır.

Kapsanan Alanlar:
    - Index eksiklikleri
    - Foreign key tutarsızlıkları
    - Data integrity
    - Migration güvenliği
    - Query optimization hints
"""

import logging
from typing import Any, Dict, List, Optional, Type
from datetime import datetime

from sqlalchemy import inspect, MetaData
from sqlalchemy.orm import RelationshipProperty
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


# =============================================================================
# 1. INDEX ANALYZER
# =============================================================================

class IndexAnalyzer:
    """
    Eksik veya gereksiz index'leri tespit eder.
    
    RİSK: 
        - Eksik index: Yavaş sorgular, full table scan
        - Gereksiz index: Yavaş INSERT/UPDATE, ekstra depolama
    
    ÖNLEM:
        - Foreign key'lere index ekle
        - Sık sorgulanan alanlara index ekle
        - Kullanılmayan index'leri kaldır
    """
    
    @staticmethod
    def analyze_model(model: Type) -> Dict[str, Any]:
        """Model'in index yapısını analiz eder."""
        mapper = inspect(model)
        table = mapper.mapped_table
        
        result = {
            'table_name': table.name,
            'existing_indexes': [],
            'missing_indexes': [],
            'recommendations': []
        }
        
        # Mevcut index'ler
        for idx in table.indexes:
            result['existing_indexes'].append({
                'name': idx.name,
                'columns': [c.name for c in idx.columns],
                'unique': idx.unique
            })
        
        # Foreign key kontrolü
        for fk in table.foreign_keys:
            fk_column = fk.parent.name
            has_index = any(
                fk_column in [c.name for c in idx.columns]
                for idx in table.indexes
            )
            
            if not has_index:
                result['missing_indexes'].append({
                    'column': fk_column,
                    'reason': 'Foreign key without index',
                    'suggestion': f'CREATE INDEX ix_{table.name}_{fk_column} ON {table.name} ({fk_column})'
                })
        
        # Primary key kontrolü
        if not table.primary_key:
            result['recommendations'].append({
                'type': 'MISSING_PRIMARY_KEY',
                'message': f'Table {table.name} has no primary key',
                'severity': 'CRITICAL'
            })
        
        return result
    
    @staticmethod
    def analyze_all_models(db) -> List[Dict[str, Any]]:
        """Tüm modelleri analiz eder."""
        results = []
        
        for mapper in db.Model.registry.mappers:
            model = mapper.class_
            if hasattr(model, '__tablename__'):
                try:
                    analysis = IndexAnalyzer.analyze_model(model)
                    if analysis['missing_indexes'] or analysis['recommendations']:
                        results.append(analysis)
                except Exception as e:
                    logger.warning(f'Could not analyze {model.__name__}: {e}')
        
        return results


# =============================================================================
# 2. DATA INTEGRITY CHECKER
# =============================================================================

class DataIntegrityChecker:
    """
    Veri bütünlüğü sorunlarını tespit eder.
    
    RİSK:
        - Orphan records (parent'ı olmayan çocuklar)
        - Duplicate records
        - NULL değer sorunları
        - Constraint ihlalleri
    
    ÖNLEM:
        - Foreign key constraint'leri kullan
        - Unique constraint'leri doğru uygula
        - NOT NULL gerekli alanlarda zorunlu
    """
    
    @staticmethod
    def check_orphan_records(db, child_model, parent_model, fk_column: str) -> Dict[str, Any]:
        """
        Orphan kayıtları tespit eder.
        
        Örnek: Course'u olmayan Lesson'lar
        """
        # SQLAlchemy ile orphan kontrolü
        parent_ids = db.session.query(parent_model.id).subquery()
        
        orphan_count = db.session.query(child_model).filter(
            ~getattr(child_model, fk_column).in_(parent_ids)
        ).count()
        
        return {
            'child_table': child_model.__tablename__,
            'parent_table': parent_model.__tablename__,
            'fk_column': fk_column,
            'orphan_count': orphan_count,
            'has_orphans': orphan_count > 0
        }
    
    @staticmethod
    def check_duplicates(db, model, unique_columns: List[str]) -> Dict[str, Any]:
        """
        Duplicate kayıtları tespit eder.
        """
        from sqlalchemy import func
        
        columns = [getattr(model, col) for col in unique_columns]
        
        query = db.session.query(
            *columns,
            func.count().label('count')
        ).group_by(
            *columns
        ).having(
            func.count() > 1
        )
        
        duplicates = query.all()
        
        return {
            'table': model.__tablename__,
            'checked_columns': unique_columns,
            'duplicate_count': len(duplicates),
            'duplicates': [
                {col: getattr(dup, col) for col in unique_columns}
                for dup in duplicates[:10]  # İlk 10'u göster
            ]
        }
    
    @staticmethod
    def check_null_violations(db, model, required_columns: List[str]) -> Dict[str, Any]:
        """
        Olmaması gereken NULL değerleri tespit eder.
        """
        from sqlalchemy import or_
        
        conditions = [
            getattr(model, col) == None
            for col in required_columns
        ]
        
        null_count = db.session.query(model).filter(
            or_(*conditions)
        ).count()
        
        return {
            'table': model.__tablename__,
            'checked_columns': required_columns,
            'null_count': null_count,
            'has_nulls': null_count > 0
        }


# =============================================================================
# 3. QUERY OPTIMIZATION HINTS
# =============================================================================

class QueryOptimizer:
    """
    Query optimizasyon önerileri sağlar.
    
    RİSK:
        - N+1 query problemi
        - SELECT * kullanımı
        - Missing LIMIT
        - Inefficient JOINs
    
    ÖNLEM:
        - Eager loading kullan
        - Sadece gerekli kolonları seç
        - Pagination uygula
        - Proper JOIN stratejisi
    """
    
    OPTIMIZATION_TIPS = {
        'n_plus_one': {
            'problem': 'N+1 query pattern detected',
            'solution': 'Use joinedload() or subqueryload() for relationships',
            'example': '''
# Kötü:
users = User.query.all()
for user in users:
    print(user.posts)  # Her user için ayrı query

# İyi:
from sqlalchemy.orm import joinedload
users = User.query.options(joinedload(User.posts)).all()
'''
        },
        'select_star': {
            'problem': 'SELECT * selects all columns',
            'solution': 'Select only needed columns using load_only()',
            'example': '''
# Kötü:
users = User.query.all()

# İyi:
from sqlalchemy.orm import load_only
users = User.query.options(load_only(User.id, User.name)).all()
'''
        },
        'missing_limit': {
            'problem': 'Query without LIMIT can return too many rows',
            'solution': 'Always use pagination for list queries',
            'example': '''
# Kötü:
users = User.query.filter_by(active=True).all()

# İyi:
users = User.query.filter_by(active=True).limit(100).all()
# veya pagination kullan
'''
        },
        'missing_index': {
            'problem': 'Filtering on non-indexed column',
            'solution': 'Add index to frequently filtered columns',
            'example': '''
# Model'de index ekle:
class User(db.Model):
    email = db.Column(db.String(255), index=True)  # index=True
    
# veya migration ile:
# op.create_index('ix_users_email', 'users', ['email'])
'''
        }
    }
    
    @classmethod
    def get_tip(cls, tip_name: str) -> Optional[Dict[str, str]]:
        """Optimizasyon ipucu döndürür."""
        return cls.OPTIMIZATION_TIPS.get(tip_name)
    
    @classmethod
    def suggest_eager_loading(cls, model: Type) -> List[Dict[str, Any]]:
        """Eager loading önerileri yapar."""
        mapper = inspect(model)
        suggestions = []
        
        for prop in mapper.iterate_properties:
            if isinstance(prop, RelationshipProperty):
                suggestions.append({
                    'relationship': prop.key,
                    'target': prop.mapper.class_.__name__,
                    'suggestion': f'options(joinedload({model.__name__}.{prop.key}))',
                    'use_when': 'Relationship data is always needed with parent'
                })
        
        return suggestions


# =============================================================================
# 4. MIGRATION SAFETY CHECKER
# =============================================================================

class MigrationSafetyChecker:
    """
    Migration'ların güvenliğini kontrol eder.
    
    RİSK:
        - Veri kaybı
        - Uzun süren migration'lar (lock)
        - Production'da sorunlu değişiklikler
    
    ÖNLEM:
        - Breaking change'leri tespit et
        - Rollback planı oluştur
        - Büyük tablolarda batch işlem
    """
    
    DANGEROUS_OPERATIONS = [
        'drop_table',
        'drop_column',
        'alter_column',  # Type değişikliği
        'drop_index',
        'drop_constraint',
    ]
    
    @classmethod
    def analyze_migration_script(cls, script_content: str) -> Dict[str, Any]:
        """Migration script'ini analiz eder."""
        warnings = []
        
        for op in cls.DANGEROUS_OPERATIONS:
            if f'op.{op}' in script_content:
                warnings.append({
                    'operation': op,
                    'message': f'{op} is a potentially dangerous operation',
                    'recommendation': cls._get_recommendation(op)
                })
        
        return {
            'is_safe': len(warnings) == 0,
            'warnings': warnings
        }
    
    @classmethod
    def _get_recommendation(cls, operation: str) -> str:
        """Operasyon için öneri döndürür."""
        recommendations = {
            'drop_table': 'Backup table before dropping. Consider renaming first.',
            'drop_column': 'Backup data before dropping. Deploy in phases.',
            'alter_column': 'Test type conversion. Consider adding new column first.',
            'drop_index': 'Ensure index is not used by queries.',
            'drop_constraint': 'Verify data integrity before removing constraint.',
        }
        return recommendations.get(operation, 'Review carefully before applying.')
    
    @staticmethod
    def estimate_migration_time(table_row_count: int, operation: str) -> Dict[str, Any]:
        """Migration süresini tahmin eder."""
        # Yaklaşık tahminler (gerçek değerler değişebilir)
        estimates = {
            'add_column': 0.001,  # Hızlı - metadata only
            'add_index': 0.01,   # Row sayısına bağlı
            'drop_column': 0.001,
            'alter_column': 0.05,  # Yavaş - data rewrite
        }
        
        base_time = estimates.get(operation, 0.01)
        estimated_seconds = base_time * table_row_count
        
        return {
            'estimated_seconds': estimated_seconds,
            'estimated_minutes': estimated_seconds / 60,
            'warning': estimated_seconds > 60,
            'recommendation': 'Consider batching' if estimated_seconds > 60 else 'Safe to run'
        }


# =============================================================================
# 5. SCHEMA VALIDATOR
# =============================================================================

class SchemaValidator:
    """
    Veritabanı şemasını best practice'lere göre doğrular.
    """
    
    REQUIRED_COLUMNS = ['id', 'created_at']
    RECOMMENDED_COLUMNS = ['updated_at']
    
    @classmethod
    def validate_model(cls, model: Type) -> Dict[str, Any]:
        """Model'i doğrular."""
        mapper = inspect(model)
        table = mapper.mapped_table
        column_names = [c.name for c in table.columns]
        
        issues = []
        warnings = []
        
        # Required column kontrolü
        for col in cls.REQUIRED_COLUMNS:
            if col not in column_names:
                issues.append({
                    'type': 'MISSING_REQUIRED_COLUMN',
                    'column': col,
                    'message': f'{model.__name__} is missing required column: {col}'
                })
        
        # Recommended column kontrolü
        for col in cls.RECOMMENDED_COLUMNS:
            if col not in column_names:
                warnings.append({
                    'type': 'MISSING_RECOMMENDED_COLUMN',
                    'column': col,
                    'message': f'{model.__name__} should have column: {col}'
                })
        
        # Soft delete kontrolü (is_deleted veya deleted_at)
        has_soft_delete = 'is_deleted' in column_names or 'deleted_at' in column_names
        if not has_soft_delete:
            warnings.append({
                'type': 'NO_SOFT_DELETE',
                'message': f'{model.__name__} does not support soft delete'
            })
        
        # Timestamp kontrolü
        for col in ['created_at', 'updated_at']:
            if col in column_names:
                column = table.c[col]
                if column.default is None and column.server_default is None:
                    warnings.append({
                        'type': 'MISSING_DEFAULT',
                        'column': col,
                        'message': f'{col} should have a default value'
                    })
        
        return {
            'model': model.__name__,
            'table': table.name,
            'is_valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings
        }
    
    @classmethod
    def validate_all_models(cls, db) -> List[Dict[str, Any]]:
        """Tüm modelleri doğrular."""
        results = []
        
        for mapper in db.Model.registry.mappers:
            model = mapper.class_
            if hasattr(model, '__tablename__'):
                try:
                    validation = cls.validate_model(model)
                    if validation['issues'] or validation['warnings']:
                        results.append(validation)
                except Exception as e:
                    logger.warning(f'Could not validate {model.__name__}: {e}')
        
        return results


# =============================================================================
# 6. CONNECTION BEST PRACTICES
# =============================================================================

class ConnectionBestPractices:
    """
    Veritabanı bağlantı best practice'leri.
    """
    
    RECOMMENDED_ENGINE_OPTIONS = {
        'pool_pre_ping': True,      # Connection health check
        'pool_recycle': 300,        # Recycle connections every 5 min
        'pool_size': 10,            # Base pool size
        'max_overflow': 20,         # Max extra connections
        'pool_timeout': 30,         # Wait timeout for connection
    }
    
    @classmethod
    def check_engine_config(cls, engine: Engine) -> Dict[str, Any]:
        """Engine konfigürasyonunu kontrol eder."""
        pool = engine.pool
        
        issues = []
        current_config = {}
        
        # Pool configuration check
        if hasattr(pool, '_pool'):
            current_config['pool_size'] = pool.size()
        
        # Recommendation check
        if not getattr(engine, 'pool_pre_ping', False):
            issues.append({
                'setting': 'pool_pre_ping',
                'current': False,
                'recommended': True,
                'reason': 'Prevents stale connection errors'
            })
        
        return {
            'current_config': current_config,
            'issues': issues,
            'recommendations': cls.RECOMMENDED_ENGINE_OPTIONS
        }


# =============================================================================
# 7. DATABASE HEALTH CHECK
# =============================================================================

def database_health_check(db) -> Dict[str, Any]:
    """
    Veritabanı sağlığını kontrol eder.
    """
    issues = []
    warnings = []
    
    try:
        # 1. Connection test
        db.session.execute('SELECT 1')
        connection_ok = True
    except Exception as e:
        connection_ok = False
        issues.append({
            'type': 'CONNECTION_FAILED',
            'message': str(e),
            'severity': 'CRITICAL'
        })
    
    if connection_ok:
        # 2. Schema validation
        schema_results = SchemaValidator.validate_all_models(db)
        for result in schema_results:
            for issue in result.get('issues', []):
                issues.append(issue)
            for warning in result.get('warnings', []):
                warnings.append(warning)
        
        # 3. Index analysis
        index_results = IndexAnalyzer.analyze_all_models(db)
        for result in index_results:
            for missing in result.get('missing_indexes', []):
                warnings.append({
                    'type': 'MISSING_INDEX',
                    'table': result['table_name'],
                    **missing
                })
    
    return {
        'status': 'FAIL' if issues else 'PASS',
        'connection_ok': connection_ok,
        'issues': issues,
        'warnings': warnings,
        'timestamp': datetime.utcnow().isoformat()
    }


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    'IndexAnalyzer',
    'DataIntegrityChecker',
    'QueryOptimizer',
    'MigrationSafetyChecker',
    'SchemaValidator',
    'ConnectionBestPractices',
    'database_health_check',
]
