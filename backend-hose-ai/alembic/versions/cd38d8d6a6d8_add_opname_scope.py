"""add_opname_scope

Revision ID: cd38d8d6a6d8
Revises: fcb7d64c519b
Create Date: 2026-02-04 10:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'cd38d8d6a6d8'
down_revision: Union[str, Sequence[str], None] = 'fcb7d64c519b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add scope columns to stock_opnames
    op.add_column('stock_opnames', sa.Column('scope_type', sa.String(length=20), nullable=True))
    op.add_column('stock_opnames', sa.Column('scope_value', sa.String(length=100), nullable=True))
    
    # Set default value for existing rows
    op.execute("UPDATE stock_opnames SET scope_type = 'ALL'")


def downgrade() -> None:
    # Remove scope columns
    op.drop_column('stock_opnames', 'scope_value')
    op.drop_column('stock_opnames', 'scope_type')
