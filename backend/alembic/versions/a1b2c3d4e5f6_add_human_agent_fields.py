"""add human agent fields to crm_agents

Revision ID: a1b2c3d4e5f6
Revises: 8e77b8cdd082
Create Date: 2026-06-12 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '8e77b8cdd082'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add agent_type column
    op.add_column('crm_agents', sa.Column('agent_type', sa.String(10), nullable=False, server_default='ai'))
    
    # Add email column
    op.add_column('crm_agents', sa.Column('email', sa.String(255), nullable=True))
    
    # Add availability_status column
    op.add_column('crm_agents', sa.Column('availability_status', sa.String(20), nullable=False, server_default='offline'))
    
    # Add metrics columns
    op.add_column('crm_agents', sa.Column('total_calls_handled', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('crm_agents', sa.Column('total_talk_time_seconds', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('crm_agents', sa.Column('successful_transfers', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('crm_agents', sa.Column('failed_transfers', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('crm_agents', sa.Column('last_active_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('crm_agents', 'last_active_at')
    op.drop_column('crm_agents', 'failed_transfers')
    op.drop_column('crm_agents', 'successful_transfers')
    op.drop_column('crm_agents', 'total_talk_time_seconds')
    op.drop_column('crm_agents', 'total_calls_handled')
    op.drop_column('crm_agents', 'availability_status')
    op.drop_column('crm_agents', 'email')
    op.drop_column('crm_agents', 'agent_type')
