"""add event recurrence fields

Revision ID: c3e1f9a2b5d7
Revises: 8f0f2ab88f2e
Create Date: 2026-05-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3e1f9a2b5d7'
down_revision: Union[str, None] = '2b37fe434b7c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('recurrence', sa.String(), nullable=True))
    op.add_column('events', sa.Column('recurrence_end_date', sa.Date(), nullable=True))
    op.add_column('events', sa.Column('recurrence_series_id', sa.Integer(), nullable=True))
    op.add_column('events', sa.Column('is_cancelled', sa.Boolean(), nullable=False,
                                      server_default=sa.text('false')))


def downgrade() -> None:
    op.drop_column('events', 'is_cancelled')
    op.drop_column('events', 'recurrence_series_id')
    op.drop_column('events', 'recurrence_end_date')
    op.drop_column('events', 'recurrence')
