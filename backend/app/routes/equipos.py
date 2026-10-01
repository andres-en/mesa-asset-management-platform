from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services import equipo_service
from app.utils.roles import admin_required

equipos_bp = Blueprint("equipos", __name__, url_prefix="/equipos")


@equipos_bp.get("")
@jwt_required()
def listar():
    """Lists the devices in the inventory.
    ---
    tags:
      - Devices
    security:
      - Bearer: []
    parameters:
      - in: query
        name: estado
        type: string
        required: false
        description: Filter by status (Disponible, Prestado, Mantenimiento, Dado de baja)
    responses:
      200:
        description: Device list
    """
    estado = request.args.get("estado")
    equipos = equipo_service.listar_equipos(estado=estado)
    return jsonify([e.to_dict() for e in equipos])


@equipos_bp.get("/<int:equipo_id>")
@jwt_required()
def obtener(equipo_id):
    """Returns a device with its specs, loans and status history.
    ---
    tags:
      - Devices
    security:
      - Bearer: []
    parameters:
      - in: path
        name: equipo_id
        type: integer
        required: true
    responses:
      200:
        description: Device details, including prestamos and historial
      404:
        description: Device not found
    """
    equipo = equipo_service.obtener_equipo(equipo_id)
    data = equipo.to_dict()
    data["prestamos"] = sorted(
        [p.to_dict(include_equipo=False) for p in equipo.prestamos],
        key=lambda p: p["fecha_entrega"] or "",
        reverse=True,
    )
    data["historial"] = sorted(
        [
            {
                **h.to_dict(),
                "usuario_nombre": h.usuario.nombre if h.usuario else None,
            }
            for h in equipo.historial
        ],
        key=lambda h: h["fecha"] or "",
        reverse=True,
    )
    return jsonify(data)


@equipos_bp.post("")
@jwt_required()
@admin_required
def crear():
    """Registers a new device in the inventory.
    ---
    tags:
      - Devices
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - codigo_interno
            - marca
            - modelo
          properties:
            codigo_interno:
              type: string
            tipo:
              type: string
            marca:
              type: string
            modelo:
              type: string
            procesador:
              type: string
            ram:
              type: string
            almacenamiento:
              type: string
            observaciones:
              type: string
    responses:
      403:
        description: Administrator role required (viewers are read-only)
      201:
        description: Device created (initial status Disponible)
      400:
        description: Invalid data
      409:
        description: A device with that internal code already exists
    """
    data = request.get_json(silent=True) or {}
    equipo = equipo_service.crear_equipo(data)
    return jsonify(equipo.to_dict()), 201


@equipos_bp.put("/<int:equipo_id>")
@jwt_required()
@admin_required
def actualizar(equipo_id):
    """Updates an existing device.
    ---
    tags:
      - Devices
    security:
      - Bearer: []
    parameters:
      - in: path
        name: equipo_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      403:
        description: Administrator role required (viewers are read-only)
      200:
        description: Device updated
      400:
        description: Invalid status, or the on-loan status was changed manually
      404:
        description: Device not found
    """
    data = request.get_json(silent=True) or {}
    equipo = equipo_service.actualizar_equipo(equipo_id, data, usuario_id=int(get_jwt_identity()))
    return jsonify(equipo.to_dict())
