from datetime import datetime

from app.extensions import db
from app.utils.fechas import iso_utc

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

    oficina_id = db.Column(db.Integer, db.ForeignKey("oficinas.id"), nullable=True, index=True)
    hostname = db.Column(db.String(100))
    ip = db.Column(db.String(45))
    vlan = db.Column(db.String(20))
    mac_address = db.Column(db.String(17))

    agente_token_hash = db.Column(db.String(64), unique=True, index=True)
    agente_ultimo_contacto = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    oficina = db.relationship("Oficina", backref="equipos", lazy=True)
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
            "oficina_id": self.oficina_id,
            "oficina_nombre": self.oficina.nombre if self.oficina else None,
            "hostname": self.hostname,
            "ip": self.ip,
            "vlan": self.vlan,
            "mac_address": self.mac_address,
            "agente_instalado": self.agente_token_hash is not None,
            "agente_ultimo_contacto": iso_utc(self.agente_ultimo_contacto),
        }
