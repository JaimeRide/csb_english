#!/usr/bin/env python3
"""Prepara la versión web a partir de la carpeta ../tarjetas.

Ejecútalo cada vez que añadas o cambies imágenes en tarjetas/:
    python3 actualizar_web.py

- Copia los dibujos de cada subcarpeta (classroom/, ...) a img/<subcarpeta>/.
- Copia los iconos (manos, brocha) a img/icons/ y deja la mano de "this" ya girada.
- Genera data.js con la lista de tarjetas.
- Genera la voz del robot (audio/<voz>/*.ogg) para cada palabra y cada frase de los
  demostrativos, con Piper y un efecto robótico, una vez por cada voz (femenina y
  masculina). Necesita ../voz/ (modelos y librería); si no está, la app usa la voz
  del dispositivo.
- Genera los iconos de la app (el robot) y sw.js, que guarda todo para usarlo sin internet.
"""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw

WEB = Path(__file__).resolve().parent
TARJETAS = WEB.parent / "tarjetas"
IMG = WEB / "img"
AUDIO = WEB / "audio"
VOZ = WEB.parent / "voz"
# Voces que se pueden elegir al abrir la app (el orden es el del selector)
VOCES = {"alba": "en_GB-alba-medium.onnx", "alan": "en_GB-alan-medium.onnx"}
# Ajustes del efecto robótico (si se cambian, se regeneran todos los audios)
AJUSTES_VOZ = {"velocidad": 1.1, "mezcla": 0.35, "anillo_hz": 55.0, "eco_ms": 9.0, "eco": 0.3}
SALUDO = "Hello!"  # lo dice el robot elegido en el selector
EXTENSIONES = {".png", ".jpg", ".jpeg", ".webp"}

# El robot se dibuja con la misma función que la versión de escritorio
sys.path.insert(0, str(TARJETAS))
from tarjetas import DEMOSTRATIVOS, SOLO_PLURAL, icono_robot, plural  # noqa: E402


def bandera_reino_unido(tam):
    """Union Jack (proporciones oficiales 60x30), estirada a un cuadrado de tam x tam."""
    k = 20  # se dibuja a 1200x600 y se reduce
    azul, rojo, blanco = (1, 33, 105, 255), (200, 16, 46, 255), (255, 255, 255, 255)
    bandera = Image.new("RGBA", (60 * k, 30 * k), azul)
    d = ImageDraw.Draw(bandera)
    diagonales = [((0, 0), (60 * k, 30 * k)), ((60 * k, 0), (0, 30 * k))]
    for linea in diagonales:
        d.line(linea, fill=blanco, width=6 * k)
    # Las diagonales rojas van desplazadas: solo se ve media franja en cada triángulo
    rojas = Image.new("RGBA", bandera.size, (0, 0, 0, 0))
    for linea in diagonales:
        ImageDraw.Draw(rojas).line(linea, fill=rojo, width=4 * k)
    mascara = Image.new("L", bandera.size, 0)
    for triangulo in [[(30, 15), (60, 15), (60, 30)], [(30, 15), (30, 30), (0, 30)],
                      [(30, 15), (0, 15), (0, 0)], [(30, 15), (30, 0), (60, 0)]]:
        ImageDraw.Draw(mascara).polygon([(x * k, y * k) for x, y in triangulo], fill=255)
    bandera.paste(rojas, mask=Image.composite(rojas.getchannel("A"), mascara, mascara))
    d.rectangle((25 * k, 0, 35 * k, 30 * k), fill=blanco)   # cruz de San Jorge con borde blanco
    d.rectangle((0, 10 * k, 60 * k, 20 * k), fill=blanco)
    d.rectangle((27 * k, 0, 33 * k, 30 * k), fill=rojo)
    d.rectangle((0, 12 * k, 60 * k, 18 * k), fill=rojo)
    return bandera.resize((tam, tam), Image.LANCZOS)


def clave_audio(texto):
    """'These are the pencil cases' -> 'these_are_the_pencil_cases' (igual que en app.js)."""
    return "_".join(re.findall(r"[a-z]+", texto.lower()))


def textos_a_decir(tarjetas):
    """Todo lo que puede decir el robot: cada palabra y cada frase de los demostrativos."""
    textos = {t["nombre"] for t in tarjetas} | {SALUDO}
    for t in tarjetas:
        if t["tipo"] != "classroom":
            continue
        for demo, verbo, es_plural, _ in DEMOSTRATIVOS:
            if t["nombre"] in SOLO_PLURAL and not es_plural:
                continue
            textos.add(f"{demo.capitalize()} {verbo} the {plural(t['nombre']) if es_plural else t['nombre']}")
    return sorted(textos)


def efecto_robot(audio, sr, np):
    """Modulador en anillo (voz de robot clásica) + eco metálico muy corto."""
    t = np.arange(len(audio)) / sr
    anillo = audio * np.sin(2 * np.pi * AJUSTES_VOZ["anillo_hz"] * t)
    salida = (1 - AJUSTES_VOZ["mezcla"]) * audio + AJUSTES_VOZ["mezcla"] * anillo
    d, eco = int(sr * AJUSTES_VOZ["eco_ms"] / 1000), AJUSTES_VOZ["eco"]
    salida = salida.tolist()  # filtro peine con realimentación: suena "a lata"
    for i in range(d, len(salida)):
        salida[i] += eco * salida[i - d]
    salida = np.array(salida, dtype=np.float32)
    return salida / (np.max(np.abs(salida)) + 1e-9) * 0.9


def generar_audios(textos, nombre_voz):
    """Crea audio/<voz>/<clave>.ogg para cada texto que falte. Devuelve las claves disponibles."""
    carpeta = AUDIO / nombre_voz
    carpeta.mkdir(parents=True, exist_ok=True)
    modelo = VOZ / VOCES[nombre_voz]
    ajustes = {"modelo": modelo.name, **AJUSTES_VOZ}
    sello = carpeta / "ajustes.json"
    if not sello.exists() or json.loads(sello.read_text()) != ajustes:
        for viejo in carpeta.glob("*.ogg"):  # han cambiado los ajustes: se rehacen todos
            viejo.unlink()
    claves = {clave_audio(t): t for t in textos}
    faltan = [c for c in claves if not (carpeta / f"{c}.ogg").exists()]
    if faltan:
        if not modelo.exists():
            print(f"AVISO: no está {modelo}; {len(faltan)} textos usarán la voz del dispositivo")
        else:
            sys.path.insert(0, str(VOZ / "pylib"))
            import numpy as np
            import soundfile as sf
            from piper import PiperVoice
            from piper.config import SynthesisConfig
            voz = PiperVoice.load(str(modelo))
            config = SynthesisConfig(length_scale=AJUSTES_VOZ["velocidad"])
            for c in faltan:
                trozos = list(voz.synthesize(claves[c], syn_config=config))
                audio = np.concatenate([t.audio_float_array for t in trozos]).astype(np.float32)
                sr = trozos[0].sample_rate
                sf.write(carpeta / f"{c}.ogg", efecto_robot(audio, sr, np), sr, format="OGG", subtype="VORBIS")
            print(f"{nombre_voz}: {len(faltan)} audios nuevos")
    sello.write_text(json.dumps(ajustes))
    for sobrante in carpeta.glob("*.ogg"):  # textos que ya no existen
        if sobrante.stem not in claves:
            sobrante.unlink()
    return sorted(p.stem for p in carpeta.glob("*.ogg"))


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

    # Iconos de la app: el robot delante de la bandera del Reino Unido
    for tam in (192, 512):
        fondo = bandera_reino_unido(tam)
        robot = icono_robot(False, int(tam * 0.7), como_foto=False)
        fondo.alpha_composite(robot, ((tam - robot.width) // 2, (tam - robot.height) // 2))
        fondo.save(IMG / f"app-{tam}.png")

    textos = textos_a_decir(tarjetas)
    audios = {v: generar_audios(textos, v) for v in VOCES}

    # La versión cambia cuando cambia cualquier archivo, para que el móvil se actualice
    estaticos = ["index.html", "styles.css", "app.js", "manifest.webmanifest"]
    archivos = estaticos + sorted(p.relative_to(WEB).as_posix() for p in IMG.rglob("*") if p.is_file())
    archivos += [f"audio/{v}/{a}.ogg" for v in VOCES for a in audios[v]]
    resumen = hashlib.sha1()
    for a in archivos:
        resumen.update(a.encode())
        if (WEB / a).exists():
            resumen.update((WEB / a).read_bytes())
    version = resumen.hexdigest()[:10]

    (WEB / "data.js").write_text(
        "// Generado por actualizar_web.py: no editar a mano\n"
        f"window.DATOS = {json.dumps({'version': version, 'tarjetas': tarjetas, 'audios': audios}, indent=1, ensure_ascii=False)};\n",
        encoding="utf-8")
    archivos.append("data.js")

    (WEB / "sw.js").write_text(f"""// Generado por actualizar_web.py: no editar a mano
const CACHE = "ingles-{version}";
const ARCHIVOS = {json.dumps(["./"] + archivos, indent=1)};

self.addEventListener("install", e => {{
  // cache: "reload": siempre del servidor, no de la caché del navegador (que podría ser la versión vieja)
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ARCHIVOS.map(a => new Request(a, {{cache: "reload"}}))))
    .then(() => self.skipWaiting()));
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

    print(f"{len(tarjetas)} tarjetas, {sum(map(len, audios.values()))} audios, {len(archivos)} archivos, versión {version}")


if __name__ == "__main__":
    main()
