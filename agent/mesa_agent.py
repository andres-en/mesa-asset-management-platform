r"""Agente de remediación remota de Mesa.

Servicio "dial-out": corre en el equipo Windows, hace polling periódico al
backend de Mesa y ejecuta únicamente los comandos del catálogo cerrado
definido en CATALOGO_IMPL. Nunca recibe ni ejecuta texto/script arbitrario
desde el servidor — solo un id de comando ya implementado aquí.

Instalación en un equipo (como servicio, arranca con el sistema):
  1. Empaqueta el .exe (una sola vez, en una máquina de build con Python):
       pip install pyinstaller
       pyinstaller --onefile --name mesa-agent --console mesa_agent.py
     Esto deja mesa-agent.exe en dist/.
  2. Copia a la máquina destino: mesa-agent.exe (o dist\mesa-agent.exe),
     install.ps1 y uninstall.ps1, todos en la misma carpeta.
  3. Desde la ficha del equipo en Mesa (rol admin), genera su token de
     agente.
  4. En esa máquina, como Administrador:
       .\install.ps1 -BaseUrl "https://mesa.example.com" -Token "..."
     Registra una tarea programada (SYSTEM, arranque automático, sin
     sesión de usuario). Para quitarlo: .\uninstall.ps1

Ejecución directa sin empaquetar (pruebas): copia config.example.json a
config.json junto a este archivo, pon el token, y corre:
  python mesa_agent.py

Requiere Python 3.9+ y solo librería estándar.
"""

import json
import logging
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

def _agent_dir():
    """Carpeta donde vive el agente: junto al .exe cuando está empaquetado
    con PyInstaller (sys.executable), junto al .py en ejecución directa."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


CONFIG_PATH = os.path.join(_agent_dir(), "config.json")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("mesa_agent")

# Rutas absolutas en vez de depender del PATH: corriendo como SYSTEM (tarea
# programada sin sesión interactiva), el PATH heredado puede no incluir
# System32 y comandos como "systeminfo" fallan con "no se reconoce...".
_SYSTEM32 = os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "System32")
_WINDIR = os.environ.get("SystemRoot", r"C:\Windows")


def _sys32(exe):
    return os.path.join(_SYSTEM32, exe)


def _run(cmd, timeout=60):
    """Ejecuta un comando de Windows y devuelve su salida combinada."""
    resultado = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=timeout
    )
    salida = (resultado.stdout or "") + (resultado.stderr or "")
    if resultado.returncode != 0:
        raise RuntimeError(salida.strip() or f"Exit code {resultado.returncode}")
    return salida.strip()


def _reiniciar_explorer():
    _run(f'"{_sys32("taskkill.exe")}" /F /IM explorer.exe')
    time.sleep(1)
    subprocess.Popen(f'"{os.path.join(_WINDIR, "explorer.exe")}"', shell=True)
    return "Explorer.exe restarted"


def _flush_dns():
    return _run(f'"{_sys32("ipconfig.exe")}" /flushdns')


def _renovar_ip():
    salida_release = _run(f'"{_sys32("ipconfig.exe")}" /release')
    salida_renew = _run(f'"{_sys32("ipconfig.exe")}" /renew')
    return f"{salida_release}\n{salida_renew}"


def _limpiar_temp():
    carpetas = [os.environ.get("TEMP", ""), r"C:\Windows\Temp"]
    eliminados = 0
    errores = 0
    for carpeta in carpetas:
        if not carpeta or not os.path.isdir(carpeta):
            continue
        for nombre in os.listdir(carpeta):
            ruta = os.path.join(carpeta, nombre)
            try:
                if os.path.isdir(ruta):
                    subprocess.run(f'rmdir /S /Q "{ruta}"', shell=True, timeout=30)
                else:
                    os.remove(ruta)
                eliminados += 1
            except OSError:
                errores += 1
    return f"{eliminados} items deleted, {errores} could not be deleted (in use)"


def _gpupdate():
    return _run(f'"{_sys32("gpupdate.exe")}" /force', timeout=180)


def _reiniciar_spooler():
    _run(f'"{_sys32("net.exe")}" stop spooler')
    _run(f'"{_sys32("net.exe")}" start spooler')
    return "Print spooler service restarted"


def _reiniciar_equipo():
    _run(f'"{_sys32("shutdown.exe")}" /r /t 60 /c "Restart requested from Mesa"')
    return "Restart scheduled in 60 seconds"


def _info_sistema():
    return _run(f'"{_sys32("systeminfo.exe")}"', timeout=60)


# Catálogo cerrado: el backend solo puede pedir uno de estos ids.
CATALOGO_IMPL = {
    "reiniciar_explorer": _reiniciar_explorer,
    "flush_dns": _flush_dns,
    "renovar_ip": _renovar_ip,
    "limpiar_temp": _limpiar_temp,
    "gpupdate": _gpupdate,
    "reiniciar_spooler": _reiniciar_spooler,
    "reiniciar_equipo": _reiniciar_equipo,
    "info_sistema": _info_sistema,
}


def cargar_config():
    if not os.path.isfile(CONFIG_PATH):
        log.error("config.json not found next to the agent. Copy config.example.json and fill it in.")
        sys.exit(1)
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)
    for campo in ("base_url", "token"):
        if not config.get(campo):
            log.error("config.json: missing required field '%s'", campo)
            sys.exit(1)
    config.setdefault("poll_interval_seconds", 25)
    return config


def _peticion(config, path, method="GET", body=None):
    url = config["base_url"].rstrip("/") + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("X-Agent-Token", config["token"])
    if data is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8") or "null")


def reportar_resultado(config, ejecucion_id, estado, resultado):
    try:
        _peticion(
            config,
            f"/agente/comandos/{ejecucion_id}/resultado",
            method="POST",
            body={"estado": estado, "resultado": resultado[:4000] if resultado else resultado},
        )
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        log.error("Could not report the result of execution %s: %s", ejecucion_id, e)


def ejecutar_pendientes(config):
    try:
        pendientes = _peticion(config, "/agente/comandos/pendientes")
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        log.warning("Could not reach the backend: %s", e)
        return

    for item in pendientes:
        ejecucion_id = item["id"]
        comando_id = item["comando_id"]
        implementacion = CATALOGO_IMPL.get(comando_id)

        if not implementacion:
            log.error("Unknown command received from the backend: %s", comando_id)
            reportar_resultado(config, ejecucion_id, "fallido", f"Command not implemented by this agent: {comando_id}")
            continue

        log.info("Running command '%s' (execution #%s)...", comando_id, ejecucion_id)
        try:
            salida = implementacion()
            log.info("Command '%s' completed", comando_id)
            reportar_resultado(config, ejecucion_id, "completado", salida)
        except Exception as e:
            log.exception("Command '%s' failed", comando_id)
            reportar_resultado(config, ejecucion_id, "fallido", str(e))


def main():
    config = cargar_config()
    log.info("Mesa agent started. Backend: %s", config["base_url"])
    while True:
        ejecutar_pendientes(config)
        time.sleep(config["poll_interval_seconds"])


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Agent stopped by the user")
