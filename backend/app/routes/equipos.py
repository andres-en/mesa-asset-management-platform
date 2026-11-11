from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services import comando_service, equipo_service
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
      - in: query
        name: oficina_id
        type: integer
        required: false
        description: Filter by office
    responses:
      200:
        description: Device list
    """
    estado = request.args.get("estado")
    oficina_id = request.args.get("oficina_id", type=int)
    equipos = equipo_service.listar_equipos(estado=estado, oficina_id=oficina_id)
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


@equipos_bp.get("/comandos/catalogo")
@jwt_required()
def catalogo_comandos():
    """Lists the closed catalog of available remediation commands.
    ---
    tags:
      - Remote commands
    security:
      - Bearer: []
    responses:
      200:
        description: Command catalog
    """
    return jsonify(comando_service.listar_catalogo())


@equipos_bp.get("/comandos/resumen")
@jwt_required()
@admin_required
def resumen_comandos():
    """Counts command executions by status, for the dashboard.
    ---
    tags:
      - Remote commands
    security:
      - Bearer: []
    responses:
      200:
        description: Count per status (pendiente, en_progreso, completado, fallido)
      403:
        description: Administrator role required
    """
    return jsonify(comando_service.resumen_estados())


@equipos_bp.post("/<int:equipo_id>/agente-token")
@jwt_required()
@admin_required
def generar_token_agente(equipo_id):
    """Generates (or rotates) a device's agent enrollment token.
    The token is shown only once; only its hash is stored.
    ---
    tags:
      - Remote commands
    security:
      - Bearer: []
    parameters:
      - in: path
        name: equipo_id
        type: integer
        required: true
    responses:
      200:
        description: Token generated
      403:
        description: Administrator role required
      404:
        description: Device not found
    """
    token = comando_service.generar_token_para_equipo(equipo_id)
    return jsonify({"token": token})


@equipos_bp.post("/<int:equipo_id>/comandos")
@jwt_required()
@admin_required
def encolar_comando(equipo_id):
    """Queues a catalog command to run on the device.
    ---
    tags:
      - Remote commands
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
          required:
            - comando_id
          properties:
            comando_id:
              type: string
    responses:
      201:
        description: Command queued
      400:
        description: Unknown command
      403:
        description: Administrator role required
      404:
        description: Device not found
      409:
        description: The device has no installed/enrolled agent
    """
    data = request.get_json(silent=True) or {}
    ejecucion = comando_service.encolar_comando(equipo_id, data.get("comando_id"), usuario_id=int(get_jwt_identity()))
    return jsonify(ejecucion.to_dict()), 201


@equipos_bp.get("/<int:equipo_id>/comandos")
@jwt_required()
def historial_comandos(equipo_id):
    """Lists the commands run or in progress on a device.
    ---
    tags:
      - Remote commands
    security:
      - Bearer: []
    parameters:
      - in: path
        name: equipo_id
        type: integer
        required: true
    responses:
      200:
        description: Execution history
    """
    ejecuciones = comando_service.listar_ejecuciones(equipo_id)
    return jsonify([e.to_dict() for e in ejecuciones])
