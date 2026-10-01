from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.models.historial_estado import HistorialEstado

historial_bp = Blueprint("historial", __name__, url_prefix="/historial")


def _enrich(r):
    return {
        **r.to_dict(),
        "equipo_codigo": r.equipo.codigo_interno if r.equipo else None,
        "equipo_marca": r.equipo.marca if r.equipo else None,
        "equipo_modelo": r.equipo.modelo if r.equipo else None,
        "usuario_nombre": r.usuario.nombre if r.usuario else None,
    }


@historial_bp.get("")
@jwt_required()
def listar():
    """Lists every device status change, with device and user details.
    ---
    tags:
      - History
    security:
      - Bearer: []
    responses:
      200:
        description: Status changes, newest first
    """
    registros = HistorialEstado.query.order_by(HistorialEstado.fecha.desc()).all()
    return jsonify([_enrich(r) for r in registros])


@historial_bp.get("/equipo/<int:equipo_id>")
@jwt_required()
def por_equipo(equipo_id):
    """Lists the status changes of one device.
    ---
    tags:
      - History
    security:
      - Bearer: []
    parameters:
      - in: path
        name: equipo_id
        type: integer
        required: true
    responses:
      200:
        description: Status changes of the device, newest first
    """
    registros = HistorialEstado.query.filter_by(equipo_id=equipo_id).order_by(HistorialEstado.fecha.desc()).all()
    return jsonify([_enrich(r) for r in registros])
