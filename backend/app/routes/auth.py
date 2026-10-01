from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    unset_jwt_cookies,
)

from app.extensions import db
from app.models.token_blocklist import TokenBlocklist
from app.models.usuario import Usuario
from app.services import auth_service
from app.utils.errors import Conflicto, NoEncontrado
from app.utils.roles import requerir_admin

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.get("/google")
def google_login():
    """Returns the Google OAuth sign-in URL.
    ---
    tags:
      - Auth
    responses:
      200:
        description: URL the frontend must redirect to in order to sign in with Google
        schema:
          type: object
          properties:
            url:
              type: string
    """
    return jsonify({"url": auth_service.construir_url_login_google()})


@auth_bp.post("/callback")
def google_callback():
    """Exchanges the Google authorization code for the API's own JWT.
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - code
          properties:
            code:
              type: string
    responses:
      200:
        description: Signed in — user data in the body; the JWT is delivered as an HttpOnly cookie
      400:
        description: Missing the code parameter
      401:
        description: Invalid Google token or unauthorized user
    """
    data = request.get_json(silent=True) or {}
    code = data.get("code")
    if not code:
        return jsonify({"error": "Missing the code parameter"}), 400

    usuario = auth_service.autenticar_con_codigo(code)
    access_token = create_access_token(identity=str(usuario.id))
    response = jsonify(usuario.to_dict())
    set_access_cookies(response, access_token)
    return response


@auth_bp.get("/me")
@jwt_required()
def me():
    """Returns the current authenticated user.
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Authenticated user
      404:
        description: User not found
    """
    usuario = db.session.get(Usuario, int(get_jwt_identity()))
    if not usuario:
        raise NoEncontrado("User not found")
    return jsonify(usuario.to_dict())


@auth_bp.post("/logout")
@jwt_required()
def logout():
    """Signs out by revoking the JWT (blocklist).
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Signed out
    """
    jti = get_jwt()["jti"]
    db.session.add(TokenBlocklist(jti=jti, created_at=datetime.utcnow()))
    db.session.commit()
    response = jsonify({"mensaje": "Signed out"})
    unset_jwt_cookies(response)
    return response


# ── Gestión de usuarios ────────────────────────────────────────────────────────


@auth_bp.get("/usuarios")
@jwt_required()
def listar_usuarios():
    """Lists every registered user.
    ---
    tags:
      - Users
    security:
      - Bearer: []
    responses:
      200:
        description: User list
      403:
        description: Administrator role required
    """
    requerir_admin()
    usuarios = Usuario.query.order_by(Usuario.nombre).all()
    return jsonify([u.to_dict() for u in usuarios])


@auth_bp.post("/usuarios")
@jwt_required()
def crear_usuario():
    """Registers a new user allowed to sign in.
    ---
    tags:
      - Users
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - nombre
            - correo
          properties:
            nombre:
              type: string
            correo:
              type: string
            rol:
              type: string
              enum: [admin, viewer]
    responses:
      201:
        description: User created
      403:
        description: Administrator role required
      409:
        description: A user with that email already exists
    """
    requerir_admin()
    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip()
    correo = (data.get("correo") or "").strip().lower()
    rol = data.get("rol", "viewer")

    if not nombre or not correo:
        return jsonify({"error": "nombre and correo are required"}), 400

    if rol not in ("admin", "viewer"):
        return jsonify({"error": "rol must be admin or viewer"}), 400

    if Usuario.query.filter_by(correo=correo).first():
        raise Conflicto("A user with that email already exists")

    usuario = Usuario(nombre=nombre, correo=correo, rol=rol, activo=True)
    db.session.add(usuario)
    db.session.commit()
    return jsonify(usuario.to_dict()), 201


@auth_bp.delete("/usuarios/<int:usuario_id>")
@jwt_required()
def eliminar_usuario(usuario_id):
    """Deletes (deactivates) a user.
    ---
    tags:
      - Users
    security:
      - Bearer: []
    parameters:
      - in: path
        name: usuario_id
        type: integer
        required: true
    responses:
      200:
        description: User deleted
      403:
        description: Administrator role required
      404:
        description: User not found
    """
    requerir_admin()
    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        raise NoEncontrado("User not found")

    current_id = int(get_jwt_identity())
    if usuario.id == current_id:
        return jsonify({"error": "You cannot delete yourself"}), 400

    db.session.delete(usuario)
    db.session.commit()
    return jsonify({"mensaje": "User deleted successfully"})
