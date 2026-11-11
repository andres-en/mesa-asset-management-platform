from datetime import datetime

from app.extensions import db
from app.models.comando import CATALOGO_COMANDOS, CATALOGO_POR_ID, ESTADOS_COMANDO_EJECUCION, ComandoEjecucion
from app.models.equipo import Equipo
from app.utils.errors import AppError, Conflicto, NoEncontrado
from app.utils.tokens import generar_token_agente


def listar_catalogo():
    return CATALOGO_COMANDOS


def _obtener_equipo(equipo_id):
    equipo = db.session.get(Equipo, equipo_id)
    if not equipo:
        raise NoEncontrado("Device not found")
    return equipo


def generar_token_para_equipo(equipo_id):
    """(Re)genera el token de agente de un equipo. Devuelve el token en claro
    una sola vez; solo el hash queda guardado."""
    equipo = _obtener_equipo(equipo_id)
    token_plano, token_hash = generar_token_agente()
    equipo.agente_token_hash = token_hash
    db.session.commit()
    return token_plano


def encolar_comando(equipo_id, comando_id, usuario_id):
    equipo = _obtener_equipo(equipo_id)

    if comando_id not in CATALOGO_POR_ID:
        raise AppError("Command not found in the catalog")

    if not equipo.agente_token_hash:
        raise Conflicto("This device has no installed/enrolled agent")

    ejecucion = ComandoEjecucion(
        equipo_id=equipo.id,
        comando_id=comando_id,
        estado="pendiente",
        solicitado_por_id=usuario_id,
    )
    db.session.add(ejecucion)
    db.session.commit()
    return ejecucion


def resumen_estados():
    """Cuenta de ejecuciones de comando por estado, para el dashboard."""
    filas = (
        db.session.query(ComandoEjecucion.estado, db.func.count(ComandoEjecucion.id))
        .group_by(ComandoEjecucion.estado)
        .all()
    )
    conteo = {estado: 0 for estado in ESTADOS_COMANDO_EJECUCION}
    conteo.update(dict(filas))
    return conteo


def listar_ejecuciones(equipo_id):
    return ComandoEjecucion.query.filter_by(equipo_id=equipo_id).order_by(ComandoEjecucion.fecha_solicitud.desc()).all()


def obtener_pendientes_para_equipo(equipo):
    """Usado por el agente al hacer polling. Marca lo entregado como
    en_progreso para no reenviarlo en el siguiente poll."""
    equipo.agente_ultimo_contacto = datetime.utcnow()

    pendientes = (
        ComandoEjecucion.query.filter_by(equipo_id=equipo.id, estado="pendiente")
        .order_by(ComandoEjecucion.fecha_solicitud.asc())
        .all()
    )
    for ejecucion in pendientes:
        ejecucion.estado = "en_progreso"

    db.session.commit()
    return pendientes


def reportar_resultado(ejecucion_id, equipo, estado, resultado):
    ejecucion = db.session.get(ComandoEjecucion, ejecucion_id)
    if not ejecucion or ejecucion.equipo_id != equipo.id:
        raise NoEncontrado("Execution not found for this device")

    if estado not in ("completado", "fallido"):
        raise AppError("Invalid result status. Use 'completado' or 'fallido'")

    ejecucion.estado = estado
    ejecucion.resultado = resultado
    ejecucion.fecha_completado = datetime.utcnow()
    equipo.agente_ultimo_contacto = datetime.utcnow()
    db.session.commit()
    return ejecucion
