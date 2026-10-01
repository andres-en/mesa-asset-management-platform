class AppError(Exception):
    """Excepción base de errores de negocio, mapeada a una respuesta HTTP."""

    status_code = 400

    def __init__(self, message, status_code=None, payload=None):
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload or {}

    def to_dict(self):
        return {"error": self.message, **self.payload}


class NoEncontrado(AppError):
    status_code = 404


class Conflicto(AppError):
    status_code = 409


class NoAutorizado(AppError):
    status_code = 401


class Prohibido(AppError):
    status_code = 403


class TokenInvalido(AppError):
    status_code = 410


def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(err):
        return err.to_dict(), err.status_code

    @app.errorhandler(404)
    def handle_404(err):
        return {"error": "Resource not found"}, 404

    @app.errorhandler(405)
    def handle_405(err):
        return {"error": "Method not allowed"}, 405

    @app.errorhandler(500)
    def handle_500(err):
        app.logger.exception("Unhandled internal error")
        return {"error": "Internal server error"}, 500
