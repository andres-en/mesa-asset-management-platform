from functools import wraps

from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.usuario import Usuario
from app.utils.errors import Prohibido


def requerir_admin():
    """Aborta con 403 si el usuario autenticado actual no es admin."""
    usuario = db.session.get(Usuario, int(get_jwt_identity()))
    if not usuario or usuario.rol != "admin":
        raise Prohibido("Administrator role required")


def admin_required(fn):
    """Restricts a route to admins. Goes below @jwt_required(); viewers keep read-only access."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        requerir_admin()
        return fn(*args, **kwargs)

    return wrapper
