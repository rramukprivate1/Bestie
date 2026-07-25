"""fix emotion_logs primary key to be composite (user_id, message_id)

Revision ID: ee80c628bf20
Revises: 243eb50cde92
Create Date: 2026-07-18 07:37:12.883718

Written by hand, not autogenerate: Alembic's autogenerate doesn't
reliably detect primary-key-only changes on existing columns (it
produced an empty migration here), and changing a composite primary key
in place is fragile enough, across both SQLite and Postgres, that a
clean drop-and-recreate is the safer choice - especially since this
table only ever held "nice-to-have" emotion tags, never your actual
conversation (that's in Firestore, untouched by this).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'ee80c628bf20'
down_revision: Union[str, Sequence[str], None] = '243eb50cde92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('emotion_logs')
    op.create_table(
        'emotion_logs',
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('message_id', sa.String(), nullable=False),
        sa.Column('emotion', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('user_id', 'message_id'),
    )
    op.create_index(op.f('ix_emotion_logs_user_id'), 'emotion_logs', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_emotion_logs_user_id'), table_name='emotion_logs')
    op.drop_table('emotion_logs')
    op.create_table(
        'emotion_logs',
        sa.Column('message_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('emotion', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('message_id'),
    )
    op.create_index(op.f('ix_emotion_logs_user_id'), 'emotion_logs', ['user_id'], unique=False)
