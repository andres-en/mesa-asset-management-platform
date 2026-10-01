from flask import Blueprint, jsonify, request

from app.services import firma_service

firma_bp = Blueprint("firma", __name__, url_prefix="/firma")


@firma_bp.get("/<token>")
def obtener_datos_firma(token):
    """[PUBLIC] Returns the loan data for a signature-link token.

    The employee opens the emailed link and the frontend calls this endpoint
    (no authentication) to render the signing page with the loan and device data.
    ---
    tags:
      - Remote signature
    parameters:
      - in: path
        name: token
        type: string
        required: true
        description: Token from the emailed link (the part after /firmar/)
    responses:
      200:
        description: Data of the loan awaiting signature
        schema:
          type: object
          properties:
            prestamo_id:
              type: integer
            nombre_empleado:
              type: string
            cargo_empleado:
              type: string
            correo_empleado:
              type: string
            fecha_entrega:
              type: string
            fecha_devolucion_estimada:
              type: string
            cargador_entregado:
              type: boolean
            observaciones_entrega:
              type: string
            equipo:
              type: object
      404:
        description: Invalid signature link
      410:
        description: The signature link has expired
    """
    prestamo = firma_service.obtener_prestamo_por_token(token)
    return jsonify(
        {
            "prestamo_id": prestamo.id,
            "nombre_empleado": prestamo.nombre_empleado,
            "cargo_empleado": prestamo.cargo_empleado,
            "correo_empleado": prestamo.correo_empleado,
            "fecha_entrega": prestamo.fecha_entrega.isoformat() if prestamo.fecha_entrega else None,
            "fecha_devolucion_estimada": (
                prestamo.fecha_devolucion_estimada.isoformat() if prestamo.fecha_devolucion_estimada else None
            ),
            "cargador_entregado": prestamo.cargador_entregado,
            "accesorios": prestamo.accesorios or [],
            "observaciones_entrega": prestamo.observaciones_entrega,
            "estado_firma": prestamo.estado_firma,
            "token_expira_at": (prestamo.firma_token_expira.isoformat() if prestamo.firma_token_expira else None),
            "equipo": prestamo.equipo.to_dict(),
        }
    )


@firma_bp.post("/<token>")
def firmar(token):
    """[PUBLIC] Stores the employee signature and completes the remote-signature flow.

    If the token is valid and not expired, stores the signature, invalidates the
    token (single use) and returns the loan summary so the frontend can show the
    confirmation page, without signing in.
    ---
    tags:
      - Remote signature
    parameters:
      - in: path
        name: token
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - firma_empleado
          properties:
            firma_empleado:
              type: string
              description: PNG image of the signature drawn in the browser, base64-encoded
    responses:
      200:
        description: Loan summary with the signature stored
      400:
        description: Missing or invalid signature
      404:
        description: Invalid signature link
      410:
        description: The signature link has expired
    """
    data = request.get_json(silent=True) or {}
    firma_base64 = data.get("firma_empleado")
    prestamo = firma_service.completar_firma_remota(token, firma_base64)
    return jsonify(prestamo.to_dict())
