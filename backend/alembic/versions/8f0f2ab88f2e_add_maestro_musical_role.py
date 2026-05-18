"""add maestro musical role

Revision ID: 8f0f2ab88f2e
Revises: 1ab8dd1f30b8
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '8f0f2ab88f2e'
down_revision: Union[str, None] = '1ab8dd1f30b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE musicalrole ADD VALUE IF NOT EXISTS 'MAESTRO'")


def downgrade() -> None:
    # PostgreSQL does not support dropping a single enum value directly.
    # Keeping downgrade as no-op to avoid unsafe enum recreation.
    pass
