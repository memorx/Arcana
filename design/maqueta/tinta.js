// Arcana · «Dos tintas». Maqueta: hora del día, revelados, grabado → partículas → lectura, y papel que se quema.
// Sin dependencias. Todo bucle de dibujo se detiene solo. Con reduced-motion no hay partículas ni quemado.
(() => {
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const suave = (t) => t * t * (3 - 2 * t);
  const mod = (x, n) => ((x % n) + n) % n;

  // ---------- La hora del día: tonalpohualli (correlación GMT 584283), señor de la noche y luna ----------
  const SIGNOS = [["Cipactli", "Lagarto"], ["Ehécatl", "Viento"], ["Calli", "Casa"], ["Cuetzpalin", "Lagartija"], ["Cóatl", "Serpiente"], ["Miquiztli", "Muerte"], ["Mázatl", "Venado"], ["Tochtli", "Conejo"], ["Atl", "Agua"], ["Itzcuintli", "Perro"], ["Ozomatli", "Mono"], ["Malinalli", "Hierba"], ["Ácatl", "Caña"], ["Océlotl", "Jaguar"], ["Cuauhtli", "Águila"], ["Cozcacuauhtli", "Zopilote"], ["Ollin", "Movimiento"], ["Técpatl", "Pedernal"], ["Quiáhuitl", "Lluvia"], ["Xóchitl", "Flor"]];
  const SENORES = ["Xiuhtecuhtli", "Itztli", "Piltzintecuhtli", "Centéotl", "Mictlantecuhtli", "Chalchiuhtlicue", "Tlazoltéotl", "Tepeyóllotl", "Tláloc"];
  const NUM_NAHUATL = ["Ce", "Ome", "Yei", "Nahui", "Macuilli", "Chicuace", "Chicome", "Chicuei", "Chiucnahui", "Mahtlactli", "Mahtlactli once", "Mahtlactli omome", "Mahtlactli omei"];

  function diaDe(fecha) {
    // Día civil local (lo que ve la persona), como fecha UTC a mediodía.
    const jdn = Math.floor(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / 864e5) + 2440588;
    const d = jdn - 584283;
    const numero = mod(d + 3, 13) + 1;
    const signo = mod(d + 19, 20);
    const ciclo = mod(d + 159, 260);
    const trecena = Math.floor(ciclo / 13);
    const sinodico = 29.530588853;
    const edad = mod(jdn - 2451550.1, sinodico);
    const luz = Math.round(((1 - Math.cos((2 * Math.PI * edad) / sinodico)) / 2) * 100);
    const fases = [[1.85, "nueva"], [5.54, "creciente"], [9.23, "cuarto creciente"], [12.92, "gibosa creciente"], [16.61, "llena"], [20.3, "gibosa menguante"], [23.99, "cuarto menguante"], [27.68, "menguante"], [99, "nueva"]];
    const fase = fases.find(([lim]) => edad < lim)[1];
    return {
      numero, signo: SIGNOS[signo], senor: SENORES[ciclo % 9], fase, luz,
      trecena: `${NUM_NAHUATL[0]} ${SIGNOS[mod(trecena * 13, 20)][0]}`, indiceSigno: signo,
    };
  }

  const hoy = new Date();
  const dia = diaDe(hoy);
  const fechaTxt = hoy.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
  document.querySelectorAll("[data-hora]").forEach((el) => {
    const corta = hoy.toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(/\./g, "");
    el.innerHTML = `<span class="larga"><b>${fechaTxt}</b> · ${dia.numero} ${dia.signo[0]} <span aria-hidden="true">(</span>${dia.signo[1]}<span aria-hidden="true">)</span> · Señor de la noche: ${dia.senor} · Luna ${dia.fase} ${dia.luz}%</span><span class="corta" aria-hidden="true">${corta} · ${dia.numero} ${dia.signo[0]} · ${dia.senor} · Luna ${dia.luz}%</span>`;
  });
  document.querySelectorAll("[data-tonalli]").forEach((el) => { el.textContent = `${dia.numero} ${dia.signo[0]}, ${dia.signo[1]}`; });
  document.querySelectorAll("[data-tonalli-corto]").forEach((el) => { el.textContent = `${dia.numero} ${dia.signo[0]}`; });
  document.querySelectorAll("[data-trecena]").forEach((el) => { el.textContent = dia.trecena; });
  document.querySelectorAll("[data-senor]").forEach((el) => { el.textContent = dia.senor; });
  document.querySelectorAll("[data-luna]").forEach((el) => { el.textContent = `${dia.fase[0].toUpperCase()}${dia.fase.slice(1)} · ${dia.luz}%`; });
  document.querySelectorAll("[data-fecha]").forEach((el) => { el.textContent = hoy.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }); });
  document.querySelectorAll(".marquesina li[data-i]").forEach((li) => li.classList.toggle("hoy", Number(li.dataset.i) === dia.indiceSigno));

  // ---------- Revelados al entrar (con red de seguridad para saltos por ancla) ----------
  const revelables = [...document.querySelectorAll(".revelar")];
  if ("IntersectionObserver" in window && !reducido) {
    const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    revelables.forEach((el) => io.observe(el));
    addEventListener("scroll", () => revelables.forEach((el) => { if (el.getBoundingClientRect().bottom < 0) el.classList.add("visible"); }), { passive: true });
  } else revelables.forEach((el) => el.classList.add("visible"));

  // ---------- Escena 2: el grabado se deshace en partículas y se recompone en la lectura ----------
  const e2 = document.querySelector(".e2");
  const angosto = matchMedia("(max-width: 820px)");
  if (e2) {
    const lienzo = e2.querySelector(".lienzo");
    const canvas = lienzo.querySelector("canvas");
    const grabado = lienzo.querySelector(".grabado");
    const texto = lienzo.querySelector(".lectura-muestra");
    const ctx = canvas.getContext("2d");
    let pts = [], ancho = 0, alto = 0, pendiente = false;
    const SALIDA = 0.56, VIAJE = 0.4;   // en unidades de avance: cuándo sale cada renglón y cuánto tarda en llegar

    const fijar = (c, t) => { lienzo.style.setProperty("--p-corte", c); lienzo.style.setProperty("--p-texto", t); };
    const estatico = () => reducido || angosto.matches;

    function muestrear(fuente, caja, paso, umbral, limite) {
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(caja.w / paso)); off.height = Math.max(1, Math.round(caja.h / paso));
      const o = off.getContext("2d", { willReadFrequently: true });
      fuente(o, off.width, off.height);
      const d = o.getImageData(0, 0, off.width, off.height).data;
      const out = [];
      for (let y = 0; y < off.height; y++) for (let x = 0; x < off.width; x++) {
        const i = (y * off.width + x) * 4;
        const lum = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        if (d[i + 3] > 40 && lum < umbral) out.push([caja.x + x * paso, caja.y + y * paso]);
      }
      for (let i = out.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [out[i], out[j]] = [out[j], out[i]]; }
      return out.slice(0, limite);
    }

    function construir() {
      const cr = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      ancho = cr.width; alto = cr.height;
      canvas.width = Math.round(ancho * dpr); canvas.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (estatico() || !grabado.complete || !grabado.naturalWidth) { pts = []; return; }
      const ir = grabado.getBoundingClientRect();
      const cajaG = { x: ir.left - cr.left, y: ir.top - cr.top, w: ir.width, h: ir.height };
      let origen;
      try { origen = muestrear((o, w, h) => o.drawImage(grabado, 0, 0, w, h), cajaG, 2.4, 118, 5200); }
      catch { pts = []; return; } // lienzo contaminado (p. ej. abierto como file://): sin partículas
      // Destino: las líneas reales del texto, dibujadas con su misma fuente y ancho.
      const tr = texto.getBoundingClientRect();
      const cajaT = { x: tr.left - cr.left, y: tr.top - cr.top, w: tr.width, h: tr.height };
      const cs = getComputedStyle(texto);
      const destino = muestrear((o, w, h) => {
        const esc = w / cajaT.w; o.scale(esc, esc); o.fillStyle = "#000";
        o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; o.textBaseline = "top";
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
        let y = 0;
        for (const p of texto.querySelectorAll("p")) {
          const palabras = p.textContent.trim().split(/\s+/); let linea = "";
          for (const w2 of palabras) {
            const prueba = linea ? linea + " " + w2 : w2;
            if (o.measureText(prueba).width > cajaT.w && linea) { o.fillText(linea, 0, y); y += lh; linea = w2; } else linea = prueba;
          }
          if (linea) { o.fillText(linea, 0, y); y += lh; }
          y += lh * 0.7;
          if (p.classList.contains("firma")) break;
        }
      }, cajaT, 1.6, 140, 6000);
      if (!destino.length || !origen.length) { pts = []; return; }
      origen.sort((a, b) => a[1] - b[1]); destino.sort((a, b) => a[1] - b[1]);
      // Sale primero lo de arriba del grabado y llega primero a las primeras líneas del texto.
      pts = origen.map((o, i) => {
        const d = destino[Math.floor((i / origen.length) * destino.length)];
        const yN = clamp((o[1] - cajaG.y) / cajaG.h);
        return { sx: o[0], sy: o[1], dx: d[0], dy: d[1], nx: (Math.random() - 0.5) * 2, ny: (Math.random() - 0.5) * 2, r: Math.random() < 0.06, sale: yN * SALIDA + Math.random() * 0.03 };
      });
    }

    function progreso() {
      const r = e2.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - innerHeight));
    }

    function dibujar() {
      pendiente = false;
      if (estatico() || !pts.length) { fijar(0, 1); ctx.clearRect(0, 0, ancho, alto); return; }
      const p = progreso();
      const m = clamp((p - 0.06) / 0.76);           // avance del viaje
      const t = clamp((p - 0.84) / 0.12);           // aparece el texto real
      fijar(clamp(m / SALIDA), t);
      ctx.clearRect(0, 0, ancho, alto);
      if (m <= 0 || t >= 1) return;
      const alfa = 1 - t;
      for (const q of pts) {
        if (m < q.sale) continue;                    // aún es parte del grabado
        const k = suave(clamp((m - q.sale) / VIAJE));
        const arco = Math.sin(k * Math.PI);
        const x = q.sx + (q.dx - q.sx) * k + arco * q.nx * 16;
        const y = q.sy + (q.dy - q.sy) * k + arco * q.ny * 22 - arco * 26;
        ctx.fillStyle = q.r ? `rgba(228,0,124,${alfa})` : `rgba(14,13,12,${alfa * (0.55 + 0.45 * (1 - arco))})`;
        const s = 1.3 + arco * 0.8;
        ctx.fillRect(x, y, s, s);
      }
    }
    const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(dibujar); } };
    const reconstruir = () => { construir(); pedir(); };
    if (grabado.complete) reconstruir(); else grabado.addEventListener("load", reconstruir, { once: true });
    if (document.fonts) document.fonts.ready.then(reconstruir);
    addEventListener("scroll", pedir, { passive: true });
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(reconstruir, 180); });
    angosto.addEventListener?.("change", reconstruir);
  }

  // ---------- El papel se quema: revela la carta desde el punto tocado ----------
  function ruido(w, h) {
    // Ruido de valor en dos octavas, suavizado: da bordes de quemadura irregulares.
    const capa = (gx, gy) => {
      const g = Array.from({ length: (gx + 1) * (gy + 1) }, () => Math.random());
      return (x, y) => {
        const fx = (x / w) * gx, fy = (y / h) * gy, x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = suave(fx - x0), ty = suave(fy - y0);
        const v = (i, j) => g[Math.min(j, gy) * (gx + 1) + Math.min(i, gx)];
        const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * tx;
        const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * tx;
        return a + (b - a) * ty;
      };
    };
    const c1 = capa(6, 10), c2 = capa(18, 30);
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = c1(x, y) * 0.68 + c2(x, y) * 0.32;
    return out;
  }

  function quemar(carta, fx, fy, alTerminar) {
    if (carta.classList.contains("abierta") || carta.classList.contains("quemando")) return;
    const reverso = carta.querySelector(".reverso");
    if (reducido || !reverso) { carta.classList.add("abierta"); alTerminar?.(); return; }
    const W = 150, H = 260;
    const base = document.createElement("canvas"); base.width = W; base.height = H;
    const glow = document.createElement("canvas"); glow.width = W; glow.height = H; glow.className = "resplandor";
    base.setAttribute("aria-hidden", "true"); glow.setAttribute("aria-hidden", "true");
    const bctx = base.getContext("2d"), gctx = glow.getContext("2d");
    bctx.drawImage(reverso, 0, 0, W, H);
    const dorso = bctx.getImageData(0, 0, W, H);
    const n = ruido(W, H);
    const px = fx * W, py = fy * H;
    const maxD = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - px, y - py)));
    const v = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; v[i] = (Math.hypot(x - px, y - py) / maxD) * 0.74 + n[i] * 0.36; }
    carta.append(base, glow); carta.classList.add("quemando");
    const img = bctx.createImageData(W, H), gimg = gctx.createImageData(W, H);
    const dur = 1700, t0 = performance.now(), banda = 0.085, chamusco = 0.06;
    function cuadro(ahora) {
      const t = -0.05 + suave(clamp((ahora - t0) / dur)) * 1.25;
      const a = img.data, ga = gimg.data, d = dorso.data;
      for (let i = 0; i < W * H; i++) {
        const j = i * 4, vi = v[i];
        if (vi < t - banda) { a[j + 3] = 0; ga[j + 3] = 0; continue; }
        if (vi < t) {
          const k = (t - vi) / banda;                 // 0 en el frente, 1 al consumirse
          const r = 255, g = Math.round(107 + 148 * k), b = Math.round(181 + 74 * k);
          a[j] = r; a[j + 1] = g; a[j + 2] = b; a[j + 3] = Math.round(255 * (1 - k * 0.85));
          ga[j] = 228; ga[j + 1] = 0; ga[j + 2] = 124; ga[j + 3] = Math.round(220 * (1 - k));
          continue;
        }
        const c = vi < t + chamusco ? 0.35 + 0.65 * ((vi - t) / chamusco) : 1;  // borde chamuscado
        a[j] = d[j] * c; a[j + 1] = d[j + 1] * c * 0.92; a[j + 2] = d[j + 2] * c * 0.9; a[j + 3] = 255; ga[j + 3] = 0;
      }
      bctx.putImageData(img, 0, 0); gctx.putImageData(gimg, 0, 0);
      if (ahora - t0 < dur) requestAnimationFrame(cuadro);
      else { base.remove(); glow.remove(); carta.classList.remove("quemando"); carta.classList.add("abierta"); alTerminar?.(); }
    }
    requestAnimationFrame(cuadro);
  }

  function prepararCarta(carta, alAbrir) {
    carta.addEventListener("click", (ev) => {
      const r = carta.getBoundingClientRect();
      const fx = ev.clientX ? clamp((ev.clientX - r.left) / r.width) : 0.5;
      const fy = ev.clientY ? clamp((ev.clientY - r.top) / r.height) : 0.62;
      quemar(carta, fx, fy, () => { carta.setAttribute("aria-label", carta.dataset.revelada || "Carta revelada"); alAbrir?.(carta); });
    });
  }

  // Portada: la carta del día
  const e3 = document.querySelector(".e3");
  if (e3) { const c = e3.querySelector(".carta"); if (c) prepararCarta(c, () => e3.classList.add("revelada")); }

  // App: la tirada de tres
  const tirada = document.querySelector(".tirada");
  if (tirada) {
    const cartas = [...tirada.querySelectorAll(".carta")];
    const interp = document.querySelector(".interpretacion");
    const revisar = () => { if (cartas.every((c) => c.classList.contains("abierta"))) { interp?.classList.add("visible"); document.querySelector("[data-todas]")?.setAttribute("hidden", ""); } };
    cartas.forEach((c) => prepararCarta(c, (carta) => { carta.closest(".pos")?.classList.add("lista"); revisar(); }));
    document.querySelector("[data-todas]")?.addEventListener("click", () => {
      cartas.filter((c) => !c.classList.contains("abierta")).forEach((c, i) => setTimeout(() => c.click(), i * 420));
    });
  }
})();
