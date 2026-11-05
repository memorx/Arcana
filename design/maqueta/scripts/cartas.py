"""Baja los 78 grabados Rider-Waite-Smith (Pamela Colman Smith, 1909; dominio público, Wikimedia Commons)
y genera dos versiones por carta: «tinta» (grabado en negro, para el sistema de dos tintas) y «color».
Uso: python design/maqueta/scripts/cartas.py   (desde la raíz del repo)
Los originales quedan en design/cartas/original/ (fuera de git); las WebP en design/maqueta/img/cartas/.
"""
import re, time, urllib.request
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

RAIZ = Path(__file__).resolve().parents[3]
URLS = (RAIZ / "design/cartas/urls.txt").read_text().split()
ORIG = RAIZ / "design/cartas/original"; ORIG.mkdir(parents=True, exist_ok=True)
SAL = RAIZ / "design/maqueta/img/cartas"; SAL.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "ArcanaDesign/1.0 (readarcana.com; contacto por GitHub memorx/Arcana) python-urllib"}

def slug(url):
    n = url.rsplit("/", 1)[1].rsplit(".", 1)[0]          # RWS_Tarot_00_Fool, Cups01, ...
    return re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-")

for url in URLS:
    s = slug(url); dest = ORIG / (s + ".jpg")
    nombre = url.rsplit("/", 1)[1]
    # Miniatura estándar de 500 px de Wikimedia: 5 veces más ligera que el original y sin el límite de los originales.
    url = url.replace("/wikipedia/commons/", "/wikipedia/commons/thumb/") + f"/500px-{nombre}"
    if not dest.exists():
        for intento in range(6):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                    dest.write_bytes(r.read())
                break
            except Exception as e:
                espera = 30 * (intento + 1) if getattr(e, "code", 0) == 429 else 4 * (intento + 1)
                print("reintento", s, getattr(e, "code", e), "espera", espera, flush=True); time.sleep(espera)
        time.sleep(1.2)
    if not dest.exists():
        print("FALTA", s, flush=True); continue
    im = Image.open(dest).convert("RGB")
    w = 480; im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(SAL / f"{s}-color.webp", quality=78, method=6)
    # Tinta: gris, contraste local y curva que lleva los medios tonos al papel y deja la línea negra.
    g = ImageOps.grayscale(im)
    g = ImageOps.autocontrast(g, cutoff=1)
    g = g.filter(ImageFilter.UnsharpMask(radius=1.2, percent=90, threshold=2))
    g = g.point(lambda v: 255 if v > 205 else int((v / 205) ** 1.35 * 238))
    g.save(SAL / f"{s}-tinta.webp", quality=74, method=6)
    print("ok", s, im.size)
print(len(list(SAL.glob("*-tinta.webp"))), "cartas en tinta")
