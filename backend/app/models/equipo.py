from datetime import datetime

from app.extensions import db

ESTADOS_EQUIPO = ["Disponible", "Prestado", "Mantenimiento", "Dado de baja"]


class Equipo(db.Model):
    __tablename__ = "equipos"

    id = db.Column(db.Integer, primary_key=True)
    codigo_interno = db.Column(db.String(50), unique=True, nullable=False, index=True)
    tipo = db.Column(db.String(50))
    marca = db.Column(db.String(100), nullable=False)
    modelo = db.Column(db.String(100), nullable=False)
    procesador = db.Column(db.String(150))
    ram = db.Column(db.String(50))
    almacenamiento = db.Column(db.String(50))
    estado = db.Column(db.String(20), nullable=False, default="Disponible")
    observaciones = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    prestamos = db.relationship("Prestamo", backref="equipo", lazy=True)
    historial = db.relationship("HistorialEstado", backref="equipo", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "codigo_interno": self.codigo_interno,
            "tipo": self.tipo,
            "marca": self.marca,
            "modelo": self.modelo,
            "procesador": self.procesador,
            "ram": self.ram,
            "almacenamiento": self.almacenamiento,
            "estado": self.estado,
            "observaciones": self.observaciones,
        }
