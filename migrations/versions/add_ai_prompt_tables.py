"""Add AI prompt templates and usage summary tables

Revision ID: add_ai_prompt_tables
Revises: add_ai_tables
Create Date: 2025-01-18

AI prompt versiyonlama ve kullanım özeti için tablolar.
KVKK uyumlu veri saklama politikaları desteği.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_ai_prompt_tables'
down_revision = 'add_ai_tables'
branch_labels = None
depends_on = None


def upgrade():
    """
    Yeni tabloları oluştur.
    
    Tablolar:
    - ai_prompt_templates: Prompt şablonları ve versiyonlama
    - ai_prompt_usage_logs: Prompt kullanım detayları
    - ai_usage_summaries: Günlük/aylık kullanım özetleri
    - ai_data_retention_policies: KVKK veri saklama politikaları
    """
    
    # =============================================
    # ai_prompt_templates - Prompt şablonları
    # =============================================
    op.create_table(
        'ai_prompt_templates',
        # Primary key
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        
        # Tanımlayıcı bilgiler
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('version', sa.String(20), nullable=False, server_default='1.0.0'),
        sa.Column('feature', sa.String(50), nullable=False),  # question_hint, topic_explanation, etc.
        
        # Prompt içeriği
        sa.Column('system_prompt', sa.Text(), nullable=False),
        sa.Column('user_prompt_template', sa.Text(), nullable=False),
        
        # Değişkenler (JSON array)
        sa.Column('required_variables', sa.JSON(), server_default='[]'),
        sa.Column('optional_variables', sa.JSON(), server_default='[]'),
        
        # Model ayarları
        sa.Column('model_name', sa.String(50), server_default='gpt-4o-mini'),
        sa.Column('max_tokens', sa.Integer(), server_default='500'),
        sa.Column('temperature', sa.Float(), server_default='0.7'),
        
        # Durum ve erişim
        sa.Column('status', sa.String(20), server_default='draft'),  # draft, active, testing, deprecated, archived
        sa.Column('roles_allowed', sa.JSON(), server_default='[]'),  # ['student', 'teacher', 'admin']
        sa.Column('is_default', sa.Boolean(), server_default='false'),
        
        # A/B Testing
        sa.Column('ab_test_group', sa.String(20), nullable=True),  # 'A', 'B', 'C' veya None
        sa.Column('ab_test_weight', sa.Float(), server_default='1.0'),
        
        # Performans metrikleri (cache)
        sa.Column('usage_count', sa.Integer(), server_default='0'),
        sa.Column('avg_tokens_used', sa.Float(), server_default='0'),
        sa.Column('avg_response_time_ms', sa.Float(), server_default='0'),
        sa.Column('avg_feedback_rating', sa.Float(), server_default='0'),
        sa.Column('success_rate', sa.Float(), server_default='0'),
        
        # Açıklama ve notlar
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('changelog', sa.Text(), nullable=True),
        
        # Hash (değişiklik kontrolü)
        sa.Column('content_hash', sa.String(64), nullable=True),
        
        # Audit (foreign keys)
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        # Constraints
        sa.UniqueConstraint('name', 'version', name='uq_prompt_name_version'),
    )
    
    # Indexes - Sorgu performansı için kritik
    op.create_index('ix_prompt_templates_name', 'ai_prompt_templates', ['name'])
    op.create_index('ix_prompt_templates_feature', 'ai_prompt_templates', ['feature'])
    op.create_index('ix_prompt_templates_status', 'ai_prompt_templates', ['status'])
    op.create_index('ix_prompt_templates_created_at', 'ai_prompt_templates', ['created_at'])
    op.create_index('ix_prompt_feature_status', 'ai_prompt_templates', ['feature', 'status'])
    
    # =============================================
    # ai_prompt_usage_logs - Prompt kullanım logları
    # =============================================
    op.create_table(
        'ai_prompt_usage_logs',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        
        # İlişkiler (foreign keys)
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('ai_prompt_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('ai_chat_sessions.id', ondelete='SET NULL'), nullable=True),
        
        # Kullanım detayları
        sa.Column('variables_used', sa.JSON(), nullable=True),  # PII olmadan
        
        # Performans
        sa.Column('tokens_input', sa.Integer(), server_default='0'),
        sa.Column('tokens_output', sa.Integer(), server_default='0'),
        sa.Column('response_time_ms', sa.Integer(), server_default='0'),
        
        # Sonuç
        sa.Column('success', sa.Boolean(), server_default='true'),
        sa.Column('error_type', sa.String(50), nullable=True),
        sa.Column('error_message', sa.String(500), nullable=True),
        
        # Feedback
        sa.Column('feedback_rating', sa.Integer(), nullable=True),  # 1-5
        sa.Column('feedback_helpful', sa.Boolean(), nullable=True),
        
        # A/B Test
        sa.Column('ab_test_group', sa.String(20), nullable=True),
        
        # Zaman
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    
    # Indexes - Analiz sorguları için
    op.create_index('ix_prompt_usage_logs_template_id', 'ai_prompt_usage_logs', ['template_id'])
    op.create_index('ix_prompt_usage_logs_user_id', 'ai_prompt_usage_logs', ['user_id'])
    op.create_index('ix_prompt_usage_logs_created_at', 'ai_prompt_usage_logs', ['created_at'])
    # Composite index - Zaman aralığı sorguları için
    op.create_index('ix_prompt_usage_logs_template_created', 'ai_prompt_usage_logs', ['template_id', 'created_at'])
    
    # =============================================
    # ai_usage_summaries - Kullanım özetleri
    # =============================================
    op.create_table(
        'ai_usage_summaries',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        
        # Kullanıcı (None = sistem geneli)
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        
        # Dönem
        sa.Column('period_type', sa.String(10), nullable=False),  # 'daily', 'monthly', 'yearly'
        sa.Column('period_date', sa.Date(), nullable=False),  # Dönemin başlangıç tarihi
        
        # Kullanım metrikleri
        sa.Column('total_requests', sa.Integer(), server_default='0'),
        sa.Column('successful_requests', sa.Integer(), server_default='0'),
        sa.Column('failed_requests', sa.Integer(), server_default='0'),
        
        # Token kullanımı (BigInteger - büyük sayılar için)
        sa.Column('total_tokens_input', sa.BigInteger(), server_default='0'),
        sa.Column('total_tokens_output', sa.BigInteger(), server_default='0'),
        
        # Maliyet (USD - 6 decimal precision)
        sa.Column('estimated_cost', sa.Numeric(10, 6), server_default='0'),
        
        # Performans
        sa.Column('avg_response_time_ms', sa.Float(), server_default='0'),
        sa.Column('max_response_time_ms', sa.Integer(), server_default='0'),
        
        # Feature ve model breakdown (JSON)
        sa.Column('feature_breakdown', sa.JSON(), server_default='{}'),
        sa.Column('model_breakdown', sa.JSON(), server_default='{}'),
        
        # Feedback
        sa.Column('avg_feedback_rating', sa.Float(), server_default='0'),
        sa.Column('feedback_count', sa.Integer(), server_default='0'),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        # Unique constraint - Aynı kullanıcı/dönem kombinasyonu tekrar edilemez
        sa.UniqueConstraint('user_id', 'period_type', 'period_date', name='uq_usage_summary'),
    )
    
    # Indexes
    op.create_index('ix_usage_summaries_user_id', 'ai_usage_summaries', ['user_id'])
    op.create_index('ix_usage_summary_period', 'ai_usage_summaries', ['period_type', 'period_date'])
    # Composite - Dashboard sorguları için
    op.create_index('ix_usage_summary_user_period', 'ai_usage_summaries', ['user_id', 'period_type', 'period_date'])
    
    # =============================================
    # ai_data_retention_policies - KVKK politikaları
    # =============================================
    op.create_table(
        'ai_data_retention_policies',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        
        # Politika adı
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        
        # Hedef tablo/veri türü
        sa.Column('target_table', sa.String(100), nullable=False),
        
        # Saklama süreleri (gün)
        sa.Column('retention_days', sa.Integer(), nullable=False),
        sa.Column('anonymization_days', sa.Integer(), nullable=True),
        sa.Column('deletion_days', sa.Integer(), nullable=True),
        
        # İşlem türü
        sa.Column('action', sa.String(50), nullable=False),  # anonymize, delete, archive
        
        # Yasal dayanak
        sa.Column('legal_basis', sa.String(100), nullable=True),
        
        # Aktif mi
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        
        # Zamanlama
        sa.Column('run_schedule', sa.String(50), server_default='daily'),
        sa.Column('last_run_at', sa.DateTime(), nullable=True),
        sa.Column('next_run_at', sa.DateTime(), nullable=True),
        
        # Notlar
        sa.Column('description', sa.Text(), nullable=True),
        
        # Audit
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Index
    op.create_index('ix_retention_policies_target', 'ai_data_retention_policies', ['target_table'])
    
    # =============================================
    # Varsayılan verileri ekle
    # =============================================
    
    # Varsayılan KVKK politikaları
    op.execute("""
        INSERT INTO ai_data_retention_policies (name, target_table, retention_days, anonymization_days, deletion_days, action, legal_basis, description)
        VALUES 
        ('chat_sessions_anonymization', 'ai_chat_sessions', 90, 90, 180, 'anonymize', 
         'KVKK Madde 7 - Kişisel verilerin silinmesi', 
         'Chat oturumları 90 gün sonra anonimleştirilir, 180 gün sonra silinir.'),
        ('usage_logs_retention', 'ai_usage_logs', 365, NULL, 365, 'delete', 
         'KVKK Madde 4 - İşleme amacıyla bağlantılı ve sınırlı olma', 
         'Kullanım logları 1 yıl sonra silinir.'),
        ('prompt_usage_logs_aggregation', 'ai_prompt_usage_logs', 30, NULL, NULL, 'aggregate', 
         'KVKK Madde 28 - İstatistik amacıyla işleme', 
         'Prompt kullanım logları 30 gün sonra aggregate edilir.')
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Varsayılan prompt şablonları
    op.execute("""
        INSERT INTO ai_prompt_templates (name, version, feature, system_prompt, user_prompt_template, status, roles_allowed, is_default, required_variables, description)
        VALUES 
        ('question_hint_v1', '1.0.0', 'question_hint', 
         'Sen bir eğitim asistanısın. Öğrencilere soruları çözmeleri için ipuçları ver. Cevabı direkt verme, düşünmeye teşvik et.',
         'Aşağıdaki soru için bir ipucu ver:\\n\\nSoru: {question_text}\\nKonu: {topic}\\nZorluk: {difficulty}',
         'active', '["student"]', true, '["question_text"]',
         'Soru çözümü için ipucu veren prompt'),
        ('topic_explanation_v1', '1.0.0', 'topic_explanation',
         'Sen bir eğitim asistanısın. Konuları öğrenci seviyesine uygun şekilde açıkla. Örnekler kullan.',
         'Aşağıdaki konuyu açıkla:\\n\\nKonu: {topic}\\nSeviye: {level}',
         'active', '["student", "teacher"]', true, '["topic"]',
         'Konu açıklaması için prompt'),
        ('feedback_generator_v1', '1.0.0', 'feedback_generator',
         'Sen bir öğretmensin. Öğrencinin performansı hakkında yapıcı geri bildirim ver.',
         'Öğrenci performans özeti:\\n\\nDoğru: {correct_count}\\nYanlış: {wrong_count}\\nKonu: {topic}\\n\\nYapıcı geri bildirim ver.',
         'active', '["teacher", "admin"]', true, '["correct_count", "wrong_count"]',
         'Performans geri bildirimi için prompt')
        ON CONFLICT (name, version) DO NOTHING;
    """)


def downgrade():
    """Tabloları kaldır."""
    
    # Indexes
    op.drop_index('ix_retention_policies_target', table_name='ai_data_retention_policies')
    op.drop_index('ix_usage_summary_user_period', table_name='ai_usage_summaries')
    op.drop_index('ix_usage_summary_period', table_name='ai_usage_summaries')
    op.drop_index('ix_usage_summaries_user_id', table_name='ai_usage_summaries')
    op.drop_index('ix_prompt_usage_logs_template_created', table_name='ai_prompt_usage_logs')
    op.drop_index('ix_prompt_usage_logs_created_at', table_name='ai_prompt_usage_logs')
    op.drop_index('ix_prompt_usage_logs_user_id', table_name='ai_prompt_usage_logs')
    op.drop_index('ix_prompt_usage_logs_template_id', table_name='ai_prompt_usage_logs')
    op.drop_index('ix_prompt_feature_status', table_name='ai_prompt_templates')
    op.drop_index('ix_prompt_templates_created_at', table_name='ai_prompt_templates')
    op.drop_index('ix_prompt_templates_status', table_name='ai_prompt_templates')
    op.drop_index('ix_prompt_templates_feature', table_name='ai_prompt_templates')
    op.drop_index('ix_prompt_templates_name', table_name='ai_prompt_templates')
    
    # Tables
    op.drop_table('ai_data_retention_policies')
    op.drop_table('ai_usage_summaries')
    op.drop_table('ai_prompt_usage_logs')
    op.drop_table('ai_prompt_templates')
