/**
 * Recarga completa del documento. Vive aparte para que las pruebas puedan sustituirla (jsdom no navega).
 */
export function recargarPagina(): void {
  window.location.reload();
}
