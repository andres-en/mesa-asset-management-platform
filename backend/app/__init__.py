import logging
import os
from logging.handlers import RotatingFileHandler

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from app.config import config_by_name
from app.extensions import cors, db, jwt, migrate, swagger
from app.utils.errors import register_error_handlers


def validar_secrets_produccion():
    faltantes = [k for k in ("SECRET_KEY", "JWT_SECRET_KEY") if not os.environ.get(k)]
    if faltantes:
        raise RuntimeError(f"Required environment variables missing in production: {', '.join(faltantes)}")


def configurar_logging(app):
    os.makedirs("logs", exist_ok=True)

    formato = logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")

    file_handler = RotatingFileHandler("logs/mesa.log", maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8")
    file_handler.setFormatter(formato)
    file_handler.setLevel(logging.INFO)

    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)


def create_app(config_name=None):
    config_name = config_name or os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    if config_name == "production":
        validar_secrets_produccion()

    configurar_logging(app)

    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    app.config["SWAGGER"] = {
        "title": "Mesa API",
        "description": "IT equipment loan and inventory management API",
        "version": "1.0.0",
        "uiversion": 3,
    }

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )
    swagger.init_app(app)

    register_error_handlers(app)
    register_jwt_callbacks(app)
    register_blueprints(app)
    register_cli(app)

    return app


def register_blueprints(app):
    from app.routes.agente import agente_bp
    from app.routes.auth import auth_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.equipos import equipos_bp
    from app.routes.firma import firma_bp
    from app.routes.historial import historial_bp
    from app.routes.oficinas import oficinas_bp
    from app.routes.prestamos import prestamos_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(equipos_bp)
    app.register_blueprint(oficinas_bp)
    app.register_blueprint(prestamos_bp)
    app.register_blueprint(firma_bp)
    app.register_blueprint(historial_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(agente_bp)

    @app.get("/health")
    def health():
        """Service health check.
        ---
        tags:
          - System
        responses:
          200:
            description: The service is up
        """
        return {"status": "ok"}


def register_jwt_callbacks(app):
    from app.models.token_blocklist import TokenBlocklist

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        return TokenBlocklist.query.filter_by(jti=jti).first() is not None


def register_cli(app):
    import click

    @app.cli.command("seed-admin")
    @click.argument("correo")
    @click.argument("nombre", required=False)
    def seed_admin(correo, nombre):
        """Crea/activa un usuario administrador (IT) por correo.

        Uso: flask seed-admin <correo> [nombre]
        """
        from app.extensions import db
        from app.models.usuario import Usuario

        nombre = nombre or correo.split("@")[0]

        usuario = Usuario.query.filter_by(correo=correo).first()
        if usuario:
            usuario.activo = True
            print(f"User {correo} already existed, marked as active.")
        else:
            usuario = Usuario(nombre=nombre, correo=correo, rol="admin", activo=True)
            db.session.add(usuario)
            print(f"User {correo} created as an active admin.")

        db.session.commit()
