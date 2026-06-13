"""platform_v2_fresh_schema

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-13 10:00:00.000000

Drop all v1 tables and create the new multi-tenant platform schema.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ========================================
    # DROP ALL V1 TABLES (reverse dependency order)
    # ========================================
    op.execute("DROP TABLE IF EXISTS campaign_contacts CASCADE")
    op.execute("DROP TABLE IF EXISTS call_events CASCADE")
    op.execute("DROP TABLE IF EXISTS calls CASCADE")
    op.execute("DROP TABLE IF EXISTS notes CASCADE")
    op.execute("DROP TABLE IF EXISTS activities CASCADE")
    op.execute("DROP TABLE IF EXISTS deals CASCADE")
    op.execute("DROP TABLE IF EXISTS pipeline_stages CASCADE")
    op.execute("DROP TABLE IF EXISTS pipelines CASCADE")
    op.execute("DROP TABLE IF EXISTS crm_agents CASCADE")
    op.execute("DROP TABLE IF EXISTS campaigns CASCADE")
    op.execute("DROP TABLE IF EXISTS contacts CASCADE")
    op.execute("DROP TABLE IF EXISTS workspace_invitations CASCADE")
    op.execute("DROP TABLE IF EXISTS refresh_tokens CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
    op.execute("DROP TABLE IF EXISTS workspaces CASCADE")

    # ========================================
    # CREATE V2 TABLES
    # ========================================

    # 1. super_admins
    op.create_table('super_admins',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_super_admins_email', 'super_admins', ['email'])

    # 2. tenants
    op.create_table('tenants',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('plan', sa.String(50), nullable=False, server_default='starter'),
        sa.Column('voip_provider', sa.String(50), nullable=True),
        sa.Column('voip_config', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('dialog_base_url', sa.String(512), nullable=True),
        sa.Column('dialog_api_key', sa.String(512), nullable=True),
        sa.Column('dialog_webhook_registered', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('billing_email', sa.String(255), nullable=True),
        sa.Column('billing_cycle_day', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('max_agents', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('max_campaigns', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('created_by_super_admin_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
        sa.ForeignKeyConstraint(['created_by_super_admin_id'], ['super_admins.id'], ondelete='SET NULL')
    )
    op.create_index('ix_tenants_slug', 'tenants', ['slug'])

    # 3. tenant_settings
    op.create_table('tenant_settings',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('key', sa.String(255), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE')
    )
    op.create_index('ix_tenant_settings_tenant_id', 'tenant_settings', ['tenant_id'])

    # 4. users
    op.create_table('users',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('skills', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('max_concurrent_calls', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('availability_status', sa.String(20), nullable=False, server_default='offline'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('tenant_id', 'email', name='uq_user_tenant_email')
    )
    op.create_index('ix_users_tenant_id', 'users', ['tenant_id'])

    # 5. refresh_tokens
    op.create_table('refresh_tokens',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.Uuid(), nullable=True),
        sa.Column('super_admin_id', sa.Uuid(), nullable=True),
        sa.Column('token', sa.String(512), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['super_admin_id'], ['super_admins.id'], ondelete='CASCADE')
    )
    op.create_index('ix_refresh_tokens_token', 'refresh_tokens', ['token'])

    # 6. scripts
    op.create_table('scripts',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('type', sa.String(50), nullable=False, server_default='sales'),
        sa.Column('language', sa.String(50), nullable=False, server_default='english'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE')
    )
    op.create_index('ix_scripts_tenant_id', 'scripts', ['tenant_id'])

    # 7. script_steps
    op.create_table('script_steps',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('script_id', sa.Uuid(), nullable=False),
        sa.Column('step_number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('question', sa.Text(), nullable=True),
        sa.Column('expected_responses', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['script_id'], ['scripts.id'], ondelete='CASCADE')
    )
    op.create_index('ix_script_steps_script_id', 'script_steps', ['script_id'])

    # 8. campaigns
    op.create_table('campaigns',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('phone_number', sa.String(50), nullable=True),
        sa.Column('script_id', sa.Uuid(), nullable=True),
        sa.Column('language', sa.String(50), nullable=False, server_default='english'),
        sa.Column('routing_type', sa.String(50), nullable=False, server_default='round_robin'),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('timezone', sa.String(100), nullable=False, server_default='Asia/Kolkata'),
        sa.Column('max_concurrent_calls', sa.Integer(), nullable=False, server_default='2'),
        sa.Column('total_contacts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_calls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_answered', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_converted', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['script_id'], ['scripts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('ix_campaigns_tenant_id', 'campaigns', ['tenant_id'])

    # 9. campaign_agents
    op.create_table('campaign_agents',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('campaign_id', sa.Uuid(), nullable=False),
        sa.Column('agent_id', sa.Uuid(), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['agent_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('campaign_id', 'agent_id', name='uq_campaign_agent')
    )
    op.create_index('ix_campaign_agents_campaign_id', 'campaign_agents', ['campaign_id'])
    op.create_index('ix_campaign_agents_agent_id', 'campaign_agents', ['agent_id'])

    # 10. customers
    op.create_table('customers',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('company', sa.String(255), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('source', sa.String(50), nullable=False, server_default='manual'),
        sa.Column('source_campaign_id', sa.Uuid(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='new'),
        sa.Column('custom_fields', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('tags', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('total_calls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_called_at', sa.DateTime(), nullable=True),
        sa.Column('last_disposition', sa.String(100), nullable=True),
        sa.Column('assigned_to_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_campaign_id'], ['campaigns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('ix_customers_tenant_id', 'customers', ['tenant_id'])
    op.create_index('idx_customers_tenant_status', 'customers', ['tenant_id', 'status'])
    op.create_index('idx_customers_tenant_phone', 'customers', ['tenant_id', 'phone'])

    # 11. customer_notes
    op.create_table('customer_notes',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('customer_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('ix_customer_notes_customer_id', 'customer_notes', ['customer_id'])

    # 12. disposition_templates
    op.create_table('disposition_templates',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE')
    )
    op.create_index('ix_disposition_templates_tenant_id', 'disposition_templates', ['tenant_id'])

    # 13. call_logs (CDR)
    op.create_table('call_logs',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('campaign_id', sa.Uuid(), nullable=True),
        sa.Column('agent_id', sa.Uuid(), nullable=True),
        sa.Column('customer_id', sa.Uuid(), nullable=True),
        sa.Column('direction', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='initiated'),
        sa.Column('phone_from', sa.String(50), nullable=True),
        sa.Column('phone_to', sa.String(50), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('recording_url', sa.String(1024), nullable=True),
        sa.Column('disposition_id', sa.Uuid(), nullable=True),
        sa.Column('disposition_notes', sa.Text(), nullable=True),
        sa.Column('voip_call_sid', sa.String(255), nullable=True),
        sa.Column('voip_provider', sa.String(50), nullable=True),
        sa.Column('ai_transcript', sa.Text(), nullable=True),
        sa.Column('ai_summary', sa.Text(), nullable=True),
        sa.Column('ai_sentiment', sa.String(20), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('answered_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['agent_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['disposition_id'], ['disposition_templates.id'], ondelete='SET NULL')
    )
    op.create_index('ix_call_logs_tenant_id', 'call_logs', ['tenant_id'])
    op.create_index('ix_call_logs_campaign_id', 'call_logs', ['campaign_id'])
    op.create_index('ix_call_logs_agent_id', 'call_logs', ['agent_id'])
    op.create_index('ix_call_logs_customer_id', 'call_logs', ['customer_id'])
    op.create_index('idx_call_logs_tenant_campaign', 'call_logs', ['tenant_id', 'campaign_id'])
    op.create_index('idx_call_logs_tenant_agent', 'call_logs', ['tenant_id', 'agent_id'])
    op.create_index('idx_call_logs_tenant_date', 'call_logs', ['tenant_id', 'created_at'])

    # 14. callbacks
    op.create_table('callbacks',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('customer_id', sa.Uuid(), nullable=False),
        sa.Column('agent_id', sa.Uuid(), nullable=True),
        sa.Column('campaign_id', sa.Uuid(), nullable=True),
        sa.Column('callback_time', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='scheduled'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['agent_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('ix_callbacks_tenant_id', 'callbacks', ['tenant_id'])
    op.create_index('ix_callbacks_customer_id', 'callbacks', ['customer_id'])


def downgrade() -> None:
    op.drop_table('callbacks')
    op.drop_table('call_logs')
    op.drop_table('disposition_templates')
    op.drop_table('customer_notes')
    op.drop_table('customers')
    op.drop_table('campaign_agents')
    op.drop_table('campaigns')
    op.drop_table('script_steps')
    op.drop_table('scripts')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
    op.drop_table('tenant_settings')
    op.drop_table('tenants')
    op.drop_table('super_admins')
