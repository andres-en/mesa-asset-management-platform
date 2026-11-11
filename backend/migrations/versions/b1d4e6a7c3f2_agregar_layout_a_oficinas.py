"""agregar layout (mapa de red) a oficinas

Revision ID: b1d4e6a7c3f2
Revises: f7c3a1e9b2d4
Create Date: 2026-11-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b1d4e6a7c3f2'
down_revision = 'f7c3a1e9b2d4'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('oficinas', schema=None) as batch_op:
        batch_op.add_column(sa.Column('layout', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('oficinas', schema=None) as batch_op:
        batch_op.drop_column('layout')
