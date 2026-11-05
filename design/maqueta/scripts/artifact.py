"""Empaqueta la maqueta para publicarla como Artifact.
La página principal se publica sin <!doctype>/<html>/<head>/<body> (el visor pone su esqueleto);
las demás páginas (lectura.html) van completas. Copia CSS, JS y sólo las imágenes que se usan.
Uso: python design/maqueta/scripts/artifact.py  ->  design/maqueta/_artifact/
"""
import re, shutil
from pathlib import Path

M = Path(__file__).resolve().parents[1]
OUT = M / "_artifact"
if OUT.exists():
    shutil.rmtree(OUT)
(OUT / "img" / "cartas").mkdir(parents=True)

html = (M / "index.html").read_text(encoding="utf-8")
cuerpo = re.sub(r"(?is)<!doctype[^>]*>|</?html[^>]*>|</?head>|</?body>", "", html)
(OUT / "index.html").write_text(cuerpo.strip() + "\n", encoding="utf-8")
for f in ["lectura.html", "estilos.css", "tinta.js"]:
    shutil.copy(M / f, OUT / f)
shutil.copy(M / "img" / "reverso.svg", OUT / "img" / "reverso.svg")

usadas = set()
for f in ["index.html", "lectura.html"]:
    usadas |= set(re.findall(r'img/cartas/([a-z0-9-]+\.webp)', (M / f).read_text(encoding="utf-8")))
faltan = [u for u in sorted(usadas) if not (M / "img" / "cartas" / u).exists()]
for u in sorted(usadas - set(faltan)):
    shutil.copy(M / "img" / "cartas" / u, OUT / "img" / "cartas" / u)
total = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
print(f"{len(usadas)} cartas usadas, faltan {faltan}, {total / 1024 / 1024:.2f} MB")
print("ARCHIVOS:", [str(p.relative_to(OUT)).replace("\\", "/") for p in sorted(OUT.rglob("*")) if p.is_file() and p.name != "index.html"])
