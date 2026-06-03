"""add serial_number to instruments

Revision ID: a1b2c3d4e5f6
Revises: d4e2f1a9b8c6
Create Date: 2026-06-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd4e2f1a9b8c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('instruments', sa.Column('serial_number', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('instruments', 'serial_number')
