"""add social links to newsletter

Revision ID: d1f4b6a8c2e0
Revises: c9d2e4f6a8b1
Create Date: 2026-06-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd1f4b6a8c2e0'
down_revision: Union[str, None] = 'c9d2e4f6a8b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('newsletter', sa.Column('facebook_link', sa.String(), nullable=True))
    op.add_column('newsletter', sa.Column('instagram_link', sa.String(), nullable=True))
    op.add_column('newsletter', sa.Column('youtube_link', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('newsletter', 'youtube_link')
    op.drop_column('newsletter', 'instagram_link')
    op.drop_column('newsletter', 'facebook_link')
