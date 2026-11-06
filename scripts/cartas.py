"""Cartas autohospedadas y marca de Arcana («Dos tintas»).

Genera, desde los 78 grabados Rider-Waite-Smith (Pamela Colman Smith, 1909; dominio público), tres WebP por carta
en public/cartas/ y los archivos de marca en public/.

  python scripts/cartas.py                 # las 78 cartas × 3 variantes
  python scripts/cartas.py marca           # og-image.jpg, favicon.svg, icon-192.png, icon-512.png
  python scripts/cartas.py todo            # las dos cosas
  python scripts/cartas.py --origen RUTA   # carpeta con los originales (por omisión design/cartas/original)

Variantes (plan §5.6):
  <slug>-color.webp   480 px de ancho, q65   — la carta revelada (lo único a todo color)
  <slug>-tinta.webp   360 px de ancho, q55   — grabado en negro: misma curva que design/maqueta/scripts/cartas.py
  <slug>-mesa.webp    200 px de ancho, q50   — gris horneado (sin `filter` en CSS) para la mesa de grabados

Los originales (miniaturas de 500 px de Wikimedia Commons) NO se bajan aquí: los baja una sola vez
design/maqueta/scripts/cartas.py y quedan fuera de git en design/cartas/original/. Los nombres de archivo son los slugs
de src/lib/cartas.ts (rws-tarot-06-lovers.jpg, cups02.jpg, …).

La marca usa Gloock, Martian Mono y Water Brush (Google Fonts, OFL); se bajan una vez a una carpeta temporal.
Requiere Pillow ≥ 10.
"""
from __future__ import annotations

import math
import random
import sys
import tempfile
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

RAIZ = Path(__file__).resolve().parents[1]
PUBLICO = RAIZ / "public"
SALIDA = PUBLICO / "cartas"

TINTA = (14, 13, 12)
PAPEL = (236, 234, 230)
NIEBLA = (168, 164, 157)
ROSA = (228, 0, 124)
ROSA_LUZ = (244, 61, 151)

MAYORES = [
    "fool", "magician", "high-priestess", "empress", "emperor", "hierophant", "lovers", "chariot", "strength",
    "hermit", "wheel-of-fortune", "justice", "hanged-man", "death", "temperance", "devil", "tower", "star", "moon",
    "sun", "judgement", "world",
]
PALOS = ["wands", "cups", "swords", "pents"]  # orden del seed: bastos, copas, espadas, oros


def slugs() -> list[str]:
    """Los 78 slugs en el orden de prisma/seed.ts (el mismo de CARTAS en src/lib/cartas.ts)."""
    out = [f"rws-tarot-{i:02d}-{n}" for i, n in enumerate(MAYORES)]
    for palo in PALOS:
        out += [f"{palo}{n:02d}" for n in range(1, 15)]
    return out


# ---------------------------------------------------------------------------------------------------------------------
# Cartas
# ---------------------------------------------------------------------------------------------------------------------

def a_ancho(im: Image.Image, ancho: int) -> Image.Image:
    return im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)


def curva_tinta(im480: Image.Image) -> Image.Image:
    """La curva de la maqueta: gris, contraste local y medios tonos al papel; la línea queda negra."""
    g = ImageOps.grayscale(im480)
    g = ImageOps.autocontrast(g, cutoff=1)
    g = g.filter(ImageFilter.UnsharpMask(radius=1.2, percent=90, threshold=2))
    return g.point(lambda v: 255 if v > 205 else int((v / 205) ** 1.35 * 238))


def gris_mesa(im: Image.Image) -> Image.Image:
    """Gris horneado de la mesa: lo que antes hacía `filter: grayscale(1) contrast(1.05)` en CSS."""
    g = ImageOps.grayscale(im)
    return g.point(lambda v: max(0, min(255, round((v - 128) * 1.05 + 128))))


def generar_cartas(origen: Path) -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    faltan = [s for s in slugs() if not (origen / f"{s}.jpg").exists()]
    if faltan:
        sys.exit(f"Faltan {len(faltan)} originales en {origen}: {', '.join(faltan[:6])}…\n"
                 "Bájalos una vez con design/maqueta/scripts/cartas.py o pasa --origen.")
    total = 0
    for s in slugs():
        # Mediana de 3 px sobre el original: quita la trama de medios tonos del escaneo (y el ruido JPEG), que es lo que
        # más pesa, sin comerse la línea del grabado. Con ella el color baja de ~108 KB a ~66 KB por carta.
        im = Image.open(origen / f"{s}.jpg").convert("RGB").filter(ImageFilter.MedianFilter(3))
        im480 = a_ancho(im, 480)
        im480.save(SALIDA / f"{s}-color.webp", quality=65, method=6)
        a_ancho(curva_tinta(im480), 360).save(SALIDA / f"{s}-tinta.webp", quality=55, method=6)
        gris_mesa(a_ancho(im, 200)).save(SALIDA / f"{s}-mesa.webp", quality=50, method=6)
        tam = sum((SALIDA / f"{s}-{v}.webp").stat().st_size for v in ("color", "tinta", "mesa"))
        total += tam
        print(f"ok {s:32s} {im480.size[0]}×{im480.size[1]}  {tam / 1024:6.1f} KB", flush=True)
    por_variante = {v: sum(p.stat().st_size for p in SALIDA.glob(f"*-{v}.webp")) for v in ("color", "tinta", "mesa")}
    print("\n".join(f"{v:6s} {b / 1024 / 1024:5.2f} MB  ({b / 78 / 1024:5.1f} KB por carta)" for v, b in por_variante.items()))
    print(f"total  {total / 1024 / 1024:5.2f} MB en {len(list(SALIDA.glob('*.webp')))} archivos (presupuesto 14 MB)")


# ---------------------------------------------------------------------------------------------------------------------
# Marca: el reverso (misma geometría que src/components/tinta/ReversoCarta.tsx), favicon, íconos y og-image
# ---------------------------------------------------------------------------------------------------------------------

FUENTES = {
    "Gloock-Regular.ttf": "https://github.com/google/fonts/raw/main/ofl/gloock/Gloock-Regular.ttf",
    "MartianMono.ttf": "https://github.com/google/fonts/raw/main/ofl/martianmono/MartianMono%5Bwdth%2Cwght%5D.ttf",
    "WaterBrush-Regular.ttf": "https://github.com/google/fonts/raw/main/ofl/waterbrush/WaterBrush-Regular.ttf",
}


def fuente(nombre: str, tam: int) -> ImageFont.FreeTypeFont:
    cache = Path(tempfile.gettempdir()) / "arcana-fuentes"
    cache.mkdir(exist_ok=True)
    ruta = cache / nombre
    if not ruta.exists():
        with urllib.request.urlopen(FUENTES[nombre], timeout=60) as r:
            ruta.write_bytes(r.read())
    return ImageFont.truetype(str(ruta), tam)


def favicon_svg() -> str:
    """El centro del reverso: anillo rosa con su punto, sobre tinta, y el filete de papel."""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        '<rect width="32" height="32" rx="7" fill="#0E0D0C"/>'
        '<circle cx="16" cy="16" r="12.2" fill="none" stroke="#ECEAE6" stroke-width="1"/>'
        '<circle cx="16" cy="16" r="7.2" fill="none" stroke="#E4007C" stroke-width="2.2"/>'
        '<circle cx="16" cy="16" r="2.6" fill="#E4007C"/>'
        "</svg>\n"
    )


def icono(tam: int) -> Image.Image:
    """Ícono de la app (any + maskable): el anillo rosa del reverso dentro de la zona segura (80 %)."""
    k = 4  # supermuestreo para bordes limpios
    S = tam * k
    im = Image.new("RGB", (S, S), TINTA)
    d = ImageDraw.Draw(im)
    c = S / 2
    def anillo(r, ancho, color):
        d.ellipse([c - r, c - r, c + r, c + r], outline=color, width=max(1, round(ancho)))
    anillo(S * 0.34, S * 0.012, PAPEL)
    # las 20 marcas del tonalli en el anillo exterior
    for i in range(20):
        a = -math.pi / 2 + i * math.tau / 20
        r = S * 0.34 - S * 0.045
        x, y = c + r * math.cos(a), c + r * math.sin(a)
        p = S * 0.0075
        d.ellipse([x - p, y - p, x + p, y + p], fill=PAPEL)
    anillo(S * 0.2, S * 0.032, ROSA)
    p = S * 0.07
    d.ellipse([c - p, c - p, c + p, c + p], fill=ROSA)
    return im.resize((tam, tam), Image.LANCZOS)


def og_image(origen_cartas: Path) -> Image.Image:
    """1200×630: grabados en tinta regados en una retícula girada, «Arcana» en Gloock y la tesis."""
    W, H = 1200, 630
    random.seed(1909)
    lienzo = Image.new("RGB", (W, H), TINTA)

    # Retícula girada de grabados (la escena 1), sobre un lienzo mayor que luego se recorta.
    GW, GH = 2000, 1500
    mesa = Image.new("RGB", (GW, GH), TINTA)
    elegidas = slugs()[:22] + random.sample(slugs()[22:], 18)
    random.shuffle(elegidas)
    ancho, alto, hueco = 150, 257, 18
    i = 0
    for col in range(12):
        y0 = -120 if col % 2 else 0
        for fila in range(6):
            s = elegidas[i % len(elegidas)]; i += 1
            g = Image.open(origen_cartas / f"{s}-tinta.webp").convert("L").resize((ancho, alto), Image.LANCZOS)
            # El grabado en negro sobre papel se vuelve papel tenue sobre tinta (línea clara, papel oscuro).
            g = ImageOps.invert(g).point(lambda v: round(v * 0.42))
            x = 40 + col * (ancho + hueco)
            y = y0 + fila * (alto + hueco)
            mesa.paste(Image.merge("RGB", (g, g, g)), (x, y))
    mesa = mesa.rotate(14, resample=Image.BICUBIC, fillcolor=TINTA)
    lienzo.paste(mesa.crop(((GW - W) // 2 + 120, (GH - H) // 2, (GW - W) // 2 + 120 + W, (GH - H) // 2 + H)), (0, 0))

    # Velo de tinta de izquierda a derecha (el texto vive a la izquierda).
    velo = Image.new("L", (W, H))
    vd = ImageDraw.Draw(velo)
    for x in range(W):
        t = x / W
        a = 0.97 if t < 0.36 else 0.97 - (t - 0.36) / 0.4 * 0.72 if t < 0.76 else 0.25 + (t - 0.76) / 0.24 * 0.2
        vd.line([(x, 0), (x, H)], fill=round(255 * a))
    lienzo = Image.composite(Image.new("RGB", (W, H), TINTA), lienzo, velo)

    d = ImageDraw.Draw(lienzo)
    X = 72
    # Etiqueta en mono con el punto rosa
    mono = fuente("MartianMono.ttf", 17)
    d.ellipse([X, 86, X + 11, 97], fill=ROSA)
    d.text((X + 26, 80), "TAROT CON IA · 78 GRABADOS DE 1909", font=mono, fill=NIEBLA)
    # Marca
    d.text((X - 4, 120), "Arcana", font=fuente("Gloock-Regular.ttf", 132), fill=PAPEL)
    # Tesis
    tesis = fuente("Gloock-Regular.ttf", 40)
    lineas = [("Las cartas son de 1909.", PAPEL), ("Quien las lee hoy es una IA.", PAPEL),
              ("La pregunta sigue siendo tuya.", ROSA_LUZ)]
    y = 318
    for texto, color in lineas:
        d.text((X, y), texto, font=tesis, fill=color)
        y += 54
    d.text((X, 540), "READARCANA.COM", font=fuente("MartianMono.ttf", 18), fill=NIEBLA)
    # Pincel rosa, como sello, abajo a la derecha
    pincel = fuente("WaterBrush-Regular.ttf", 120)
    capa = Image.new("L", (W, H))
    ImageDraw.Draw(capa).text((W - 470, H - 205), "Pregunta", font=pincel, fill=255)
    # Pincel seco: vetas horizontales que comen el trazo
    vetas = Image.effect_noise((W, H), 90).resize((W // 40, H * 2 // 5)).resize((W, H), Image.BICUBIC)
    capa = Image.composite(capa, Image.new("L", (W, H)), vetas.point(lambda v: 255 if v > 92 else 0))
    lienzo.paste(Image.new("RGB", (W, H), ROSA), (0, 0), capa)
    return lienzo


def generar_marca() -> None:
    (PUBLICO / "favicon.svg").write_text(favicon_svg(), encoding="utf-8")
    icono(192).save(PUBLICO / "icon-192.png", optimize=True)
    icono(512).save(PUBLICO / "icon-512.png", optimize=True)
    if not (SALIDA / "rws-tarot-00-fool-tinta.webp").exists():
        sys.exit("Genera primero las cartas (python scripts/cartas.py): la og-image usa las variantes -tinta.")
    og_image(SALIDA).save(PUBLICO / "og-image.jpg", quality=84, optimize=True, progressive=True)
    for n in ("favicon.svg", "icon-192.png", "icon-512.png", "og-image.jpg"):
        print(f"ok {n:14s} {(PUBLICO / n).stat().st_size / 1024:6.1f} KB")


if __name__ == "__main__":
    args = sys.argv[1:]
    origen = RAIZ / "design/cartas/original"
    if "--origen" in args:
        i = args.index("--origen")
        origen = Path(args[i + 1])
        del args[i:i + 2]
    modo = args[0] if args else "cartas"
    if modo in ("cartas", "todo"):
        generar_cartas(origen)
    if modo in ("marca", "todo"):
        generar_marca()
