"""Device inventory, manual status changes and the dashboard."""

from __future__ import annotations

from app.models.historial_estado import HistorialEstado


def test_device_creation_validates_input_and_unique_codes(client, admin_headers, device):
    assert device["estado"] == "Disponible"
    duplicate = client.post(
        "/equipos", json={"codigo_interno": "LAP-001", "marca": "HP", "modelo": "X"}, headers=admin_headers
    )
    assert duplicate.status_code == 409
    missing = client.post("/equipos", json={"codigo_interno": "LAP-002"}, headers=admin_headers)
    assert missing.status_code == 400


def test_manual_status_changes_are_recorded_in_the_history(client, make_user, device):
    user, headers = make_user("admin")
    resp = client.put(f"/equipos/{device['id']}", json={"estado": "Mantenimiento"}, headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()["estado"] == "Mantenimiento"

    (entry,) = HistorialEstado.query.filter_by(equipo_id=device["id"]).all()
    assert (entry.estado_anterior, entry.estado_nuevo, entry.usuario_id) == ("Disponible", "Mantenimiento", user.id)


def test_editing_other_fields_does_not_add_history(client, admin_headers, device):
    resp = client.put(f"/equipos/{device['id']}", json={"ram": "32"}, headers=admin_headers)
    assert resp.status_code == 200
    assert HistorialEstado.query.filter_by(equipo_id=device["id"]).count() == 0


def test_unknown_statuses_are_rejected(client, admin_headers, device):
    resp = client.put(f"/equipos/{device['id']}", json={"estado": "Lost"}, headers=admin_headers)
    assert resp.status_code == 400


def test_the_on_loan_status_cannot_be_set_or_cleared_by_hand(client, admin_headers, device, signature):
    """Regression: the API allowed marking a device as on loan without a loan (or freeing one mid-loan)."""
    set_manually = client.put(f"/equipos/{device['id']}", json={"estado": "Prestado"}, headers=admin_headers)
    assert set_manually.status_code == 409

    client.post(
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
    freed_manually = client.put(f"/equipos/{device['id']}", json={"estado": "Disponible"}, headers=admin_headers)
    assert freed_manually.status_code == 409


def test_dashboard_counts_devices_by_status(client, admin_headers, device):
    client.post("/equipos", json={"codigo_interno": "MON-001", "marca": "LG", "modelo": "27UL"}, headers=admin_headers)
    client.put(f"/equipos/{device['id']}", json={"estado": "Dado de baja"}, headers=admin_headers)
    body = client.get("/dashboard", headers=admin_headers).get_json()
    assert body["equipos_totales"] == 2
    assert body["equipos_disponibles"] == 1
    assert body["equipos_dados_de_baja"] == 1


def test_device_detail_includes_its_loans_and_history(client, admin_headers, device):
    client.put(f"/equipos/{device['id']}", json={"estado": "Mantenimiento"}, headers=admin_headers)
    detail = client.get(f"/equipos/{device['id']}", headers=admin_headers).get_json()
    assert detail["prestamos"] == []
    assert [h["estado_nuevo"] for h in detail["historial"]] == ["Mantenimiento"]
