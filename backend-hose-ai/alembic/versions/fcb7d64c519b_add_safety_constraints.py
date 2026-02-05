"""add_safety_constraints

Revision ID: fcb7d64c519b
Revises: 
Create Date: 2026-02-04 09:59:39.548510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fcb7d64c519b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop Hose Rolls (Cleanup Phase 9)
    # Check if table exists first to avoid errors if already dropped? 
    # Standard alembic just tries.
    op.drop_index(op.f('ix_hose_rolls_brand'), table_name='hose_rolls')
    op.drop_index(op.f('ix_hose_rolls_id'), table_name='hose_rolls')
    op.drop_index(op.f('ix_hose_rolls_roll_id'), table_name='hose_rolls')
    op.drop_table('hose_rolls')

    # 2. Add Safety Gate (Phase 10)
    op.create_check_constraint(
        "check_positive_qty",
        "inventory_batches",
        "current_qty >= 0"
    )


def downgrade() -> None:
    # 1. Remove Safety Gate
    op.drop_constraint("check_positive_qty", "inventory_batches")

    # 2. Restore Hose Rolls
    op.create_table('hose_rolls',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('roll_id', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('brand', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('tipe_hose', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('standard', sa.VARCHAR(length=20), autoincrement=False, nullable=True),
    sa.Column('wire_type', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('size_inch', sa.VARCHAR(length=20), autoincrement=False, nullable=True),
    sa.Column('size_dn', sa.VARCHAR(length=20), autoincrement=False, nullable=True),
    sa.Column('hose_od_mm', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('hose_id_mm', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('working_pressure_bar', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('working_pressure_psi', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('burst_pressure_bar', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('burst_pressure_psi', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('temperature_range', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('bend_radius_mm', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('length_meter', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=False),
    sa.Column('quantity', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('location', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('status', sa.VARCHAR(length=20), autoincrement=False, nullable=True),
    sa.Column('remaining_length', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
    sa.Column('source', sa.VARCHAR(length=20), autoincrement=False, nullable=True),
    sa.Column('confidence', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('notes', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('created_by', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('updated_by', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('is_deleted', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('hose_rolls_pkey'))
    )
    op.create_index(op.f('ix_hose_rolls_roll_id'), 'hose_rolls', ['roll_id'], unique=True)
    op.create_index(op.f('ix_hose_rolls_id'), 'hose_rolls', ['id'], unique=False)
    op.create_index(op.f('ix_hose_rolls_brand'), 'hose_rolls', ['brand'], unique=False)
