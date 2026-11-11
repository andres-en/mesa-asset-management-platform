import json

from app.extensions import db
from app.models.equipo import Equipo
from app.models.oficina import Oficina
from app.utils.errors import AppError, Conflicto, NoEncontrado


def listar_oficinas():
    return Oficina.query.order_by(Oficina.nombre).all()


def obtener_oficina(oficina_id):
    oficina = db.session.get(Oficina, oficina_id)
    if not oficina:
        raise NoEncontrado("Office not found")
    return oficina


def crear_oficina(data):
    nombre = (data.get("nombre") or "").strip()
    if not nombre:
        raise AppError("Name is required")

    if Oficina.query.filter_by(nombre=nombre).first():
        raise Conflicto("An office with that name already exists")

    oficina = Oficina(
        nombre=nombre,
        direccion=(data.get("direccion") or "").strip() or None,
        ciudad=(data.get("ciudad") or "").strip() or None,
    )
    db.session.add(oficina)
    db.session.commit()
    return oficina


def actualizar_oficina(oficina_id, data):
    oficina = obtener_oficina(oficina_id)

    if "nombre" in data:
        nombre = (data["nombre"] or "").strip()
        if not nombre:
            raise AppError("Name is required")
        existente = Oficina.query.filter_by(nombre=nombre).first()
        if existente and existente.id != oficina.id:
            raise Conflicto("An office with that name already exists")
        oficina.nombre = nombre

    for campo in ("direccion", "ciudad"):
        if campo in data:
            setattr(oficina, campo, (data[campo] or "").strip() or None)

    db.session.commit()
    return oficina


def _validar_asignaciones_layout(oficina_id, layout):
    """Evita que un puesto apunte a un equipo prestado, duplicado en el mismo
    layout, o ya asignado a un puesto de otra oficina."""
    equipo_ids = [d.get("equipoId") for d in layout.get("desks", []) if d.get("equipoId")]
    if not equipo_ids:
        return

    if len(equipo_ids) != len(set(equipo_ids)):
        raise AppError("A device cannot occupy two desks on the same map")

    equipos = {e.id: e for e in Equipo.query.filter(Equipo.id.in_(equipo_ids)).all()}
    for equipo_id in equipo_ids:
        equipo = equipos.get(equipo_id)
        if not equipo:
            raise AppError(f"Device {equipo_id} does not exist")
        if equipo.estado == "Prestado":
            raise Conflicto(f"Device {equipo.codigo_interno} is on loan and cannot be placed at a desk")

    otras = Oficina.query.filter(Oficina.id != oficina_id, Oficina.layout.isnot(None)).all()
    for otra in otras:
        try:
            otro_layout = json.loads(otra.layout)
        except ValueError:
            continue
        for d in otro_layout.get("desks", []):
            otro_equipo_id = d.get("equipoId")
            if otro_equipo_id in equipos:
                equipo = equipos[otro_equipo_id]
                raise Conflicto(f"Device {equipo.codigo_interno} is already assigned to a desk in office {otra.nombre}")


def actualizar_layout(oficina_id, layout):
    oficina = obtener_oficina(oficina_id)

    if not isinstance(layout, dict):
        raise AppError("The layout must be a JSON object")
    for campo in ("width", "height", "desks", "benches", "door"):
        if campo not in layout:
            raise AppError(f"The layout is missing the required field: {campo}")

    _validar_asignaciones_layout(oficina_id, layout)

    oficina.layout = json.dumps(layout)
    db.session.commit()
    return oficina


def eliminar_oficina(oficina_id):
    oficina = obtener_oficina(oficina_id)
    if oficina.equipos:
        raise Conflicto("Cannot delete: devices are assigned to this office")

    db.session.delete(oficina)
    db.session.commit()
