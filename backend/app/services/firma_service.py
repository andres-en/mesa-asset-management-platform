import base64
import binascii
import os
import uuid
from io import BytesIO

from flask import current_app
from PIL import Image, UnidentifiedImageError

from app.extensions import db
from app.models.historial_estado import HistorialEstado
from app.models.prestamo import Prestamo
from app.services import email_service
from app.utils.errors import AppError, NoEncontrado
from app.utils.tokens import hashear_token, token_expirado


def guardar_firma_png(base64_data: str, prefijo: str) -> str:
    """Decodifica una firma en base64, valida que sea una imagen PNG válida
    y la guarda en UPLOAD_FOLDER. Devuelve la ruta relativa guardada."""
    if not base64_data:
        raise AppError("The signature is required")

    if "," in base64_data and base64_data.strip().startswith("data:"):
        base64_data = base64_data.split(",", 1)[1]

    try:
        raw = base64.b64decode(base64_data, validate=True)
    except (binascii.Error, ValueError):
        raise AppError("The signature is not valid base64") from None

    try:
        imagen = Image.open(BytesIO(raw))
        imagen.verify()
    except (UnidentifiedImageError, OSError):
        raise AppError("The signature is not a valid image") from None

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    nombre_archivo = f"{prefijo}_{uuid.uuid4().hex}.png"
    ruta_completa = os.path.join(upload_folder, nombre_archivo)

    with open(ruta_completa, "wb") as f:
        f.write(raw)

    return ruta_completa


def validar_token_firma(prestamo, token_hash):
    if prestamo is None:
        raise NoEncontrado("Invalid signature link")

    if prestamo.estado_firma != "pendiente_remota" or prestamo.firma_token_hash != token_hash:
        raise NoEncontrado("Invalid signature link")

    if token_expirado(prestamo.firma_token_expira):
        raise AppError("The signature link has expired, ask for the email to be re-sent", status_code=410)


def obtener_prestamo_por_token(token_plano: str) -> Prestamo:
    token_hash = hashear_token(token_plano)
    prestamo = Prestamo.query.filter_by(firma_token_hash=token_hash).first()
    validar_token_firma(prestamo, token_hash)
    return prestamo


def completar_firma_remota(token_plano: str, firma_base64: str) -> Prestamo:
    prestamo = obtener_prestamo_por_token(token_plano)

    prestamo.firma_empleado_path = guardar_firma_png(firma_base64, "empleado")
    prestamo.estado_firma = "completo"
    prestamo.firma_token_hash = None
    prestamo.firma_token_expira = None

    equipo = prestamo.equipo
    db.session.add(
        HistorialEstado(
            equipo_id=equipo.id,
            estado_anterior=equipo.estado,
            estado_nuevo=equipo.estado,
            usuario_id=prestamo.created_by,
            observacion="Remote signature completed by the employee",
        )
    )
    db.session.commit()

    email_service.enviar_correo_firma_completada(prestamo, equipo, prestamo.creado_por_usuario)

    return prestamo
