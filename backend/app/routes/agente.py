from flask import Blueprint, jsonify, request

from app.services import comando_service
from app.utils.auth_helpers import requerir_agente

agente_bp = Blueprint("agente", __name__, url_prefix="/agente")


@agente_bp.get("/comandos/pendientes")
def comandos_pendientes():
    """Agent polling: returns this device's pending commands and marks them in progress.
    Authenticated with the X-Agent-Token header.
    ---
    tags:
      - Agent
    parameters:
      - in: header
        name: X-Agent-Token
        type: string
        required: true
    responses:
      200:
        description: Pending commands (may be empty)
      401:
        description: Missing or invalid agent token
    """
    equipo = requerir_agente()
    pendientes = comando_service.obtener_pendientes_para_equipo(equipo)
    return jsonify([{"id": e.id, "comando_id": e.comando_id} for e in pendientes])


@agente_bp.post("/comandos/<int:ejecucion_id>/resultado")
def reportar_resultado(ejecucion_id):
    """The agent reports the outcome of a command it ran.
    ---
    tags:
      - Agent
    parameters:
      - in: header
        name: X-Agent-Token
        type: string
        required: true
      - in: path
        name: ejecucion_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - estado
          properties:
            estado:
              type: string
              enum: [completado, fallido]
            resultado:
              type: string
    responses:
      200:
        description: Result recorded
      400:
        description: Invalid status
      401:
        description: Missing or invalid agent token
      404:
        description: Execution not found for this device
    """
    equipo = requerir_agente()
    data = request.get_json(silent=True) or {}
    ejecucion = comando_service.reportar_resultado(ejecucion_id, equipo, data.get("estado"), data.get("resultado"))
    return jsonify(ejecucion.to_dict())
