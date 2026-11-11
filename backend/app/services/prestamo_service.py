from datetime import date

from flask import current_app

from app.extensions import db
from app.models.equipo import Equipo
from app.models.historial_estado import HistorialEstado
from app.models.prestamo import ESTADOS_EQUIPO_DEVOLUCION, Prestamo
from app.services import email_service, firma_service
from app.utils.errors import AppError, NoEncontrado
from app.utils.tokens import calcular_expiracion, generar_token_firma


def listar_prestamos(estado=None):
    query = Prestamo.query
    if estado:
        query = query.filter_by(estado_prestamo=estado)
    return query.order_by(Prestamo.created_at.desc()).all()


def obtener_prestamo(prestamo_id):
    prestamo = db.session.get(Prestamo, prestamo_id)
    if not prestamo:
        raise NoEncontrado("Loan not found")
    return prestamo


def _parse_fecha(valor, campo):
    """Accepts an ISO `YYYY-MM-DD` string (or a date) and returns a `date`; None stays None."""
    if valor in (None, ""):
        return None
    if isinstance(valor, date):
        return valor
    try:
        return date.fromisoformat(str(valor))
    except ValueError:
        raise AppError(f"{campo} must be a date in YYYY-MM-DD format") from None


def _registrar_historial(equipo, estado_anterior, estado_nuevo, usuario_id, observacion=None):
    db.session.add(
        HistorialEstado(
            equipo_id=equipo.id,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_nuevo,
            usuario_id=usuario_id,
            observacion=observacion,
        )
    )


def crear_prestamo(data, usuario_id):
    equipo_id = data.get("equipo_id")
    equipo = db.session.get(Equipo, equipo_id)
    if not equipo:
        raise NoEncontrado("Device not found")
    if equipo.estado != "Disponible":
        raise AppError("The device is not available for loan")
    if equipo.oficina_id:
        raise AppError("This device is assigned to an office desk and is not in the warehouse for loan")

    nombre_empleado = (data.get("nombre_empleado") or "").strip()
    correo_empleado = (data.get("correo_empleado") or "").strip()
    fecha_entrega = _parse_fecha(data.get("fecha_entrega"), "fecha_entrega")
    fecha_devolucion_estimada = _parse_fecha(data.get("fecha_devolucion_estimada"), "fecha_devolucion_estimada")
    firma_it_b64 = data.get("firma_it")
    firma_empleado_b64 = data.get("firma_empleado")
    firma_remota = bool(data.get("firma_remota"))
    enviar_email = bool(data.get("enviar_email", True))

    if not nombre_empleado or not correo_empleado or not fecha_entrega or not firma_it_b64:
        raise AppError("nombre_empleado, correo_empleado, fecha_entrega and firma_it are required")

    if not firma_remota and not firma_empleado_b64:
        raise AppError("Capture the employee signature or set firma_remota=true")

    firma_it_path = firma_service.guardar_firma_png(firma_it_b64, "it")

    prestamo = Prestamo(
        equipo_id=equipo.id,
        nombre_empleado=nombre_empleado,
        cargo_empleado=data.get("cargo_empleado"),
        correo_empleado=correo_empleado,
        cargador_entregado=bool(data.get("cargador_entregado", False)),
        accesorios=data.get("accesorios") or [],
        fecha_entrega=fecha_entrega,
        fecha_devolucion_estimada=fecha_devolucion_estimada,
        observaciones_entrega=data.get("observaciones_entrega"),
        firma_it_path=firma_it_path,
        created_by=usuario_id,
    )

    if firma_remota:
        prestamo.estado_firma = "pendiente_remota"
        token_plano, token_hash = generar_token_firma()
        prestamo.firma_token_hash = token_hash
        prestamo.firma_token_expira = calcular_expiracion(current_app.config["SIGNATURE_TOKEN_EXPIRATION_HOURS"])
    else:
        prestamo.estado_firma = "completo"
        prestamo.firma_empleado_path = firma_service.guardar_firma_png(firma_empleado_b64, "empleado")

    estado_anterior = equipo.estado
    equipo.estado = "Prestado"

    db.session.add(prestamo)
    _registrar_historial(equipo, estado_anterior, "Prestado", usuario_id, "Loan created")
    db.session.commit()

    link = None
    if firma_remota:
        link = f"{current_app.config['SIGNING_BASE_URL']}/{token_plano}"
        if enviar_email:
            email_service.enviar_correo_firma(prestamo, equipo, link)

    return prestamo, link


def reenviar_firma(prestamo_id, usuario_id, enviar_email=True):
    prestamo = obtener_prestamo(prestamo_id)
    if prestamo.estado_firma != "pendiente_remota":
        raise AppError("This loan has no pending remote signature")

    token_plano, token_hash = generar_token_firma()
    prestamo.firma_token_hash = token_hash
    prestamo.firma_token_expira = calcular_expiracion(current_app.config["SIGNATURE_TOKEN_EXPIRATION_HOURS"])
    db.session.commit()

    link = f"{current_app.config['SIGNING_BASE_URL']}/{token_plano}"
    enviado = False
    if enviar_email:
        enviado = email_service.enviar_correo_firma(prestamo, prestamo.equipo, link)
    return {"enviado": enviado, "link": link}


def registrar_devolucion(prestamo_id, data, usuario_id):
    prestamo = obtener_prestamo(prestamo_id)
    if prestamo.estado_prestamo == "Cerrado":
        raise AppError("This loan is already closed")
    if prestamo.estado_firma == "pendiente_remota":
        raise AppError("The return cannot be registered while the remote signature is pending")

    estado_equipo_devolucion = data.get("estado_equipo_devolucion")
    if estado_equipo_devolucion not in ESTADOS_EQUIPO_DEVOLUCION:
        raise AppError(f"Invalid estado_equipo_devolucion. Allowed values: {ESTADOS_EQUIPO_DEVOLUCION}")

    prestamo.fecha_devolucion_real = (
        _parse_fecha(data.get("fecha_devolucion_real"), "fecha_devolucion_real") or date.today()
    )
    prestamo.estado_equipo_devolucion = estado_equipo_devolucion
    prestamo.observaciones_devolucion = data.get("observaciones_devolucion")
    prestamo.estado_prestamo = "Cerrado"

    equipo = prestamo.equipo
    estado_anterior = equipo.estado
    equipo.estado = "Disponible" if estado_equipo_devolucion == "Bueno" else "Mantenimiento"

    db.session.add(prestamo)
    _registrar_historial(equipo, estado_anterior, equipo.estado, usuario_id, "Return registered")
    db.session.commit()
    return prestamo
