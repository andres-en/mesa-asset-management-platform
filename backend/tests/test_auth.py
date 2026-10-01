"""Authentication (JWT in HttpOnly cookie + CSRF double submit, or Bearer header) and user management."""

from __future__ import annotations

import pytest

from app.models.usuario import Usuario


@pytest.mark.parametrize("path", ["/auth/me", "/equipos", "/prestamos", "/historial", "/dashboard"])
def test_protected_endpoints_require_a_token(client, path):
    assert client.get(path).status_code == 401


def test_health_is_public(client):
    assert client.get("/health").get_json() == {"status": "ok"}


def test_me_with_bearer_token(client, make_user):
    user, headers = make_user("admin", correo="it@example.com")
    body = client.get("/auth/me", headers=headers).get_json()
    assert body["correo"] == "it@example.com"
    assert body["rol"] == "admin"


def _cookie(client, name):
    cookie = client.get_cookie(name)
    return cookie.value if cookie else None


@pytest.fixture
def signed_in_with_google(client, make_user, monkeypatch):
    """Simulates the OAuth code exchange and signs the browser in through /auth/callback."""
    user, _ = make_user("admin", correo="google-user@example.com")
    monkeypatch.setattr("app.services.auth_service.autenticar_con_codigo", lambda code: user)
    resp = client.post("/auth/callback", json={"code": "auth-code-from-google"})
    assert resp.status_code == 200
    return user


def test_google_callback_sets_an_httponly_jwt_cookie_and_a_csrf_cookie(client, signed_in_with_google):
    assert _cookie(client, "token")
    assert _cookie(client, "csrf_access_token")
    set_cookie_headers = " ".join(client.get("/health").headers.getlist("Set-Cookie"))  # no cookies re-sent
    assert "token=" not in set_cookie_headers
    assert client.get("/auth/me").get_json()["correo"] == "google-user@example.com"


def test_callback_requires_a_code(client):
    resp = client.post("/auth/callback", json={})
    assert resp.status_code == 400


def test_state_changing_cookie_requests_need_the_csrf_header(client, signed_in_with_google):
    # Double-submit CSRF: a cross-site form can send the cookie, but cannot read it to set the header.
    assert client.post("/auth/logout").status_code == 401

    csrf = _cookie(client, "csrf_access_token")
    assert client.post("/auth/logout", headers={"X-CSRF-TOKEN": csrf}).status_code == 200


def test_logout_revokes_the_token(client, make_user):
    _, headers = make_user("admin")
    assert client.post("/auth/logout", headers=headers).status_code == 200
    # The token itself is still unexpired, but it is now in the blocklist.
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_only_admins_manage_users(client, make_user):
    _, viewer = make_user("viewer")
    assert client.get("/auth/usuarios", headers=viewer).status_code == 403
    assert (
        client.post("/auth/usuarios", json={"nombre": "X", "correo": "x@example.com"}, headers=viewer).status_code
        == 403
    )


def test_admin_creates_users_and_validates_input(client, admin_headers):
    created = client.post(
        "/auth/usuarios", json={"nombre": "Ana", "correo": "ana@example.com", "rol": "admin"}, headers=admin_headers
    )
    assert created.status_code == 201
    assert Usuario.query.filter_by(correo="ana@example.com").one().activo is True

    assert client.post("/auth/usuarios", json={"nombre": "Ana"}, headers=admin_headers).status_code == 400
    bad_role = client.post(
        "/auth/usuarios", json={"nombre": "B", "correo": "b@example.com", "rol": "root"}, headers=admin_headers
    )
    assert bad_role.status_code == 400
    duplicate = client.post(
        "/auth/usuarios", json={"nombre": "Ana", "correo": "ana@example.com"}, headers=admin_headers
    )
    assert duplicate.status_code == 409


def test_admins_cannot_delete_themselves(client, make_user):
    me, headers = make_user("admin")
    resp = client.delete(f"/auth/usuarios/{me.id}", headers=headers)
    assert resp.status_code == 400
    assert resp.get_json() == {"error": "You cannot delete yourself"}
