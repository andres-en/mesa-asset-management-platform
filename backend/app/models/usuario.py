from datetime import datetime

from app.extensions import db


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    correo = db.Column(db.String(150), unique=True, nullable=False, index=True)
    rol = db.Column(db.String(20), nullable=False, default="admin")
    foto_url = db.Column(db.String(500), nullable=True)
    activo = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    prestamos_creados = db.relationship("Prestamo", backref="creado_por_usuario", lazy=True)
    historial = db.relationship("HistorialEstado", backref="usuario", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "correo": self.correo,
            "rol": self.rol,
            "foto_url": self.foto_url,
            "activo": self.activo,
        }
