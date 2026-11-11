import json
from datetime import datetime

from app.extensions import db


class Oficina(db.Model):
    __tablename__ = "oficinas"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False, index=True)
    direccion = db.Column(db.String(255))
    ciudad = db.Column(db.String(100))
    layout = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        try:
            layout = json.loads(self.layout) if self.layout else None
        except ValueError:
            layout = None
        return {
            "id": self.id,
            "nombre": self.nombre,
            "direccion": self.direccion,
            "ciudad": self.ciudad,
            "total_equipos": len(self.equipos),
            "layout": layout,
        }
