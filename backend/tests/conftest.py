"""Test infrastructure.

Runs on SQLite by default; set TEST_DATABASE_URL to run the same suite against
PostgreSQL (CI does). Outgoing email is captured in memory and signature files
are written to a temporary folder.
"""

from __future__ import annotations

import base64
import io
import os
import tempfile
from pathlib import Path

# Settings are read at import time, so configure the environment first.
_TMP = Path(tempfile.mkdtemp(prefix="mesa-tests-"))
os.environ.setdefault("TEST_DATABASE_URL", f"sqlite:///{(_TMP / 'test.db').as_posix()}")
os.environ["SIGNING_BASE_URL"] = "http://frontend.test/firmar"

import pytest  # noqa: E402
from flask_jwt_extended import create_access_token  # noqa: E402
from PIL import Image  # noqa: E402

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models.usuario import Usuario  # noqa: E402


@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)  # the app writes logs/ relative to the working directory
    app = create_app("testing")
    app.config.update(UPLOAD_FOLDER=str(tmp_path / "firmas"), SIGNATURE_TOKEN_EXPIRATION_HOURS=48)
    with app.app_context():
        db.drop_all()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def outbox(monkeypatch):
    """Captures the emails the app would send (recipient, subject, html)."""
    sent: list[dict] = []

    def fake_send(destinatario, asunto, html):
        sent.append({"to": destinatario, "subject": asunto, "html": html})
        return True

    monkeypatch.setattr("app.services.email_service._enviar", fake_send)
    return sent


@pytest.fixture
def make_user(app):
    """Create an active user; returns `(user, auth_headers)` using a Bearer JWT."""

    def _make(rol: str = "admin", correo: str | None = None, activo: bool = True):
        user = Usuario(
            nombre=f"{rol} tester", correo=correo or f"{rol}{Usuario.query.count()}@example.com", rol=rol, activo=activo
        )
        db.session.add(user)
        db.session.commit()
        token = create_access_token(identity=str(user.id))
        return user, {"Authorization": f"Bearer {token}"}

    return _make


@pytest.fixture
def admin_headers(make_user):
    return make_user("admin")[1]


@pytest.fixture
def signature() -> str:
    """A small valid PNG as a data URL, like the one the signature canvas sends."""
    buf = io.BytesIO()
    Image.new("RGB", (40, 20), "white").save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@pytest.fixture
def device(client, admin_headers):
    resp = client.post(
        "/equipos",
        json={"codigo_interno": "LAP-001", "tipo": "Laptop", "marca": "Dell", "modelo": "Latitude 5440"},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()
