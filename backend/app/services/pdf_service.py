import os
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.utils.errors import AppError

# Display labels for the condition-on-return values stored by the API (see models/prestamo.py).
CONDICION_DEVOLUCION_LABEL = {
    "Bueno": "Good",
    "Con daños": "Damaged",
    "Incompleto": "Incomplete",
    "Requiere mantenimiento": "Needs maintenance",
}


def _with_gb(val):
    """Agrega 'GB' si el valor es solo un número (ej: '16' → '16 GB')."""
    if not val:
        return "—"
    s = str(val).strip()
    return f"{s} GB" if s.replace(".", "").isdigit() else s


# Paleta (brand: navy #0F172A, blue #1176EF)
_BLACK = colors.HexColor("#0F172A")
_BLUE = colors.HexColor("#1176EF")
_GRAY = colors.HexColor("#6b7280")
_LGRAY = colors.HexColor("#f3f4f6")
_BORDER = colors.HexColor("#e5e7eb")
_MUTED = colors.HexColor("#9ca3af")
_WHITE = colors.white

# Navy-lettering logo, for the white page.
_LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "mesa-logo-dark.png")
_LOGO_ASPECT = 833 / 239  # width / height of the artwork

PAGE_W, PAGE_H = letter
MARGIN = 2 * cm


def _logo(height=1.0 * cm):
    """Brand logo for the receipt header; falls back to the name if the file is missing."""
    if os.path.isfile(_LOGO_PATH):
        return Image(_LOGO_PATH, width=height * _LOGO_ASPECT, height=height, hAlign="LEFT")
    return Paragraph("Mesa", ParagraphStyle("logo", fontSize=12, fontName="Helvetica-Bold", textColor=_BLACK))


def _styles():
    base = getSampleStyleSheet()
    return {
        "doc_title": ParagraphStyle(
            "doc_title",
            parent=base["Normal"],
            fontSize=18,
            fontName="Helvetica-Bold",
            textColor=_BLACK,
            leading=22,
            spaceAfter=2,
        ),
        "doc_subtitle": ParagraphStyle(
            "doc_subtitle",
            parent=base["Normal"],
            fontSize=10,
            fontName="Helvetica",
            textColor=_GRAY,
            leading=14,
            spaceAfter=0,
        ),
        "section_label": ParagraphStyle(
            "section_label",
            parent=base["Normal"],
            fontSize=8,
            fontName="Helvetica-Bold",
            textColor=_MUTED,
            leading=10,
            spaceBefore=18,
            spaceAfter=6,
            textTransform="uppercase",
            letterSpacing=0.8,
        ),
        "cell_label": ParagraphStyle(
            "cell_label",
            parent=base["Normal"],
            fontSize=9,
            fontName="Helvetica",
            textColor=_GRAY,
            leading=12,
        ),
        "cell_value": ParagraphStyle(
            "cell_value",
            parent=base["Normal"],
            fontSize=9,
            fontName="Helvetica-Bold",
            textColor=_BLACK,
            leading=12,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontSize=8,
            fontName="Helvetica",
            textColor=_MUTED,
            leading=11,
            alignment=TA_CENTER,
        ),
        "firma_label": ParagraphStyle(
            "firma_label",
            parent=base["Normal"],
            fontSize=8,
            fontName="Helvetica",
            textColor=_GRAY,
            leading=10,
            alignment=TA_CENTER,
        ),
    }


def _data_table(rows):
    """rows: list of (label, value) tuples."""
    s = _styles()
    data = [[Paragraph(lbl, s["cell_label"]), Paragraph(str(val), s["cell_value"])] for lbl, val in rows]
    t = Table(data, colWidths=[5.5 * cm, None], repeatRows=0)
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [_WHITE, _LGRAY]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("LINEBELOW", (0, -1), (-1, -1), 0.5, _BORDER),
                ("LINEABOVE", (0, 0), (-1, 0), 0.5, _BORDER),
                ("LINEBEFORE", (0, 0), (0, -1), 0.5, _BORDER),
                ("LINEAFTER", (-1, 0), (-1, -1), 0.5, _BORDER),
                ("ROUNDEDCORNERS", [4]),
            ]
        )
    )
    return t


def _section_title(text, s):
    return Paragraph(text, s["section_label"])


def generar_acta_pdf(prestamo) -> BytesIO:
    if not prestamo.firma_empleado_path or prestamo.estado_firma != "completo":
        raise AppError("The loan does not have the employee signature yet")

    buffer = BytesIO()
    s = _styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=1.5 * cm,  # tighter than the sides so a full receipt fits on one page with the logo
        bottomMargin=1.5 * cm,
        title="Equipment loan receipt",
    )

    equipo = prestamo.equipo
    story = []

    # ── Header ─────────────────────────────────────────────────────────────
    header_data = [
        [
            _logo(),
            Paragraph(
                f"Receipt No. {prestamo.id}",
                ParagraphStyle("acta_num", fontSize=9, fontName="Helvetica", textColor=_MUTED, alignment=TA_RIGHT),
            ),
        ]
    ]
    header_tbl = Table(header_data, colWidths=[(PAGE_W - 2 * MARGIN) * 0.6, (PAGE_W - 2 * MARGIN) * 0.4])
    header_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(header_tbl)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=_BLUE, spaceAfter=16))

    # Título
    story.append(Paragraph("Equipment loan receipt", s["doc_title"]))
    story.append(Paragraph("Hand-over and responsibility document", s["doc_subtitle"]))
    story.append(Spacer(1, 20))

    # ── Empleado ───────────────────────────────────────────────────────────
    story.append(_section_title("Recipient details", s))
    story.append(
        _data_table(
            [
                ("Name", prestamo.nombre_empleado),
                ("Job title", prestamo.cargo_empleado or "—"),
                ("Email", prestamo.correo_empleado),
            ]
        )
    )
    story.append(Spacer(1, 4))

    # ── Equipo ─────────────────────────────────────────────────────────────
    story.append(_section_title("Assigned device", s))
    equipo_rows = [
        ("Internal code", equipo.codigo_interno),
        ("Brand / Model", f"{equipo.marca} {equipo.modelo}"),
    ]
    if equipo.procesador:
        equipo_rows.append(("Processor", equipo.procesador))
    if equipo.ram:
        equipo_rows.append(("RAM", _with_gb(equipo.ram)))
    if equipo.almacenamiento:
        equipo_rows.append(("Storage", _with_gb(equipo.almacenamiento)))
    story.append(_data_table(equipo_rows))
    story.append(Spacer(1, 4))

    # ── Accesorios ─────────────────────────────────────────────────────────
    story.append(_section_title("Accessories handed over", s))
    accesorios = prestamo.accesorios or []
    story.append(
        _data_table(
            [
                ("Charger", "Yes" if prestamo.cargador_entregado else "No"),
                ("Other accessories", ", ".join(accesorios) if accesorios else "None"),
            ]
        )
    )
    story.append(Spacer(1, 4))

    # ── Fechas ─────────────────────────────────────────────────────────────
    story.append(_section_title("Dates", s))
    fecha_rows = [("Hand-over date", str(prestamo.fecha_entrega))]
    if prestamo.fecha_devolucion_estimada:
        fecha_rows.append(("Expected return", str(prestamo.fecha_devolucion_estimada)))
    if prestamo.observaciones_entrega:
        fecha_rows.append(("Notes", prestamo.observaciones_entrega))
    story.append(_data_table(fecha_rows))
    story.append(Spacer(1, 4))

    # ── Devolución (si aplica) ─────────────────────────────────────────────
    if prestamo.estado_prestamo == "Cerrado":
        story.append(_section_title("Return", s))
        dev_rows = []
        if prestamo.fecha_devolucion_real:
            dev_rows.append(("Return date", str(prestamo.fecha_devolucion_real)))
        if prestamo.estado_equipo_devolucion:
            dev_rows.append(
                (
                    "Device condition",
                    CONDICION_DEVOLUCION_LABEL.get(
                        prestamo.estado_equipo_devolucion, prestamo.estado_equipo_devolucion
                    ),
                )
            )
        if prestamo.observaciones_devolucion:
            dev_rows.append(("Notes", prestamo.observaciones_devolucion))
        if dev_rows:
            story.append(_data_table(dev_rows))
            story.append(Spacer(1, 4))

    # ── Firmas ─────────────────────────────────────────────────────────────
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_BORDER, spaceAfter=16))
    story.append(_section_title("Signatures", s))

    firma_w = 6 * cm
    firma_h = 2.5 * cm

    def firma_cell(path, label):
        items = []
        if path and os.path.exists(path):
            items.append(Image(path, width=firma_w, height=firma_h, kind="proportional"))
        else:
            items.append(Spacer(firma_w, firma_h))
        items.append(HRFlowable(width=firma_w, thickness=0.5, color=_BORDER, spaceAfter=4))
        items.append(Paragraph(label, s["firma_label"]))
        return items

    firma_data = [
        [
            firma_cell(prestamo.firma_empleado_path, "Recipient signature"),
            firma_cell(getattr(prestamo, "firma_it_path", None), "IT signature"),
        ]
    ]

    firma_tbl = Table(firma_data, colWidths=[(PAGE_W - 2 * MARGIN) / 2] * 2)
    firma_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(firma_tbl)

    story.append(Spacer(1, 24))
    story.append(
        Paragraph(
            "This document was generated electronically by Mesa and is valid as a hand-over receipt.",
            s["footer"],
        )
    )

    doc.build(story)
    buffer.seek(0)
    return buffer
