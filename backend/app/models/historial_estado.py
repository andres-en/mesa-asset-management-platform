from datetime import datetime

from app.extensions import db


class HistorialEstado(db.Model):
    __tablename__ = "historial_estados"

    id = db.Column(db.Integer, primary_key=True)
    equipo_id = db.Column(db.Integer, db.ForeignKey("equipos.id"), nullable=False)
    estado_anterior = db.Column(db.String(20))
    estado_nuevo = db.Column(db.String(20), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    observacion = db.Column(db.Text)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "equipo_id": self.equipo_id,
            "estado_anterior": self.estado_anterior,
            "estado_nuevo": self.estado_nuevo,
            "usuario_id": self.usuario_id,
            "observacion": self.observacion,
            "fecha": self.fecha.isoformat() if self.fecha else None,
        }
