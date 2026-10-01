import logging
import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from flask import current_app

logger = logging.getLogger(__name__)

# Brand palette (see my-app/src/theme/theme.js).
_NAVY = "#0F172A"
_BLUE = "#1176EF"

# White-lettering logo for the navy email header, embedded inline (CID) so it is shown
# without the email client having to fetch remote images.
_LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "mesa-logo-light.png"
_LOGO_CID = "mesa-logo"
_LOGO_IMG = (
    f'<img src="cid:{_LOGO_CID}" alt="Mesa — Asset Management Platform" height="40"'
    ' style="display:block;height:40px;width:auto;border:0;">'
)


def _with_gb(val):
    """Agrega 'GB' si el valor es solo un número (ej: '16' → '16 GB')."""
    if not val:
        return "—"
    s = str(val).strip()
    return f"{s} GB" if s.replace(".", "").isdigit() else s


def _row(label, value):
    return f"""
    <tr>
      <td style="padding:10px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;width:38%;vertical-align:top;">{label}</td>
      <td style="padding:10px 0 10px 16px;color:{_NAVY};font-size:13px;font-weight:500;border-bottom:1px solid #f3f4f6;">{value}</td>
    </tr>"""


def _section(title, rows_html):
    return f"""
    <div style="margin-bottom:28px;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">{title}</p>
      <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        {rows_html}
      </table>
    </div>"""


def _build_html_solicitud_firma(nombre_empleado, prestamo, equipo, link, fecha_entrega):
    horas_vigencia = current_app.config.get("SIGNATURE_TOKEN_EXPIRATION_HOURS", 48)
    accesorios = prestamo.accesorios or []
    accesorios_txt = ", ".join(accesorios) if accesorios else "None"
    cargador_txt = "Yes" if prestamo.cargador_entregado else "No"
    dev_estimada = prestamo.fecha_devolucion_estimada.isoformat() if prestamo.fecha_devolucion_estimada else "—"

    equipo_rows = (
        _row(
            "Internal code",
            f"<span style='font-family:monospace;background:#f9fafb;padding:2px 6px;border-radius:4px;font-size:12px;border:1px solid #e5e7eb;'>{equipo.codigo_interno}</span>",
        )
        + _row("Brand / Model", f"{equipo.marca} {equipo.modelo}")
        + (_row("Type", equipo.tipo) if equipo.tipo else "")
        + (_row("Processor", equipo.procesador) if equipo.procesador else "")
        + (_row("RAM", _with_gb(equipo.ram)) if equipo.ram else "")
        + (_row("Storage", _with_gb(equipo.almacenamiento)) if equipo.almacenamiento else "")
    )

    accesorio_rows = _row("Charger", cargador_txt) + _row("Other accessories", accesorios_txt)

    fecha_rows = _row("Hand-over date", fecha_entrega) + _row("Expected return", dev_estimada)

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

      <!-- Header -->
      <tr><td style="background:{_NAVY};border-radius:8px 8px 0 0;padding:24px 32px;">
        {_LOGO_IMG}
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

        <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:{_NAVY};">Hand-over receipt signature</p>
        <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
          Hi <strong style="color:#374151;">{nombre_empleado}</strong>, the IT team registered a device hand-over in your name.
          Please review the details and sign the receipt to confirm you received it.
        </p>

        {_section("Assigned device", equipo_rows)}
        {_section("Accessories handed over", accesorio_rows)}
        {_section("Dates", fecha_rows)}

        <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">
          To sign the receipt, click the button below:
        </p>

        <!-- CTA -->
        <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr><td>
            <a href="{link}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;background:{_BLUE};color:#ffffff;
                      font-size:14px;font-weight:600;text-decoration:none;
                      padding:12px 28px;border-radius:6px;letter-spacing:0.01em;">
              Sign hand-over receipt →
            </a>
          </td></tr>
        </table>

        <!-- Fallback link -->
        <div style="border-top:1px solid #f3f4f6;padding-top:16px;">
          <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
            Button not working? Copy this link into your browser:
          </p>
          <p style="margin:0;font-size:12px;word-break:break-all;">
            <a href="{link}" style="color:{_BLUE};text-decoration:none;">{link}</a>
          </p>
        </div>

      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 32px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
          This link can only be used once and expires in {horas_vigencia} hours.<br>
          If you were not expecting this email, you can safely ignore it.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>

</body>
</html>"""


def _build_html_firma_completada(prestamo, equipo):
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
      <tr><td style="background:{_NAVY};border-radius:8px 8px 0 0;padding:20px 28px;">
        {_LOGO_IMG}
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:{_NAVY};">Receipt signed</p>
        <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">
          <strong style="color:#374151;">{prestamo.nombre_empleado}</strong> signed the hand-over receipt for device
          <strong style="color:#374151;">{equipo.codigo_interno}</strong>.
        </p>
        <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 16px;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e5e7eb;">Device</td>
            <td style="padding:10px 16px;font-size:13px;color:{_NAVY};font-weight:500;border-bottom:1px solid #e5e7eb;">{equipo.marca} {equipo.modelo} — {equipo.codigo_interno}</td>
          </tr>
          <tr>
            <td style="padding:10px 16px;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e5e7eb;">Recipient</td>
            <td style="padding:10px 16px;font-size:13px;color:{_NAVY};border-bottom:1px solid #e5e7eb;">{prestamo.correo_empleado}</td>
          </tr>
          <tr>
            <td style="padding:10px 16px;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Loan #</td>
            <td style="padding:10px 16px;font-size:13px;color:{_NAVY};">{prestamo.id}</td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
          Open the loan in Mesa to download the PDF receipt.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _enviar(destinatario, asunto, html):
    smtp_host = current_app.config.get("SMTP_HOST")
    smtp_port = current_app.config.get("SMTP_PORT")
    smtp_user = current_app.config.get("SMTP_USER")
    smtp_password = current_app.config.get("SMTP_PASSWORD")
    from_email = current_app.config.get("SMTP_FROM_EMAIL") or smtp_user

    if not smtp_host or not smtp_user or not smtp_password:
        logger.warning("SMTP not configured; '%s' was not sent to %s", asunto, destinatario)
        return False

    # multipart/related: the HTML body plus the inline logo it references by CID.
    mensaje = MIMEMultipart("related")
    mensaje["Subject"] = asunto
    mensaje["From"] = from_email
    mensaje["To"] = destinatario
    cuerpo = MIMEMultipart("alternative")
    cuerpo.attach(MIMEText(html, "html"))
    mensaje.attach(cuerpo)
    if _LOGO_PATH.is_file():
        logo = MIMEImage(_LOGO_PATH.read_bytes(), _subtype="png")
        logo.add_header("Content-ID", f"<{_LOGO_CID}>")
        logo.add_header("Content-Disposition", "inline", filename="mesa-logo.png")
        mensaje.attach(logo)

    try:
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, [destinatario], mensaje.as_string())
        logger.info("Email '%s' sent to %s", asunto, destinatario)
        return True
    except Exception:
        logger.exception("Error sending email '%s' to %s", asunto, destinatario)
        return False


def enviar_correo_firma(prestamo, equipo, link):
    html = _build_html_solicitud_firma(
        prestamo.nombre_empleado, prestamo, equipo, link, prestamo.fecha_entrega.isoformat()
    )
    return _enviar(prestamo.correo_empleado, "Equipment hand-over receipt — signature required", html)


def enviar_correo_firma_completada(prestamo, equipo, creador):
    if not creador or not creador.correo:
        logger.warning("Loan %s has no creator user with an email", prestamo.id)
        return False
    html = _build_html_firma_completada(prestamo, equipo)
    return _enviar(creador.correo, f"{prestamo.nombre_empleado} signed the receipt — {equipo.codigo_interno}", html)
