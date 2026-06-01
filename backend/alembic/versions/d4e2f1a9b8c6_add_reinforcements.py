"""add reinforcements tables

Revision ID: d4e2f1a9b8c6
Revises: c3e1f9a2b5d7
Create Date: 2026-06-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e2f1a9b8c6'
down_revision: Union[str, None] = 'c3e1f9a2b5d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'reinforcements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('instrument', sa.String(), nullable=True),
        sa.Column('contact', sa.String(), nullable=True),
        sa.Column('usual_fee', sa.Numeric(10, 2), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_reinforcements_id'), 'reinforcements', ['id'], unique=False)

    op.create_table(
        'event_reinforcements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('reinforcement_id', sa.Integer(), nullable=False),
        sa.Column('fee', sa.Numeric(10, 2), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reinforcement_id'], ['reinforcements.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', 'reinforcement_id', name='uq_event_reinforcement'),
    )
    op.create_index(op.f('ix_event_reinforcements_id'), 'event_reinforcements', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_event_reinforcements_id'), table_name='event_reinforcements')
    op.drop_table('event_reinforcements')
    op.drop_index(op.f('ix_reinforcements_id'), table_name='reinforcements')
    op.drop_table('reinforcements')
