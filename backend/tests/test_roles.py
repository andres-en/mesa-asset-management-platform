"""Role-based access: admins manage the inventory and loans; viewers are read-only."""

from __future__ import annotations

import pytest


@pytest.fixture
def viewer(make_user):
    return make_user("viewer")[1]


@pytest.fixture
def loan(client, admin_headers, device, signature):
    resp = client.post(
        "/prestamos",
        json={
            "equipo_id": device["id"],
            "nombre_empleado": "Laura",
            "correo_empleado": "laura@example.com",
            "fecha_entrega": "2026-09-01",
            "firma_it": signature,
            "firma_empleado": signature,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


def test_viewers_can_read_everything(client, viewer, device, loan):
    for path in (
        "/equipos",
        f"/equipos/{device['id']}",
        "/prestamos",
        f"/prestamos/{loan['id']}",
        f"/prestamos/{loan['id']}/pdf",
        "/historial",
        f"/historial/equipo/{device['id']}",
        "/dashboard",
    ):
        assert client.get(path, headers=viewer).status_code == 200, path


def test_viewers_cannot_change_devices_or_loans(client, viewer, device, loan, signature):
    writes = [
        ("post", "/equipos", {"codigo_interno": "LAP-009", "marca": "HP", "modelo": "X"}),
        ("put", f"/equipos/{device['id']}", {"estado": "Mantenimiento"}),
        ("post", "/prestamos", {"equipo_id": device["id"], "firma_it": signature, "firma_remota": True}),
        ("post", f"/prestamos/{loan['id']}/reenviar-firma", {}),
        ("put", f"/prestamos/{loan['id']}/devolver", {"estado_equipo_devolucion": "Bueno"}),
    ]
    for method, path, body in writes:
        resp = getattr(client, method)(path, json=body, headers=viewer)
        assert resp.status_code == 403, (method, path)
        assert resp.get_json() == {"error": "Administrator role required"}

    # Nothing changed.
    assert client.get(f"/equipos/{device['id']}", headers=viewer).get_json()["estado"] == "Prestado"
    assert client.get(f"/prestamos/{loan['id']}", headers=viewer).get_json()["estado_prestamo"] == "Activo"
