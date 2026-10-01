from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.models.equipo import Equipo
from app.models.prestamo import Prestamo

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


@dashboard_bp.get("")
@jwt_required()
def indicadores():
    """Main dashboard indicators.
    ---
    tags:
      - Dashboard
    security:
      - Bearer: []
    responses:
      200:
        description: Device counts by status and pending remote signatures
        schema:
          type: object
          properties:
            equipos_totales:
              type: integer
            equipos_disponibles:
              type: integer
            equipos_prestados:
              type: integer
            equipos_mantenimiento:
              type: integer
            equipos_dados_de_baja:
              type: integer
            firmas_remotas_pendientes:
              type: integer
    """
    total = Equipo.query.count()
    disponibles = Equipo.query.filter_by(estado="Disponible").count()
    prestados = Equipo.query.filter_by(estado="Prestado").count()
    mantenimiento = Equipo.query.filter_by(estado="Mantenimiento").count()
    dados_de_baja = Equipo.query.filter_by(estado="Dado de baja").count()
    firmas_pendientes = Prestamo.query.filter_by(estado_firma="pendiente_remota").count()

    return jsonify(
        {
            "equipos_totales": total,
            "equipos_disponibles": disponibles,
            "equipos_prestados": prestados,
            "equipos_mantenimiento": mantenimiento,
            "equipos_dados_de_baja": dados_de_baja,
            "firmas_remotas_pendientes": firmas_pendientes,
        }
    )
