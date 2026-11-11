"""Network inventory, office maps and the remote remediation agent."""

from __future__ import annotations

import pytest


@pytest.fixture
def viewer(make_user):
    return make_user("viewer")[1]


@pytest.fixture
def office(client, admin_headers):
    resp = client.post("/oficinas", json={"nombre": "Main office", "ciudad": "Bogotá"}, headers=admin_headers)
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


def _layout(*equipo_ids):
    return {
        "width": 800,
        "height": 600,
        "desks": [{"id": f"d{i}", "x": 10 * i, "y": 10, "equipoId": eid} for i, eid in enumerate(equipo_ids)],
        "benches": [],
        "door": {"x": 0, "y": 0},
    }


def _new_device(client, headers, codigo):
    resp = client.post(
        "/equipos", json={"codigo_interno": codigo, "marca": "Dell", "modelo": "OptiPlex"}, headers=headers
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


# --- Offices -----------------------------------------------------------------------------------


def test_office_names_are_unique(client, admin_headers, office):
    resp = client.post("/oficinas", json={"nombre": "Main office"}, headers=admin_headers)
    assert resp.status_code == 409


def test_viewers_cannot_manage_offices(client, viewer, office):
    assert client.get("/oficinas", headers=viewer).status_code == 200
    assert client.post("/oficinas", json={"nombre": "Other"}, headers=viewer).status_code == 403
    assert client.put(f"/oficinas/{office['id']}", json={"nombre": "X"}, headers=viewer).status_code == 403
    assert client.delete(f"/oficinas/{office['id']}", headers=viewer).status_code == 403


def test_office_with_devices_cannot_be_deleted(client, admin_headers, office, device):
    client.put(f"/equipos/{device['id']}", json={"oficina_id": office["id"]}, headers=admin_headers)
    assert client.delete(f"/oficinas/{office['id']}", headers=admin_headers).status_code == 409


# --- Network fields ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    "payload",
    [{"ip": "999.1.1.1"}, {"vlan": "5000"}, {"vlan": "abc"}, {"oficina_id": 9999}],
)
def test_invalid_network_data_is_rejected(client, admin_headers, device, payload):
    resp = client.put(f"/equipos/{device['id']}", json=payload, headers=admin_headers)
    assert resp.status_code == 400


def test_office_assignment_is_recorded_in_the_history(client, admin_headers, office, device):
    resp = client.put(
        f"/equipos/{device['id']}",
        json={"oficina_id": office["id"], "ip": "10.0.0.15", "vlan": "20", "hostname": "pc-015"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["oficina_nombre"] == "Main office"
    assert (body["ip"], body["vlan"], body["hostname"]) == ("10.0.0.15", "20", "pc-015")

    detalle = client.get(f"/equipos/{device['id']}", headers=admin_headers).get_json()
    assert any("Main office" in (h["observacion"] or "") for h in detalle["historial"])


def test_devices_at_an_office_cannot_be_loaned(client, admin_headers, office, device, signature):
    client.put(f"/equipos/{device['id']}", json={"oficina_id": office["id"]}, headers=admin_headers)
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
    assert resp.status_code == 400


# --- Map layout --------------------------------------------------------------------------------


def test_layout_is_saved_and_returned(client, admin_headers, office, device):
    resp = client.put(f"/oficinas/{office['id']}/layout", json={"layout": _layout(device["id"])}, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.get_json()["layout"]["desks"][0]["equipoId"] == device["id"]


def test_layout_requires_its_fields(client, admin_headers, office):
    resp = client.put(f"/oficinas/{office['id']}/layout", json={"layout": {"width": 1}}, headers=admin_headers)
    assert resp.status_code == 400


def test_a_device_cannot_take_two_desks(client, admin_headers, office, device):
    layout = _layout(device["id"], device["id"])
    resp = client.put(f"/oficinas/{office['id']}/layout", json={"layout": layout}, headers=admin_headers)
    assert resp.status_code == 400


def test_a_device_cannot_sit_in_two_offices(client, admin_headers, office, device):
    client.put(f"/oficinas/{office['id']}/layout", json={"layout": _layout(device["id"])}, headers=admin_headers)
    other = client.post("/oficinas", json={"nombre": "Branch"}, headers=admin_headers).get_json()
    resp = client.put(f"/oficinas/{other['id']}/layout", json={"layout": _layout(device["id"])}, headers=admin_headers)
    assert resp.status_code == 409


# --- Remote remediation agent ------------------------------------------------------------------


def test_commands_need_an_enrolled_agent(client, admin_headers, device):
    resp = client.post(f"/equipos/{device['id']}/comandos", json={"comando_id": "flush_dns"}, headers=admin_headers)
    assert resp.status_code == 409


def test_only_catalog_commands_can_be_queued(client, admin_headers, device):
    client.post(f"/equipos/{device['id']}/agente-token", headers=admin_headers)
    resp = client.post(f"/equipos/{device['id']}/comandos", json={"comando_id": "format_c"}, headers=admin_headers)
    assert resp.status_code == 400


def test_agent_polls_runs_and_reports_a_command(client, admin_headers, device):
    token = client.post(f"/equipos/{device['id']}/agente-token", headers=admin_headers).get_json()["token"]
    agent = {"X-Agent-Token": token}

    queued = client.post(f"/equipos/{device['id']}/comandos", json={"comando_id": "flush_dns"}, headers=admin_headers)
    assert queued.status_code == 201
    assert queued.get_json()["estado"] == "pendiente"

    pending = client.get("/agente/comandos/pendientes", headers=agent).get_json()
    assert [c["comando_id"] for c in pending] == ["flush_dns"]
    # Delivered commands are marked in progress so the next poll does not resend them.
    assert client.get("/agente/comandos/pendientes", headers=agent).get_json() == []

    resp = client.post(
        f"/agente/comandos/{pending[0]['id']}/resultado",
        json={"estado": "completado", "resultado": "DNS cache flushed"},
        headers=agent,
    )
    assert resp.status_code == 200
    assert resp.get_json()["estado"] == "completado"

    history = client.get(f"/equipos/{device['id']}/comandos", headers=admin_headers).get_json()
    assert history[0]["resultado"] == "DNS cache flushed"
    assert client.get("/equipos/comandos/resumen", headers=admin_headers).get_json()["completado"] == 1
    # Timestamps are UTC with a "Z" suffix, so browsers do not read them as local time.
    assert (
        client.get(f"/equipos/{device['id']}", headers=admin_headers).get_json()["agente_ultimo_contacto"].endswith("Z")
    )
    assert history[0]["fecha_completado"].endswith("Z")


def test_agent_token_is_required_and_rotates(client, admin_headers, device):
    assert client.get("/agente/comandos/pendientes").status_code == 401
    old = client.post(f"/equipos/{device['id']}/agente-token", headers=admin_headers).get_json()["token"]
    client.post(f"/equipos/{device['id']}/agente-token", headers=admin_headers)
    assert client.get("/agente/comandos/pendientes", headers={"X-Agent-Token": old}).status_code == 401


def test_an_agent_cannot_report_another_devices_command(client, admin_headers, device):
    other = _new_device(client, admin_headers, "LAP-002")
    client.post(f"/equipos/{device['id']}/agente-token", headers=admin_headers)
    other_token = client.post(f"/equipos/{other['id']}/agente-token", headers=admin_headers).get_json()["token"]
    queued = client.post(
        f"/equipos/{device['id']}/comandos", json={"comando_id": "gpupdate"}, headers=admin_headers
    ).get_json()

    resp = client.post(
        f"/agente/comandos/{queued['id']}/resultado",
        json={"estado": "completado"},
        headers={"X-Agent-Token": other_token},
    )
    assert resp.status_code == 404


def test_viewers_cannot_run_commands(client, viewer, admin_headers, device):
    client.post(f"/equipos/{device['id']}/agente-token", headers=admin_headers)
    assert client.post(f"/equipos/{device['id']}/agente-token", headers=viewer).status_code == 403
    resp = client.post(f"/equipos/{device['id']}/comandos", json={"comando_id": "flush_dns"}, headers=viewer)
    assert resp.status_code == 403
    assert client.get(f"/equipos/{device['id']}/comandos", headers=viewer).status_code == 200
