"""agregar accesorios a prestamos y foto_url a usuarios

Revision ID: a3f9c2e81d05
Revises: 1b375a525239
Create Date: 2026-06-22 14:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a3f9c2e81d05'
down_revision = '1b375a525239'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('prestamos', schema=None) as batch_op:
        batch_op.add_column(sa.Column('accesorios', sa.JSON(), nullable=True))

    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.add_column(sa.Column('foto_url', sa.String(length=500), nullable=True))


def downgrade():
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.drop_column('foto_url')

    with op.batch_alter_table('prestamos', schema=None) as batch_op:
        batch_op.drop_column('accesorios')
