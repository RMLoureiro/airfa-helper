"""add indexes on frequently-filtered columns

Revision ID: c9d2e4f6a8b1
Revises: e5f3a7c9d1b2
Create Date: 2026-06-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'c9d2e4f6a8b1'
down_revision: Union[str, None] = 'e5f3a7c9d1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Event.start_time: filtered (>= now) and ordered on the home feed / event lists.
    op.create_index('ix_events_start_time', 'events', ['start_time'])
    # User.deleted_at: soft-delete filter applied on nearly every user query.
    op.create_index('ix_users_deleted_at', 'users', ['deleted_at'])


def downgrade() -> None:
    op.drop_index('ix_users_deleted_at', table_name='users')
    op.drop_index('ix_events_start_time', table_name='events')
