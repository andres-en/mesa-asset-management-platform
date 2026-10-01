import os
from datetime import timedelta


def _database_url(url: str) -> str:
    """Pin the psycopg2 driver: bare `postgresql://` URLs resolve to psycopg 3 on SQLAlchemy 2.1+."""
    if url.startswith("postgresql://"):
        return "postgresql+psycopg2://" + url[len("postgresql://") :]
    return url


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-secret-key")
    SQLALCHEMY_DATABASE_URI = _database_url(os.environ.get("DATABASE_URL", "postgresql://mesa:mesa@db:5432/mesa"))
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-this-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)

    # El frontend recibe el JWT como cookie HttpOnly (no accesible por JS) en vez de
    # localStorage. Se acepta también vía header Authorization (sin CSRF) para
    # Postman/herramientas de testing — no reintroduce el problema original porque
    # el frontend web ya nunca coloca el token en JS.
    JWT_TOKEN_LOCATION = ["cookies", "headers"]
    JWT_ACCESS_COOKIE_NAME = "token"
    JWT_COOKIE_SECURE = os.environ.get("JWT_COOKIE_SECURE", "false").lower() == "true"
    JWT_COOKIE_SAMESITE = os.environ.get("JWT_COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_DOMAIN = os.environ.get("JWT_COOKIE_DOMAIN") or None
    JWT_COOKIE_CSRF_PROTECT = True  # doble-submit CSRF: cookie no-HttpOnly + header X-CSRF-TOKEN

    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")

    SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
    SMTP_USER = os.environ.get("SMTP_USER", "")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "")

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

    SIGNING_BASE_URL = os.environ.get("SIGNING_BASE_URL", "http://localhost:3000/firmar")
    SIGNATURE_TOKEN_EXPIRATION_HOURS = int(os.environ.get("SIGNATURE_TOKEN_EXPIRATION_HOURS", "48"))

    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "uploads/firmas")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB, suficiente para firmas PNG


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    JWT_COOKIE_SECURE = True  # en producción siempre sobre HTTPS


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = _database_url(os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:"))


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
