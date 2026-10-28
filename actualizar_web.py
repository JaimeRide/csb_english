#!/usr/bin/env python3
"""Prepara la versión web a partir de la carpeta ../tarjetas.

Ejecútalo cada vez que añadas o cambies imágenes en tarjetas/:
    python3 actualizar_web.py

- Copia los dibujos de cada subcarpeta (classroom/, ...) a img/<subcarpeta>/.
- Copia los iconos (manos, brocha) a img/icons/ y deja la mano de "this" ya girada.
- Genera data.js con la lista de tarjetas.
- Genera los iconos de la app (el robot) y sw.js, que guarda todo para usarlo sin internet.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parent
TARJETAS = WEB.parent / "tarjetas"
IMG = WEB / "img"
EXTENSIONES = {".png", ".jpg", ".jpeg", ".webp"}

# El robot se dibuja con la misma función que la versión de escritorio
sys.path.insert(0, str(TARJETAS))
from tarjetas import icono_robot  # noqa: E402


def main():
    if IMG.exists():
        shutil.rmtree(IMG)
    (IMG / "icons").mkdir(parents=True)

    tarjetas = []
    for carpeta in sorted(p for p in TARJETAS.iterdir()
                          if p.is_dir() and p.name != "icons" and not p.name.startswith((".", "_"))):
        for img in sorted(carpeta.iterdir()):
            if img.suffix.lower() not in EXTENSIONES or "_" not in img.stem:
                continue
            destino = IMG / carpeta.name / img.name
            destino.parent.mkdir(exist_ok=True)
            shutil.copy2(img, destino)
            tipo, nombre = img.stem.split("_", 1)
            tarjetas.append({"tipo": tipo, "nombre": nombre.replace("_", " "),
                             "archivo": destino.relative_to(WEB).as_posix()})

    for icono in ("hand_this.png", "hand_that.png", "brush.png"):
        shutil.copy2(TARJETAS / "icons" / icono, IMG / "icons" / icono)
    # Mano de this/these girada 45º para que apunte en horizontal (igual que en escritorio)
    mano = Image.open(TARJETAS / "icons" / "hand_this.png").rotate(45, resample=Image.BICUBIC, expand=True)
    mano.crop(mano.getbbox()).save(IMG / "icons" / "hand_this_horizontal.png")

    # Iconos de la app: el robot sobre fondo amarillo
    for tam in (192, 512):
        fondo = Image.new("RGBA", (tam, tam), (255, 217, 102, 255))
        robot = icono_robot(False, int(tam * 0.8), como_foto=False)
        fondo.alpha_composite(robot, ((tam - robot.width) // 2, (tam - robot.height) // 2))
        fondo.save(IMG / f"app-{tam}.png")

    # La versión cambia cuando cambia cualquier archivo, para que el móvil se actualice
    estaticos = ["index.html", "styles.css", "app.js", "manifest.webmanifest"]
    archivos = estaticos + sorted(p.relative_to(WEB).as_posix() for p in IMG.rglob("*") if p.is_file())
    resumen = hashlib.sha1()
    for a in archivos:
        resumen.update(a.encode())
        if (WEB / a).exists():
            resumen.update((WEB / a).read_bytes())
    version = resumen.hexdigest()[:10]

    (WEB / "data.js").write_text(
        "// Generado por actualizar_web.py: no editar a mano\n"
        f"window.DATOS = {json.dumps({'version': version, 'tarjetas': tarjetas}, indent=1, ensure_ascii=False)};\n",
        encoding="utf-8")
    archivos.append("data.js")

    (WEB / "sw.js").write_text(f"""// Generado por actualizar_web.py: no editar a mano
const CACHE = "ingles-{version}";
const ARCHIVOS = {json.dumps(["./"] + archivos, indent=1)};

self.addEventListener("install", e => {{
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
}});
self.addEventListener("activate", e => {{
  e.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
}});
self.addEventListener("fetch", e => {{
  e.respondWith(caches.match(e.request, {{ignoreSearch: true}}).then(r => r || fetch(e.request)));
}});
""", encoding="utf-8")

    print(f"{len(tarjetas)} tarjetas, {len(archivos)} archivos, versión {version}")


if __name__ == "__main__":
    main()
