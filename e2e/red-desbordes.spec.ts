/**
 * The overflow net of the responsive pass (medirMaqueta in helpers/responsivo.ts) on a
 * fixed page, so a change to its rule cannot quietly make it pass everything again.
 */
import { expect, test } from "@playwright/test";
import { medirMaqueta } from "./helpers/responsivo";

const ANCHO = 360;
const PAGINA = `<!doctype html>
<style>
  body { margin: 0; font: 16px/1.2 sans-serif; }
  .escena { overflow: clip; }
  .tarjeta { overflow: hidden; }
  .ancho { width: 520px; white-space: nowrap; }
  .scroller { overflow-x: auto; }
</style>
<section class="escena" id="escena"><h2 class="ancho" id="titulo">Un título que no cabe a 360 px</h2></section>
<div class="tarjeta" id="tarjeta"><button class="ancho" id="boton">Un botón cortado</button></div>
<section class="escena"><div aria-hidden="true"><span class="ancho" id="decoracion">✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</span></div></section>
<section class="escena"><img alt="" class="ancho" id="vacia" height="10" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></section>
<div class="tarjeta" data-recorta><p class="ancho" id="marquesina">Marquesina que corre y se corta a propósito</p></div>
<div class="scroller"><table class="ancho" id="tabla"><tr><td>Tabla ancha dentro de un scroller</td></tr></table></div>
`;

test("overflow hidden/clip only excuses decoration or data-recorta; a scroller always does", async ({ page }) => {
  await page.setViewportSize({ width: ANCHO, height: 640 });
  await page.setContent(PAGINA);
  const { fueraDePantalla, scrollHorizontal } = await medirMaqueta(page);

  expect(scrollHorizontal).toBe(0);
  // Cut by an Escena-like overflow: clip and by a card with overflow: hidden: reported, with the box that cut them
  expect(fueraDePantalla).toEqual([
    expect.stringMatching(/^h2#titulo\.ancho .*«Un título que no cabe a 360 px» \(recortado por section#escena\.escena/),
    expect.stringMatching(/^button#boton\.ancho .*«Un botón cortado» \(recortado por div#tarjeta\.tarjeta/),
  ]);
});
