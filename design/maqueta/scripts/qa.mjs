// QA de la maqueta «Dos tintas». Uso: node design/maqueta/scripts/qa.mjs  (sirve design/maqueta en un puerto libre)
import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire("file:///C:/Users/guill/dev/lant/package.json");
const puppeteer = require("puppeteer-core");

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAL = path.join(RAIZ, "_qa"); fs.mkdirSync(SAL, { recursive: true });
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg" };
const srv = http.createServer((req, res) => {
  const ruta = path.join(RAIZ, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  fs.readFile(ruta, (err, buf) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "content-type": TIPOS[path.extname(ruta)] || "application/octet-stream" }); res.end(buf); });
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${srv.address().port}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--hide-scrollbars"] });
const informe = {};

async function abrir(url, w, h, opts = {}) {
  const p = await b.newPage();
  const errores = [];
  p.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  p.on("pageerror", (e) => errores.push(String(e)));
  await p.setViewport({ width: w, height: h });
  if (opts.reducido) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  if (opts.sinJS) await p.setJavaScriptEnabled(false);
  await p.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await p.evaluate(() => document.fonts && document.fonts.ready);
  await sleep(800);
  return { p, errores };
}
async function sonda(p) {
  return p.evaluate(() => {
    const rotas = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.getAttribute("src"));
    const fuera = [...document.querySelectorAll("body *")].filter((e) => {
      const r = e.getBoundingClientRect(); if (!r.width) return false;
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "hidden" || o === "clip") return false; }
      return r.right > innerWidth + 1;
    }).map((e) => e.className || e.tagName).slice(0, 6);
    return { scrollW: document.documentElement.scrollWidth, ancho: innerWidth, alto: document.documentElement.scrollHeight, rotas, fuera };
  });
}
const shot = (p, nombre, clip) => p.screenshot({ path: path.join(SAL, nombre), type: "jpeg", quality: 72, ...(clip ? { clip } : {}) });

for (const [w, h, sufijo] of [[1440, 900, "1440"], [390, 844, "390"]]) {
  // Portada
  const { p, errores } = await abrir(BASE + "index.html", w, h);
  informe[`portada-${sufijo}`] = await sonda(p);
  await shot(p, `portada-${sufijo}-01-hero.jpg`);
  const e2 = await p.evaluate(() => { const s = document.querySelector(".e2"); return { top: s.offsetTop, alto: s.offsetHeight }; });
  for (const [k, f] of [["a", 0.02], ["b", 0.35], ["c", 0.6], ["d", 0.97]]) {
    await p.evaluate((y) => scrollTo(0, y), e2.top + (e2.alto - h) * f);
    await sleep(500);
    await shot(p, `portada-${sufijo}-02${k}-grabado.jpg`);
  }
  await p.evaluate(() => document.querySelector("#hoy").scrollIntoView());
  await sleep(600);
  await shot(p, `portada-${sufijo}-03a-carta.jpg`);
  const caja = await p.evaluate(() => { const r = document.querySelector(".e3 .carta").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.mouse.click(caja.x + caja.w * 0.45, caja.y + caja.h * 0.4);
  await sleep(750);
  await shot(p, `portada-${sufijo}-03b-quemando.jpg`);
  await sleep(1800);
  await shot(p, `portada-${sufijo}-03c-revelada.jpg`);
  for (const [k, sel] of [["04", ".e4"], ["05", ".e5"], ["06", ".e6"]]) {
    await p.evaluate((s) => document.querySelector(s).scrollIntoView(), sel);
    await sleep(900);
    await shot(p, `portada-${sufijo}-${k}.jpg`);
  }
  informe[`portada-${sufijo}`].errores = errores;
  await p.close();

  // Lectura
  const L = await abrir(BASE + "lectura.html", w, h);
  informe[`lectura-${sufijo}`] = await sonda(L.p);
  await shot(L.p, `lectura-${sufijo}-a.jpg`);
  await L.p.click("[data-todas]");
  await sleep(1300);
  await shot(L.p, `lectura-${sufijo}-b-quemando.jpg`);
  await sleep(2600);
  await L.p.evaluate(() => scrollTo(0, 0));
  await shot(L.p, `lectura-${sufijo}-c-reveladas.jpg`);
  await L.p.evaluate(() => document.querySelector(".interpretacion").scrollIntoView());
  await sleep(1100);
  await shot(L.p, `lectura-${sufijo}-d-interpretacion.jpg`);
  informe[`lectura-${sufijo}`].abiertas = await L.p.evaluate(() => document.querySelectorAll(".carta.abierta").length);
  informe[`lectura-${sufijo}`].errores = L.errores;
  await L.p.close();
}

// Reduced motion: nada corriendo, nada invisible
for (const pag of ["index.html", "lectura.html"]) {
  const { p } = await abrir(BASE + pag, 1440, 900, { reducido: true });
  informe[`reducido-${pag}`] = await p.evaluate(() => ({
    corriendo: document.getAnimations().filter((a) => a.playState === "running").map((a) => a.animationName || a.constructor.name),
    invisibles: [...document.querySelectorAll(".revelar")].filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length,
  }));
  await p.close();
}
// Sin JS: todo el contenido visible
for (const pag of ["index.html", "lectura.html"]) {
  const { p } = await abrir(BASE + pag, 1440, 900, { sinJS: true });
  informe[`sinjs-${pag}`] = await p.evaluate(() => ({
    cartasVisibles: [...document.querySelectorAll(".carta > img:first-child")].filter((i) => i.getBoundingClientRect().width > 0 && getComputedStyle(i).display !== "none").length,
    reversosVisibles: [...document.querySelectorAll(".reverso")].filter((i) => getComputedStyle(i).display !== "none").length,
    texto: document.body.innerText.length,
  }));
  await shot(p, `sinjs-${pag.replace(".html", "")}.jpg`);
  await p.close();
}
console.log(JSON.stringify(informe, null, 1));
await b.close(); srv.close();
