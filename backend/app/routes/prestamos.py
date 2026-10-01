from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services import pdf_service, prestamo_service
from app.utils.roles import admin_required

prestamos_bp = Blueprint("prestamos", __name__, url_prefix="/prestamos")


@prestamos_bp.get("")
@jwt_required()
def listar():
    """Lists loans.
    ---
    tags:
      - Loans
    security:
      - Bearer: []
    parameters:
      - in: query
        name: estado
        type: string
        required: false
        description: Filter by estado_prestamo (Activo, Cerrado)
    responses:
      200:
        description: Loan list
    """
    estado = request.args.get("estado")
    prestamos = prestamo_service.listar_prestamos(estado=estado)
    return jsonify([p.to_dict() for p in prestamos])


@prestamos_bp.get("/<int:prestamo_id>")
@jwt_required()
def obtener(prestamo_id):
    """Returns the details of a loan.
    ---
    tags:
      - Loans
    security:
      - Bearer: []
    parameters:
      - in: path
        name: prestamo_id
        type: integer
        required: true
    responses:
      200:
        description: Loan details
      404:
        description: Loan not found
    """
    prestamo = prestamo_service.obtener_prestamo(prestamo_id)
    data = prestamo.to_dict()
    if prestamo.creado_por_usuario:
        data["creado_por"] = {
            "id": prestamo.creado_por_usuario.id,
            "nombre": prestamo.creado_por_usuario.nombre,
        }
    data["created_at"] = prestamo.created_at.isoformat() if prestamo.created_at else None
    return jsonify(data)


@prestamos_bp.post("")
@jwt_required()
@admin_required
def crear():
    """Creates a new device loan.

    When `firma_remota` is true, `firma_empleado` is not sent: an expiring
    signature link is generated so the employee can sign remotely (see
    /firma/{token}). By default the link is emailed; when `enviar_email` is
    false it is only generated and returned as `link_firma` to share manually.
    ---
    tags:
      - Loans
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - equipo_id
            - nombre_empleado
            - correo_empleado
            - fecha_entrega
            - firma_it
          properties:
            equipo_id:
              type: integer
            nombre_empleado:
              type: string
            cargo_empleado:
              type: string
            correo_empleado:
              type: string
            cargador_entregado:
              type: boolean
            fecha_entrega:
              type: string
              format: date
            fecha_devolucion_estimada:
              type: string
              format: date
            observaciones_entrega:
              type: string
            firma_it:
              type: string
              description: PNG image of the IT staff signature, base64-encoded
            firma_remota:
              type: boolean
              description: When true, firma_empleado is skipped and a signature link is emailed
            firma_empleado:
              type: string
              description: PNG image of the employee signature, base64-encoded (in-person signature). Required unless firma_remota is true
            enviar_email:
              type: boolean
              description: Only when firma_remota is true. If false, no email is sent and the link is returned as link_firma to share manually. Defaults to true.
    responses:
      403:
        description: Administrator role required (viewers are read-only)
      201:
        description: Loan created
      400:
        description: Invalid data
      404:
        description: Device not found
    """
    data = request.get_json(silent=True) or {}
    usuario_id = int(get_jwt_identity())
    prestamo, link = prestamo_service.crear_prestamo(data, usuario_id)
    resultado = prestamo.to_dict()
    if link:
        resultado["link_firma"] = link
    return jsonify(resultado), 201


@prestamos_bp.post("/<int:prestamo_id>/reenviar-firma")
@jwt_required()
@admin_required
def reenviar_firma(prestamo_id):
    """Regenerates the remote-signature link (new token and expiry).

    Re-sends the email by default. When `enviar_email` is false the link is
    only regenerated and returned, to share manually without an email.
    ---
    tags:
      - Loans
    security:
      - Bearer: []
    parameters:
      - in: path
        name: prestamo_id
        type: integer
        required: true
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            enviar_email:
              type: boolean
              description: If false, no email is sent. Defaults to true.
    responses:
      403:
        description: Administrator role required (viewers are read-only)
      200:
        description: Resend result
        schema:
          type: object
          properties:
            enviado:
              type: boolean
            link:
              type: string
      400:
        description: The loan has no pending remote signature
      404:
        description: Loan not found
    """
    data = request.get_json(silent=True) or {}
    enviar_email = bool(data.get("enviar_email", True))
    usuario_id = int(get_jwt_identity())
    resultado = prestamo_service.reenviar_firma(prestamo_id, usuario_id, enviar_email=enviar_email)
    return jsonify(resultado)


@prestamos_bp.put("/<int:prestamo_id>/devolver")
@jwt_required()
@admin_required
def devolver(prestamo_id):
    """Registers the return of an active loan.
    ---
    tags:
      - Loans
    security:
      - Bearer: []
    parameters:
      - in: path
        name: prestamo_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - estado_equipo_devolucion
          properties:
            fecha_devolucion_real:
              type: string
              format: date
            estado_equipo_devolucion:
              type: string
              enum: [Bueno, "Con daños", Incompleto, "Requiere mantenimiento"]
            observaciones_devolucion:
              type: string
    responses:
      403:
        description: Administrator role required (viewers are read-only)
      200:
        description: Loan closed and device updated
      400:
        description: Loan already closed, remote signature pending, or invalid condition
      404:
        description: Loan not found
    """
    data = request.get_json(silent=True) or {}
    usuario_id = int(get_jwt_identity())
    prestamo = prestamo_service.registrar_devolucion(prestamo_id, data, usuario_id)
    return jsonify(prestamo.to_dict())


@prestamos_bp.get("/<int:prestamo_id>/pdf")
@jwt_required()
def descargar_pdf(prestamo_id):
    """Generates and downloads the PDF loan receipt.
    ---
    tags:
      - Loans
    security:
      - Bearer: []
    parameters:
      - in: path
        name: prestamo_id
        type: integer
        required: true
    produces:
      - application/pdf
    responses:
      200:
        description: PDF receipt file
      400:
        description: The loan does not have the employee signature yet
      404:
        description: Loan not found
    """
    prestamo = prestamo_service.obtener_prestamo(prestamo_id)
    buffer = pdf_service.generar_acta_pdf(prestamo)
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"acta_prestamo_{prestamo.id}.pdf",
    )
