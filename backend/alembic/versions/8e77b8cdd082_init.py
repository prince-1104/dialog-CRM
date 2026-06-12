"""init

Revision ID: 8e77b8cdd082
Revises: 
Create Date: 2026-06-08 10:50:34.997507

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e77b8cdd082'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. workspaces
    op.create_table(
        'workspaces',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('plan', sa.String(length=50), nullable=False, server_default='free'),
        sa.Column('dialog_base_url', sa.String(length=512), nullable=True),
        sa.Column('dialog_api_key', sa.String(length=512), nullable=True),
        sa.Column('dialog_webhook_secret', sa.String(length=512), nullable=True),
        sa.Column('dialog_webhook_registered', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index('idx_workspaces_slug', 'workspaces', ['slug'], unique=True)

    # 2. users
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='agent'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'email', name='uq_user_workspace_email')
    )
    op.create_index('idx_users_workspace_email', 'users', ['workspace_id', 'email'])

    # 3. refresh_tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash')
    )
    op.create_index('idx_refresh_tokens_hash', 'refresh_tokens', ['token_hash'], unique=True)

    # 4. workspace_invitations
    op.create_table(
        'workspace_invitations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False),
        sa.Column('invited_by_id', sa.UUID(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    op.create_index('idx_invitations_token', 'workspace_invitations', ['token'], unique=True)

    # 5. pipelines
    op.create_table(
        'pipelines',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_pipelines_workspace', 'pipelines', ['workspace_id'])

    # 6. pipeline_stages
    op.create_table(
        'pipeline_stages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('pipeline_id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('color', sa.String(length=50), nullable=False, server_default='#6366f1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_stages_pipeline', 'pipeline_stages', ['pipeline_id'])
    op.create_index('idx_stages_workspace', 'pipeline_stages', ['workspace_id'])

    # 7. contacts
    op.create_table(
        'contacts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('first_name', sa.String(length=255), nullable=False),
        sa.Column('last_name', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('designation', sa.String(length=255), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=False, server_default='manual'),
        sa.Column('tags', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('custom_fields', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('lead_score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='new'),
        sa.Column('assigned_to_id', sa.UUID(), nullable=True),
        sa.Column('pipeline_id', sa.UUID(), nullable=True),
        sa.Column('pipeline_stage_id', sa.UUID(), nullable=True),
        sa.Column('last_called_at', sa.DateTime(), nullable=True),
        sa.Column('last_call_outcome', sa.String(length=50), nullable=True),
        sa.Column('call_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('notes_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['pipeline_stage_id'], ['pipeline_stages.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_contacts_workspace_status', 'contacts', ['workspace_id', 'status'])
    op.create_index('idx_contacts_workspace_stage', 'contacts', ['workspace_id', 'pipeline_stage_id'])

    # 8. deals
    op.create_table(
        'deals',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('contact_id', sa.UUID(), nullable=False),
        sa.Column('pipeline_id', sa.UUID(), nullable=False),
        sa.Column('stage_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('value', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('probability', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('expected_close_date', sa.Date(), nullable=True),
        sa.Column('assigned_to_id', sa.UUID(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='open'),
        sa.Column('lost_reason', sa.String(length=1024), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['stage_id'], ['pipeline_stages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_deals_workspace_status', 'deals', ['workspace_id', 'status'])

    # 9. campaigns
    op.create_table(
        'campaigns',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=1024), nullable=True),
        sa.Column('dialog_campaign_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('total_contacts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stat_called', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stat_answered', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stat_interested', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stat_not_interested', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stat_transferred', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stat_no_answer', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('timezone', sa.String(length=100), nullable=False, server_default='Asia/Kolkata'),
        sa.Column('max_concurrent_calls', sa.Integer(), nullable=False, server_default='2'),
        sa.Column('created_by_id', sa.UUID(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_campaigns_workspace', 'campaigns', ['workspace_id'])

    # 10. crm_agents
    op.create_table(
        'crm_agents',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('dialog_crm_agent_id', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('specialization', sa.String(length=255), nullable=True),
        sa.Column('intents', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('max_concurrent_calls', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('is_available', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('dialog_synced', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'dialog_crm_agent_id', name='uq_crm_agent_workspace_dialog_id')
    )
    op.create_index('idx_crm_agents_workspace', 'crm_agents', ['workspace_id'])

    # 11. calls
    op.create_table(
        'calls',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('contact_id', sa.UUID(), nullable=True),
        sa.Column('campaign_id', sa.UUID(), nullable=True),
        sa.Column('dialog_call_id', sa.Integer(), nullable=False),
        sa.Column('dialog_call_sid', sa.String(length=255), nullable=True),
        sa.Column('initiated_by_id', sa.UUID(), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('direction', sa.String(length=50), nullable=False, server_default='outbound'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='initiating'),
        sa.Column('outcome', sa.String(length=50), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('detected_intent', sa.String(length=100), nullable=True),
        sa.Column('intent_confidence', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('was_transferred', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('transferred_to_agent_id', sa.UUID(), nullable=True),
        sa.Column('transfer_reason', sa.String(length=1024), nullable=True),
        sa.Column('transcript', sa.Text(), nullable=True),
        sa.Column('ai_summary', sa.Text(), nullable=True),
        sa.Column('live_transcript', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('estimated_cost_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('billed_cost_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('dialog_stream_url', sa.String(length=512), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('call_transfer_type', sa.String(length=50), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['initiated_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['transferred_to_agent_id'], ['crm_agents.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('dialog_call_id')
    )
    op.create_index('idx_calls_workspace_contact', 'calls', ['workspace_id', 'contact_id'])
    op.create_index('idx_calls_workspace_campaign', 'calls', ['workspace_id', 'campaign_id'])
    op.create_index('idx_calls_workspace_status', 'calls', ['workspace_id', 'status'])
    op.create_index('idx_calls_dialog_call_id', 'calls', ['dialog_call_id'], unique=True)

    # 12. campaign_contacts
    op.create_table(
        'campaign_contacts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('campaign_id', sa.UUID(), nullable=False),
        sa.Column('contact_id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('call_id', sa.UUID(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['call_id'], ['calls.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('campaign_id', 'contact_id', name='uq_campaign_contact')
    )
    op.create_index('idx_campaign_contacts_campaign', 'campaign_contacts', ['campaign_id'])
    op.create_index('idx_campaign_contacts_workspace', 'campaign_contacts', ['workspace_id'])

    # 13. call_events
    op.create_table(
        'call_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('call_id', sa.UUID(), nullable=False),
        sa.Column('dialog_delivery_id', sa.String(length=255), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('event_data', sa.JSON(), nullable=False),
        sa.Column('processed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['call_id'], ['calls.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('dialog_delivery_id')
    )
    op.create_index('idx_call_events_delivery_id', 'call_events', ['dialog_delivery_id'], unique=True)

    # 14. activities
    op.create_table(
        'activities',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('contact_id', sa.UUID(), nullable=True),
        sa.Column('deal_id', sa.UUID(), nullable=True),
        sa.Column('call_id', sa.UUID(), nullable=True),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['deal_id'], ['deals.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['call_id'], ['calls.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_activities_workspace_contact', 'activities', ['workspace_id', 'contact_id'])
    op.create_index('idx_activities_workspace_created_at', 'activities', ['workspace_id', 'created_at'])

    # 15. notes
    op.create_table(
        'notes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('contact_id', sa.UUID(), nullable=True),
        sa.Column('deal_id', sa.UUID(), nullable=True),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['deal_id'], ['deals.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_notes_workspace', 'notes', ['workspace_id'])


def downgrade() -> None:
    op.drop_table('notes')
    op.drop_table('activities')
    op.drop_table('call_events')
    op.drop_table('campaign_contacts')
    op.drop_table('calls')
    op.drop_table('crm_agents')
    op.drop_table('campaigns')
    op.drop_table('deals')
    op.drop_table('contacts')
    op.drop_table('pipeline_stages')
    op.drop_table('pipelines')
    op.drop_table('workspace_invitations')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
    op.drop_table('workspaces')
