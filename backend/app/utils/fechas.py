def iso_utc(fecha):
    """Serializa una fecha UTC naive con sufijo "Z".

    Sin zona horaria, el navegador interpreta la fecha como hora local y, en
    Colombia (UTC-5), un contacto de hace horas parecería reciente o futuro.
    """
    return fecha.isoformat() + "Z" if fecha else None
