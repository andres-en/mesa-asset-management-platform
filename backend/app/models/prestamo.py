from datetime import datetime

from app.extensions import db

ESTADOS_PRESTAMO = ["Activo", "Cerrado"]
ESTADOS_FIRMA = ["completo", "pendiente_remota"]
ESTADOS_EQUIPO_DEVOLUCION = ["Bueno", "Con daños", "Incompleto", "Requiere mantenimiento"]


class Prestamo(db.Model):
    __tablename__ = "prestamos"

    id = db.Column(db.Integer, primary_key=True)
    equipo_id = db.Column(db.Integer, db.ForeignKey("equipos.id"), nullable=False)

    nombre_empleado = db.Column(db.String(150), nullable=False)
    cargo_empleado = db.Column(db.String(150))
    correo_empleado = db.Column(db.String(150), nullable=False)

    cargador_entregado = db.Column(db.Boolean, default=False)
    accesorios = db.Column(db.JSON, nullable=True)
    fecha_entrega = db.Column(db.Date, nullable=False)
    fecha_devolucion_estimada = db.Column(db.Date)
    fecha_devolucion_real = db.Column(db.Date)

    estado_prestamo = db.Column(db.String(20), nullable=False, default="Activo")
    estado_equipo_devolucion = db.Column(db.String(30))

    observaciones_entrega = db.Column(db.Text)
    observaciones_devolucion = db.Column(db.Text)

    firma_empleado_path = db.Column(db.String(255))
    firma_it_path = db.Column(db.String(255), nullable=False)

    # Firma remota
    estado_firma = db.Column(db.String(20), nullable=False, default="completo")
    firma_token_hash = db.Column(db.String(128), unique=True, index=True)
    firma_token_expira = db.Column(db.DateTime)

    created_by = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self, include_equipo=True):
        data = {
            "id": self.id,
            "equipo_id": self.equipo_id,
            "nombre_empleado": self.nombre_empleado,
            "cargo_empleado": self.cargo_empleado,
            "correo_empleado": self.correo_empleado,
            "cargador_entregado": self.cargador_entregado,
            "accesorios": self.accesorios or [],
            "fecha_entrega": self.fecha_entrega.isoformat() if self.fecha_entrega else None,
            "fecha_devolucion_estimada": (
                self.fecha_devolucion_estimada.isoformat() if self.fecha_devolucion_estimada else None
            ),
            "fecha_devolucion_real": (self.fecha_devolucion_real.isoformat() if self.fecha_devolucion_real else None),
            "estado_prestamo": self.estado_prestamo,
            "estado_equipo_devolucion": self.estado_equipo_devolucion,
            "observaciones_entrega": self.observaciones_entrega,
            "observaciones_devolucion": self.observaciones_devolucion,
            "estado_firma": self.estado_firma,
            "token_expira_at": (self.firma_token_expira.isoformat() if self.firma_token_expira else None),
            "tiene_firma_empleado": bool(self.firma_empleado_path),
        }
        if include_equipo and self.equipo:
            data["equipo"] = self.equipo.to_dict()
        return data
