from flask import request

from app.utils.errors import NoAutorizado
from app.utils.tokens import hashear_token


def requerir_agente():
    """Autentica al agente dial-out vía el header X-Agent-Token.

    Devuelve el Equipo dueño del token. No usa JWT: el agente es un servicio
    de máquina, no un usuario con sesión.
    """
    from app.models.equipo import Equipo

    token = request.headers.get("X-Agent-Token")
    if not token:
        raise NoAutorizado("Missing X-Agent-Token header")

    equipo = Equipo.query.filter_by(agente_token_hash=hashear_token(token)).first()
    if not equipo:
        raise NoAutorizado("Invalid agent token")
    return equipo
