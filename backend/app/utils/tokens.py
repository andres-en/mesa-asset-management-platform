import hashlib
import secrets
from datetime import datetime, timedelta


def generar_token_firma():
    """Genera un token aleatorio para el link de firma.

    Devuelve (token_plano, token_hash). El token plano va en el link enviado
    por correo; solo el hash se persiste en la base de datos, así una fuga
    de la BD no expone links de firma válidos.
    """
    token_plano = secrets.token_urlsafe(32)
    token_hash = hashear_token(token_plano)
    return token_plano, token_hash


def hashear_token(token_plano: str) -> str:
    return hashlib.sha256(token_plano.encode("utf-8")).hexdigest()


def calcular_expiracion(horas: int) -> datetime:
    return datetime.utcnow() + timedelta(hours=horas)


def token_expirado(fecha_expiracion) -> bool:
    if fecha_expiracion is None:
        return True
    return datetime.utcnow() > fecha_expiracion
