import ipaddress

from app.extensions import db
from app.models.equipo import ESTADOS_EQUIPO, Equipo
from app.models.historial_estado import HistorialEstado
from app.models.oficina import Oficina
from app.utils.errors import AppError, Conflicto, NoEncontrado


def listar_equipos(estado=None, oficina_id=None):
    query = Equipo.query
    if estado:
        query = query.filter_by(estado=estado)
    if oficina_id:
        query = query.filter_by(oficina_id=oficina_id)
    return query.order_by(Equipo.codigo_interno).all()


def _validar_red(data):
    """Valida ip, vlan y oficina_id cuando vienen en el payload."""
    if data.get("ip"):
        try:
            ipaddress.ip_address(data["ip"].strip())
        except ValueError:
            raise AppError("The IP address is not valid") from None

    if data.get("vlan") not in (None, ""):
        vlan = str(data["vlan"]).strip()
        if not vlan.isdigit() or not (1 <= int(vlan) <= 4094):
            raise AppError("The VLAN must be a number between 1 and 4094")

    if data.get("oficina_id") not in (None, "") and not db.session.get(Oficina, data["oficina_id"]):
        raise AppError("The selected office does not exist")


def _normalizar_red(data):
    """Convierte el payload de red a los valores que se guardan en el modelo."""
    normalizado = {}
    for campo in ("hostname", "ip", "mac_address"):
        if campo in data:
            normalizado[campo] = (data[campo] or "").strip() or None
    if "vlan" in data:
        normalizado["vlan"] = str(data["vlan"]).strip() if data["vlan"] not in (None, "") else None
    if "oficina_id" in data:
        normalizado["oficina_id"] = data["oficina_id"] or None
    return normalizado


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

    _validar_red(data)

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
        **_normalizar_red(data),
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

    _validar_red(data)

    nuevo_oficina_id = _normalizar_red(data).get("oficina_id", equipo.oficina_id)
    if nuevo_oficina_id and nuevo_estado == "Prestado":
        raise AppError("A device that is currently on loan cannot be assigned to an office")

    oficina_anterior_id = equipo.oficina_id

    for campo in ("tipo", "marca", "modelo", "procesador", "ram", "almacenamiento", "observaciones", "estado"):
        if campo in data:
            setattr(equipo, campo, data[campo])

    for campo, valor in _normalizar_red(data).items():
        setattr(equipo, campo, valor)

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

    if "oficina_id" in data and equipo.oficina_id != oficina_anterior_id and usuario_id:
        if equipo.oficina_id:
            oficina = db.session.get(Oficina, equipo.oficina_id)
            observacion = f"Assigned to a desk in office {oficina.nombre}" if oficina else "Assigned to an office"
        else:
            oficina_anterior = db.session.get(Oficina, oficina_anterior_id) if oficina_anterior_id else None
            observacion = (
                f"Removed from a desk in office {oficina_anterior.nombre}"
                if oficina_anterior
                else "Removed from the office"
            )
        db.session.add(
            HistorialEstado(
                equipo_id=equipo.id,
                estado_anterior=equipo.estado,
                estado_nuevo=equipo.estado,
                usuario_id=usuario_id,
                observacion=observacion,
            )
        )

    db.session.commit()
    return equipo
