"""agregar oficinas y datos de red a equipos

Revision ID: f7c3a1e9b2d4
Revises: a3f9c2e81d05
Create Date: 2026-11-09 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f7c3a1e9b2d4'
down_revision = 'a3f9c2e81d05'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'oficinas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('direccion', sa.String(length=255), nullable=True),
        sa.Column('ciudad', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('oficinas', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_oficinas_nombre'), ['nombre'], unique=True)

    with op.batch_alter_table('equipos', schema=None) as batch_op:
        batch_op.add_column(sa.Column('oficina_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('hostname', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('ip', sa.String(length=45), nullable=True))
        batch_op.add_column(sa.Column('vlan', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('mac_address', sa.String(length=17), nullable=True))
        batch_op.create_index(batch_op.f('ix_equipos_oficina_id'), ['oficina_id'], unique=False)
        batch_op.create_foreign_key('fk_equipos_oficina_id', 'oficinas', ['oficina_id'], ['id'])


def downgrade():
    with op.batch_alter_table('equipos', schema=None) as batch_op:
        batch_op.drop_constraint('fk_equipos_oficina_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_equipos_oficina_id'))
        batch_op.drop_column('mac_address')
        batch_op.drop_column('vlan')
        batch_op.drop_column('ip')
        batch_op.drop_column('hostname')
        batch_op.drop_column('oficina_id')

    with op.batch_alter_table('oficinas', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_oficinas_nombre'))

    op.drop_table('oficinas')
