from urllib.parse import urlencode

import requests
from flask import current_app
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.extensions import db
from app.models.usuario import Usuario
from app.utils.errors import NoAutorizado

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def construir_url_login_google():
    params = {
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def autenticar_con_codigo(code: str) -> Usuario:
    """Intercambia el authorization code de Google por un id_token, lo valida
    y devuelve el Usuario correspondiente si está activo en la tabla usuarios."""
    token_response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": current_app.config["GOOGLE_CLIENT_ID"],
            "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
            "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if token_response.status_code != 200:
        raise NoAutorizado("Could not validate the Google authentication")

    id_token_jwt = token_response.json().get("id_token")
    if not id_token_jwt:
        raise NoAutorizado("Google response without id_token")

    try:
        claims = google_id_token.verify_oauth2_token(
            id_token_jwt,
            google_requests.Request(),
            current_app.config["GOOGLE_CLIENT_ID"],
        )
    except Exception:
        raise NoAutorizado("Invalid Google token") from None

    correo = claims.get("email")
    usuario = Usuario.query.filter_by(correo=correo, activo=True).first()
    if not usuario:
        raise NoAutorizado("Your account is not authorized to access Mesa")

    foto_url = claims.get("picture")
    if foto_url and usuario.foto_url != foto_url:
        usuario.foto_url = foto_url
        db.session.commit()

    return usuario
