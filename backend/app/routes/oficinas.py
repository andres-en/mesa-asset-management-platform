from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.services import oficina_service
from app.utils.roles import admin_required

oficinas_bp = Blueprint("oficinas", __name__, url_prefix="/oficinas")


@oficinas_bp.get("")
@jwt_required()
def listar():
    """Lists the registered offices.
    ---
    tags:
      - Offices
    security:
      - Bearer: []
    responses:
      200:
        description: Office list
    """
    oficinas = oficina_service.listar_oficinas()
    return jsonify([o.to_dict() for o in oficinas])


@oficinas_bp.post("")
@jwt_required()
@admin_required
def crear():
    """Registers a new office.
    ---
    tags:
      - Offices
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - nombre
          properties:
            nombre:
              type: string
            direccion:
              type: string
            ciudad:
              type: string
    responses:
      201:
        description: Office created
      400:
        description: Invalid data
      403:
        description: Administrator role required
      409:
        description: An office with that name already exists
    """
    data = request.get_json(silent=True) or {}
    oficina = oficina_service.crear_oficina(data)
    return jsonify(oficina.to_dict()), 201


@oficinas_bp.put("/<int:oficina_id>")
@jwt_required()
@admin_required
def actualizar(oficina_id):
    """Updates an existing office.
    ---
    tags:
      - Offices
    security:
      - Bearer: []
    parameters:
      - in: path
        name: oficina_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Office updated
      403:
        description: Administrator role required
      404:
        description: Office not found
      409:
        description: An office with that name already exists
    """
    data = request.get_json(silent=True) or {}
    oficina = oficina_service.actualizar_oficina(oficina_id, data)
    return jsonify(oficina.to_dict())


@oficinas_bp.put("/<int:oficina_id>/layout")
@jwt_required()
@admin_required
def actualizar_layout(oficina_id):
    """Saves an office's network map layout (desks, dividers, door).
    ---
    tags:
      - Offices
    security:
      - Bearer: []
    parameters:
      - in: path
        name: oficina_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - layout
          properties:
            layout:
              type: object
    responses:
      200:
        description: Layout updated
      400:
        description: Invalid data
      403:
        description: Administrator role required
      404:
        description: Office not found
      409:
        description: A referenced device is already placed in another office, or is currently on loan
    """
    data = request.get_json(silent=True) or {}
    oficina = oficina_service.actualizar_layout(oficina_id, data.get("layout"))
    return jsonify(oficina.to_dict())


@oficinas_bp.delete("/<int:oficina_id>")
@jwt_required()
@admin_required
def eliminar(oficina_id):
    """Deletes an office, only when no devices are assigned to it.
    ---
    tags:
      - Offices
    security:
      - Bearer: []
    parameters:
      - in: path
        name: oficina_id
        type: integer
        required: true
    responses:
      204:
        description: Office deleted
      403:
        description: Administrator role required
      404:
        description: Office not found
      409:
        description: Devices are assigned to this office
    """
    oficina_service.eliminar_oficina(oficina_id)
    return "", 204
