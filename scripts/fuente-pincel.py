"""La fuente de la palabra a pincel: el subset de Water Brush que sirve el sitio.

Escribe src/app/fuentes/water-brush-letras.woff2 (lo carga next/font/local en src/app/layout.tsx) y, junto a él,
src/app/fuentes/OFL.txt con el copyright y la licencia.

  python scripts/fuente-pincel.py                  # baja el original, lo valida y regenera el subset y OFL.txt
  python scripts/fuente-pincel.py --origen RUTA    # usa un WaterBrush-Regular.ttf ya bajado (se valida igual)
  python scripts/fuente-pincel.py --comprobar      # no escribe: compara lo del repo con lo que generaría

Origen: Water Brush 1.010 (Robert E. Leuschke, TypeSETit; SIL Open Font License 1.1), del repositorio oficial de
Google Fonts fijado en un commit, para que lo que se baja no cambie:
  https://github.com/google/fonts/tree/<COMMIT>/ofl/waterbrush  (WaterBrush-Regular.ttf y OFL.txt)
El script comprueba el SHA-256 de los dos archivos antes de usarlos y que la licencia no declare «Reserved Font
Name»: el subset es una «Modified Version» y, sin nombre reservado, puede seguir llamándose Water Brush. Si una
versión futura lo declarara, el script se detiene (habría que darle otro nombre de familia en la tabla `name`).

Lo que lleva el subset:
- Caracteres (CARACTERES abajo): A–Z, a–z, ÁÉÍÓÚÑÜ, áéíóúñü, ¿?¡!,. y el espacio. Las palabras a pincel de
  messages/{es,en}.json sólo pueden usar estos; lo cuida src/__tests__/app/fuente-pincel.test.ts, que lee el
  cmap del .woff2. Una palabra nueva con otra letra: se agrega aquí, se corre el script y se commitea el .woff2.
- Rasgos OpenType: los mismos que deja la API de Google Fonts en el woff2 «latin» que antes servía
  next/font/google (ccmp, frac, init, liga, lnum, locl; kern, mark, mkmk). Fuera aalt, case, onum, ordn y sups,
  que el navegador no aplica por su cuenta. Sin hinting, como la API. Con eso los glifos, las métricas y las
  tablas GSUB/GPOS/GDEF salen idénticos a los del experimento de Fable (6 nov 2026; 35 KB, 65 KB el latín entero).
- La tabla `name` completa (--name-IDs='*'): copyright (0), diseñador y proveedor (8, 9, 11, 12), licencia (13)
  y su URL (14) viajan dentro del archivo.

La salida es determinista con la misma versión de fontTools y brotli (probado con fontTools 4.61).
Requiere fontTools y brotli: pip install fonttools brotli
"""
from __future__ import annotations

import argparse
import hashlib
import io
import sys
import tempfile
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

RAIZ = Path(__file__).resolve().parents[1]
DESTINO = RAIZ / "src" / "app" / "fuentes" / "water-brush-letras.woff2"
LICENCIA = DESTINO.with_name("OFL.txt")

# google/fonts en el commit que dejó WaterBrush-Regular.ttf como está (13 abr 2022); el OFL.txt no ha cambiado desde.
COMMIT = "fe95a02e4f1052603e566cc4339ea97d80df5bea"
BASE = f"https://raw.githubusercontent.com/google/fonts/{COMMIT}/ofl/waterbrush"
ARCHIVOS = {
    "WaterBrush-Regular.ttf": "2cbdccbca5d4be005fe4edd8895b91618a7f96639eaeeb4987ad83e81afc71a7",
    "OFL.txt": "eaa2e23b59eb264d9f982126f5d6cb7594b00a6a5e3684d916ecbf0c31004610",
}

CARACTERES = (
    " "
    + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    + "abcdefghijklmnopqrstuvwxyz"
    + "ÁÉÍÓÚÑÜ"
    + "áéíóúñü"
    + "¿?¡!,."
)
RASGOS = ["ccmp", "frac", "init", "liga", "lnum", "locl", "kern", "mark", "mkmk"]

CRLF = bytes([13, 10])
LF = bytes([10])


def fallar(mensaje: str) -> None:
    print(f"[fuente-pincel] ABORTADO: {mensaje}", file=sys.stderr)
    sys.exit(1)


def sha256(datos: bytes) -> str:
    return hashlib.sha256(datos).hexdigest()


def bajar(nombre: str, origen: Path | None = None) -> bytes:
    """El archivo validado por SHA-256: de `origen` si se dio, si no de la caché temporal o de GitHub."""
    esperado = ARCHIVOS[nombre]
    if origen is not None:
        datos = origen.read_bytes()
        if sha256(datos) != esperado:
            fallar(f"{origen} no es el {nombre} esperado (SHA-256 {sha256(datos)}, se esperaba {esperado}).")
        return datos
    cache = Path(tempfile.gettempdir()) / "arcana-fuente-pincel" / f"{esperado[:16]}-{nombre}"
    if cache.exists() and sha256(cache.read_bytes()) == esperado:
        return cache.read_bytes()
    url = f"{BASE}/{nombre}"
    print(f"[fuente-pincel] bajando {url}")
    with urllib.request.urlopen(url, timeout=60) as respuesta:
        datos = respuesta.read()
    if sha256(datos) != esperado:
        fallar(f"{url} no coincide con el SHA-256 fijado ({sha256(datos)} ≠ {esperado}).")
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(datos)
    return datos


def nombres(fuente: TTFont) -> dict[int, str]:
    return {r.nameID: r.toUnicode() for r in fuente["name"].names if r.platformID == 3 and r.langID == 0x409}


def validar_original(ttf: bytes, licencia: str) -> None:
    """Que sea Water Brush 1.010, sin nombre reservado y con todos los caracteres del subset."""
    encabezado = licencia.split("This Font Software is licensed", 1)[0]
    if "Reserved Font Name" in encabezado:
        fallar("OFL.txt declara un «Reserved Font Name»: el subset necesita otro nombre de familia en la tabla name.")
    fuente = TTFont(io.BytesIO(ttf))
    n = nombres(fuente)
    if n.get(1) != "Water Brush" or not n.get(5, "").startswith("Version 1.010"):
        fallar(f"no es Water Brush 1.010: familia {n.get(1)!r}, versión {n.get(5)!r}.")
    if "Reserved Font Name" in n.get(0, ""):
        fallar("el copyright de la fuente declara un «Reserved Font Name».")
    faltan = [c for c in CARACTERES if ord(c) not in fuente.getBestCmap()]
    if faltan:
        fallar(f"al original le faltan caracteres del subset: {''.join(faltan)!r}")


def generar(ttf: bytes) -> bytes:
    """El subset en WOFF2 (las mismas opciones que `pyftsubset --name-IDs='*' --no-hinting …`)."""
    opciones = subset.Options()
    opciones.layout_features = RASGOS
    opciones.name_IDs = ["*"]
    opciones.name_languages = ["*"]
    opciones.hinting = False
    opciones.flavor = "woff2"
    fuente = subset.load_font(io.BytesIO(ttf), opciones)
    recortador = subset.Subsetter(opciones)
    recortador.populate(unicodes=[ord(c) for c in CARACTERES])
    recortador.subset(fuente)
    salida = io.BytesIO()
    subset.save_font(fuente, salida, opciones)
    return salida.getvalue()


def revisar_salida(woff2: bytes) -> TTFont:
    """El subset trae justo los caracteres pedidos y los registros de copyright y licencia."""
    fuente = TTFont(io.BytesIO(woff2))
    cmap = set(fuente.getBestCmap())
    esperado = {ord(c) for c in CARACTERES}
    if cmap != esperado:
        fallar(f"el cmap del subset no es el juego pedido: sobran {cmap - esperado}, faltan {esperado - cmap}.")
    n = nombres(fuente)
    for clave in (0, 1, 13, 14):
        if not n.get(clave):
            fallar(f"al subset le falta el registro name {clave}.")
    return fuente


def tablas(woff2: bytes) -> dict[str, bytes]:
    """Los bytes de cada tabla del archivo, sin decompilar (glyf/loca reconstruidas)."""
    fuente = TTFont(io.BytesIO(woff2))
    return {etiqueta: fuente.reader[etiqueta] for etiqueta in sorted(fuente.reader.keys())}


def main() -> None:
    parser = argparse.ArgumentParser(description="Regenera el subset de Water Brush de la palabra a pincel.")
    parser.add_argument("--origen", type=Path, help="WaterBrush-Regular.ttf ya bajado (se valida su SHA-256)")
    parser.add_argument("--comprobar", action="store_true", help="no escribe: compara lo del repo con lo que generaría")
    args = parser.parse_args()

    licencia = bajar("OFL.txt")
    ttf = bajar("WaterBrush-Regular.ttf", args.origen)
    validar_original(ttf, licencia.decode("utf-8"))
    nuevo = generar(ttf)
    fuente = revisar_salida(nuevo)

    if args.comprobar:
        if not DESTINO.exists():
            fallar(f"no existe {DESTINO.relative_to(RAIZ)}.")
        repo, generado = tablas(DESTINO.read_bytes()), tablas(nuevo)
        distintas = sorted(t for t in set(repo) | set(generado) if repo.get(t) != generado.get(t))
        # git en Windows puede dejar el OFL.txt con CRLF en la copia de trabajo: se compara el texto.
        licencia_igual = LICENCIA.exists() and LICENCIA.read_bytes().replace(CRLF, LF) == licencia
        if distintas or not licencia_igual:
            fallar(
                f"el repo no tiene lo que genera este script: tablas distintas {distintas or 'ninguna'}, "
                f"OFL.txt {'igual' if licencia_igual else 'distinto o ausente'}."
            )
        print(f"[fuente-pincel] OK: {DESTINO.relative_to(RAIZ)} y OFL.txt son los que genera el script.")
        return

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_bytes(nuevo)
    LICENCIA.write_bytes(licencia)
    print(
        f"[fuente-pincel] {DESTINO.relative_to(RAIZ)}: {len(nuevo)} bytes, {fuente['maxp'].numGlyphs} glifos, "
        f"{len(CARACTERES)} caracteres; {LICENCIA.relative_to(RAIZ)} al día."
    )


if __name__ == "__main__":
    main()
