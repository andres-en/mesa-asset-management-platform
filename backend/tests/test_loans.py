"""Loan lifecycle: hand-over (in-person or remote signature), PDF receipt and return."""

from __future__ import annotations

import email
from datetime import datetime, timedelta

import pytest

from app.extensions import db
from app.models.historial_estado import HistorialEstado
from app.models.prestamo import Prestamo


def _loan_payload(device, signature, **overrides):
    payload = {
        "equipo_id": device["id"],
        "nombre_empleado": "Laura Gomez",
        "cargo_empleado": "Analyst",
        "correo_empleado": "laura@example.com",
        "fecha_entrega": "2026-09-01",
        "fecha_devolucion_estimada": "2026-12-01",
        "cargador_entregado": True,
        "accesorios": ["Mouse", "Headphones"],
        "firma_it": signature,
    }
    payload.update(overrides)
    return payload


def _device_status(client, headers, device_id):
    return client.get(f"/equipos/{device_id}", headers=headers).get_json()["estado"]


def _token_from(link: str) -> str:
    return link.rsplit("/", 1)[-1]


# --- In-person signature --------------------------------------------------------


def test_in_person_loan_marks_the_device_as_on_loan(client, admin_headers, device, signature):
    resp = client.post(
        "/prestamos", json=_loan_payload(device, signature, firma_empleado=signature), headers=admin_headers
    )
    assert resp.status_code == 201, resp.get_json()
    loan = resp.get_json()
    assert loan["estado_firma"] == "completo"
    assert loan["estado_prestamo"] == "Activo"
    assert _device_status(client, admin_headers, device["id"]) == "Prestado"
    history = HistorialEstado.query.filter_by(equipo_id=device["id"]).all()
    assert [(h.estado_anterior, h.estado_nuevo) for h in history] == [("Disponible", "Prestado")]


def test_a_device_on_loan_cannot_be_loaned_again(client, admin_headers, device, signature):
    client.post("/prestamos", json=_loan_payload(device, signature, firma_empleado=signature), headers=admin_headers)
    again = client.post(
        "/prestamos", json=_loan_payload(device, signature, firma_empleado=signature), headers=admin_headers
    )
    assert again.status_code == 400
    assert again.get_json()["error"] == "The device is not available for loan"


def test_either_the_employee_signs_now_or_a_remote_signature_is_requested(client, admin_headers, device, signature):
    resp = client.post("/prestamos", json=_loan_payload(device, signature), headers=admin_headers)
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "Capture the employee signature or set firma_remota=true"


@pytest.mark.parametrize(
    "bad_signature, error",
    [
        ("not base64 at all!!", "The signature is not valid base64"),
        ("aGVsbG8gd29ybGQ=", "The signature is not a valid image"),
    ],
)
def test_signatures_must_be_real_images(client, admin_headers, device, bad_signature, error):
    resp = client.post(
        "/prestamos", json=_loan_payload(device, bad_signature, firma_empleado=bad_signature), headers=admin_headers
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"] == error


def test_signed_loans_produce_a_pdf_receipt(client, admin_headers, device, signature):
    loan = client.post(
        "/prestamos", json=_loan_payload(device, signature, firma_empleado=signature), headers=admin_headers
    ).get_json()
    pdf = client.get(f"/prestamos/{loan['id']}/pdf", headers=admin_headers)
    assert pdf.status_code == 200
    assert pdf.mimetype == "application/pdf"
    assert pdf.data.startswith(b"%PDF")


# --- Remote signature -----------------------------------------------------------


@pytest.fixture
def remote_loan(client, admin_headers, device, signature, outbox):
    resp = client.post("/prestamos", json=_loan_payload(device, signature, firma_remota=True), headers=admin_headers)
    assert resp.status_code == 201, resp.get_json()
    body = resp.get_json()
    return {"id": body["id"], "link": body["link_firma"], "token": _token_from(body["link_firma"])}


def test_remote_loan_emails_a_single_use_signing_link(remote_loan, outbox):
    assert remote_loan["link"].startswith("http://frontend.test/firmar/")
    assert [m["to"] for m in outbox] == ["laura@example.com"]
    assert remote_loan["link"] in outbox[0]["html"]


def test_only_the_token_hash_is_stored(remote_loan):
    stored = db.session.get(Prestamo, remote_loan["id"]).firma_token_hash
    assert stored and stored != remote_loan["token"]
    assert len(stored) == 64  # sha256 hex digest


def test_pdf_is_not_available_until_the_employee_signs(client, admin_headers, remote_loan):
    resp = client.get(f"/prestamos/{remote_loan['id']}/pdf", headers=admin_headers)
    assert resp.status_code == 400


def test_employee_signs_through_the_public_link(client, remote_loan, signature, outbox):
    public = client.get(f"/firma/{remote_loan['token']}")
    assert public.status_code == 200
    assert public.get_json()["nombre_empleado"] == "Laura Gomez"

    signed = client.post(f"/firma/{remote_loan['token']}", json={"firma_empleado": signature})
    assert signed.status_code == 200
    assert signed.get_json()["estado_firma"] == "completo"
    # The IT user who created the loan is notified.
    assert outbox[-1]["subject"].startswith("Laura Gomez signed the receipt")

    # Single use: the same link no longer works.
    assert client.get(f"/firma/{remote_loan['token']}").status_code == 404
    assert client.post(f"/firma/{remote_loan['token']}", json={"firma_empleado": signature}).status_code == 404


def test_unknown_tokens_are_rejected(client):
    assert client.get("/firma/not-a-real-token").status_code == 404


def test_expired_links_answer_410_gone(client, remote_loan):
    loan = db.session.get(Prestamo, remote_loan["id"])
    loan.firma_token_expira = datetime.utcnow() - timedelta(minutes=1)
    db.session.commit()
    resp = client.get(f"/firma/{remote_loan['token']}")
    assert resp.status_code == 410
    assert "expired" in resp.get_json()["error"]


def test_resending_rotates_the_link(client, admin_headers, remote_loan, outbox):
    resp = client.post(
        f"/prestamos/{remote_loan['id']}/reenviar-firma", json={"enviar_email": False}, headers=admin_headers
    )
    assert resp.status_code == 200
    new_token = _token_from(resp.get_json()["link"])
    assert new_token != remote_loan["token"]
    assert client.get(f"/firma/{remote_loan['token']}").status_code == 404
    assert client.get(f"/firma/{new_token}").status_code == 200
    assert len(outbox) == 1  # enviar_email=False: link only, no new email


def test_return_is_blocked_while_the_remote_signature_is_pending(client, admin_headers, remote_loan):
    resp = client.put(
        f"/prestamos/{remote_loan['id']}/devolver", json={"estado_equipo_devolucion": "Bueno"}, headers=admin_headers
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "The return cannot be registered while the remote signature is pending"


# --- Return ---------------------------------------------------------------------


@pytest.mark.parametrize("condition, device_status", [("Bueno", "Disponible"), ("Con daños", "Mantenimiento")])
def test_return_closes_the_loan_and_routes_the_device(
    client, admin_headers, device, signature, condition, device_status
):
    loan = client.post(
        "/prestamos", json=_loan_payload(device, signature, firma_empleado=signature), headers=admin_headers
    ).get_json()
    resp = client.put(
        f"/prestamos/{loan['id']}/devolver", json={"estado_equipo_devolucion": condition}, headers=admin_headers
    )
    assert resp.status_code == 200
    assert resp.get_json()["estado_prestamo"] == "Cerrado"
    assert _device_status(client, admin_headers, device["id"]) == device_status

    twice = client.put(
        f"/prestamos/{loan['id']}/devolver", json={"estado_equipo_devolucion": condition}, headers=admin_headers
    )
    assert twice.status_code == 400
    assert twice.get_json()["error"] == "This loan is already closed"


def test_return_condition_must_be_a_known_value(client, admin_headers, device, signature):
    loan = client.post(
        "/prestamos", json=_loan_payload(device, signature, firma_empleado=signature), headers=admin_headers
    ).get_json()
    resp = client.put(
        f"/prestamos/{loan['id']}/devolver", json={"estado_equipo_devolucion": "Perfect"}, headers=admin_headers
    )
    assert resp.status_code == 400


def test_loans_can_be_filtered_by_status(client, admin_headers, device, signature):
    loan = client.post(
        "/prestamos", json=_loan_payload(device, signature, firma_empleado=signature), headers=admin_headers
    ).get_json()
    assert [p["id"] for p in client.get("/prestamos?estado=Activo", headers=admin_headers).get_json()] == [loan["id"]]
    assert client.get("/prestamos?estado=Cerrado", headers=admin_headers).get_json() == []


def test_invalid_dates_are_a_validation_error_not_a_server_error(client, admin_headers, device, signature):
    payload = _loan_payload(device, signature, firma_empleado=signature, fecha_entrega="2026-13-45")
    resp = client.post("/prestamos", json=payload, headers=admin_headers)
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "fecha_entrega must be a date in YYYY-MM-DD format"


# --- Email delivery -------------------------------------------------------------


def test_signing_emails_embed_the_brand_logo_inline(app, monkeypatch):
    """The logo travels inside the message (CID), so clients show it without loading remote images."""
    sent = []

    class FakeSMTP:
        def __init__(self, host, port):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def login(self, user, password):
            pass

        def sendmail(self, sender, recipients, message):
            sent.append(message)

    from app.services import email_service

    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL", FakeSMTP)
    app.config.update(SMTP_HOST="smtp.test", SMTP_PORT=465, SMTP_USER="it@example.com", SMTP_PASSWORD="x")

    with app.app_context():
        assert email_service._enviar("laura@example.com", "Subject", f"<p>{email_service._LOGO_IMG}</p>")

    (raw,) = sent
    message = email.message_from_string(raw)
    assert message.get_content_type() == "multipart/related"
    parts = {part.get_content_type(): part for part in message.walk()}
    assert parts["image/png"]["Content-ID"] == "<mesa-logo>"
    assert 'src="cid:mesa-logo"' in parts["text/html"].get_payload(decode=True).decode("utf-8")
