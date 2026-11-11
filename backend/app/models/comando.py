from app.extensions import db
from app.utils.fechas import iso_utc

# Catálogo cerrado de comandos de remediación. No se crean ni editan vía API:
# solo existen los definidos aquí (y su implementación real vive en el agente).
CATALOGO_COMANDOS = [
    {
        "id": "reiniciar_explorer",
        "nombre": "Restart Explorer.exe",
        "descripcion": "Restarts the device's explorer.exe process.",
    },
    {"id": "flush_dns", "nombre": "Flush DNS cache", "descripcion": "Runs ipconfig /flushdns."},
    {"id": "renovar_ip", "nombre": "Renew IP address", "descripcion": "Runs ipconfig /release followed by /renew."},
    {
        "id": "limpiar_temp",
        "nombre": "Clear temporary files",
        "descripcion": "Deletes the contents of the user and system temp folders.",
    },
    {"id": "gpupdate", "nombre": "Update group policies", "descripcion": "Runs gpupdate /force."},
    {"id": "reiniciar_spooler", "nombre": "Restart print spooler", "descripcion": "Restarts the Spooler service."},
    {"id": "reiniciar_equipo", "nombre": "Restart device", "descripcion": "Restarts the whole device."},
    {
        "id": "info_sistema",
        "nombre": "Get system information",
        "descripcion": "Read-only diagnostics: OS, uptime, disk space.",
    },
]

CATALOGO_POR_ID = {c["id"]: c for c in CATALOGO_COMANDOS}

ESTADOS_COMANDO_EJECUCION = ["pendiente", "en_progreso", "completado", "fallido"]


class ComandoEjecucion(db.Model):
    __tablename__ = "comando_ejecuciones"

    id = db.Column(db.Integer, primary_key=True)
    equipo_id = db.Column(db.Integer, db.ForeignKey("equipos.id"), nullable=False, index=True)
    comando_id = db.Column(db.String(50), nullable=False)
    estado = db.Column(db.String(20), nullable=False, default="pendiente", index=True)
    resultado = db.Column(db.Text)
    solicitado_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    fecha_solicitud = db.Column(db.DateTime, server_default=db.func.now())
    fecha_completado = db.Column(db.DateTime)

    equipo = db.relationship("Equipo", backref="comando_ejecuciones", lazy=True)
    solicitado_por = db.relationship("Usuario", lazy=True)

    def to_dict(self):
        info = CATALOGO_POR_ID.get(self.comando_id, {})
        return {
            "id": self.id,
            "equipo_id": self.equipo_id,
            "comando_id": self.comando_id,
            "comando_nombre": info.get("nombre", self.comando_id),
            "estado": self.estado,
            "resultado": self.resultado,
            "solicitado_por_id": self.solicitado_por_id,
            "solicitado_por_nombre": self.solicitado_por.nombre if self.solicitado_por else None,
            "fecha_solicitud": iso_utc(self.fecha_solicitud),
            "fecha_completado": iso_utc(self.fecha_completado),
        }
