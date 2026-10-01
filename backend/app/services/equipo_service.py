from app.extensions import db
from app.models.equipo import ESTADOS_EQUIPO, Equipo
from app.models.historial_estado import HistorialEstado
from app.utils.errors import AppError, Conflicto, NoEncontrado


def listar_equipos(estado=None):
    query = Equipo.query
    if estado:
        query = query.filter_by(estado=estado)
    return query.order_by(Equipo.codigo_interno).all()


def obtener_equipo(equipo_id):
    equipo = db.session.get(Equipo, equipo_id)
    if not equipo:
        raise NoEncontrado("Device not found")
    return equipo


def crear_equipo(data):
    codigo_interno = (data.get("codigo_interno") or "").strip()
    marca = (data.get("marca") or "").strip()
    modelo = (data.get("modelo") or "").strip()

    if not codigo_interno or not marca or not modelo:
        raise AppError("codigo_interno, marca and modelo are required")

    if Equipo.query.filter_by(codigo_interno=codigo_interno).first():
        raise Conflicto("A device with that internal code already exists")

    equipo = Equipo(
        codigo_interno=codigo_interno,
        tipo=data.get("tipo"),
        marca=marca,
        modelo=modelo,
        procesador=data.get("procesador"),
        ram=data.get("ram"),
        almacenamiento=data.get("almacenamiento"),
        observaciones=data.get("observaciones"),
        estado="Disponible",
    )
    db.session.add(equipo)
    db.session.commit()
    return equipo


def actualizar_equipo(equipo_id, data, usuario_id=None):
    equipo = obtener_equipo(equipo_id)
    estado_anterior = equipo.estado
    nuevo_estado = data.get("estado", estado_anterior)

    if nuevo_estado not in ESTADOS_EQUIPO:
        raise AppError(f"Invalid status. Allowed values: {ESTADOS_EQUIPO}")
    # "Prestado" (on loan) is owned by the loan lifecycle: only creating a loan
    # sets it and only registering the return clears it. Changing it by hand
    # would leave an active loan pointing to an "available" device, or vice versa.
    if nuevo_estado != estado_anterior and "Prestado" in (estado_anterior, nuevo_estado):
        raise AppError("The on-loan status is managed by loans and cannot be changed manually", status_code=409)

    for campo in ("tipo", "marca", "modelo", "procesador", "ram", "almacenamiento", "observaciones", "estado"):
        if campo in data:
            setattr(equipo, campo, data[campo])

    if nuevo_estado != estado_anterior and usuario_id is not None:
        db.session.add(
            HistorialEstado(
                equipo_id=equipo.id,
                estado_anterior=estado_anterior,
                estado_nuevo=nuevo_estado,
                usuario_id=usuario_id,
                observacion="Manual status change",
            )
        )

    db.session.commit()
    return equipo
