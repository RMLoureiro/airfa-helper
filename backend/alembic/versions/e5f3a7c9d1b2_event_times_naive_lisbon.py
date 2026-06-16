"""store event times as naive Lisbon wall-clock (drop timezone)

Converts events.start_time / end_time from timestamptz (UTC) to a naive
timestamp holding the local Portugal wall-clock time, so the app stores and
shows exactly the hour the user picked — no timezone conversion.

Revision ID: e5f3a7c9d1b2
Revises: b7c8d9e0f1a2
Create Date: 2026-06-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f3a7c9d1b2'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # timestamptz (stored as UTC) → naive timestamp with the Lisbon wall-clock value
    op.alter_column(
        'events', 'start_time',
        type_=sa.DateTime(timezone=False),
        existing_nullable=False,
        postgresql_using="start_time AT TIME ZONE 'Europe/Lisbon'",
    )
    op.alter_column(
        'events', 'end_time',
        type_=sa.DateTime(timezone=False),
        existing_nullable=False,
        postgresql_using="end_time AT TIME ZONE 'Europe/Lisbon'",
    )


def downgrade() -> None:
    # naive Lisbon wall-clock → timestamptz (interpret value as Lisbon local time)
    op.alter_column(
        'events', 'start_time',
        type_=sa.DateTime(timezone=True),
        existing_nullable=False,
        postgresql_using="start_time AT TIME ZONE 'Europe/Lisbon'",
    )
    op.alter_column(
        'events', 'end_time',
        type_=sa.DateTime(timezone=True),
        existing_nullable=False,
        postgresql_using="end_time AT TIME ZONE 'Europe/Lisbon'",
    )
