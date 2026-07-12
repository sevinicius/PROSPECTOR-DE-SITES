// graficos.js — wrapper fino do Chart.js (global window.Chart, UMD vendorado) com tema VF.
export const PALETA = ['#E0A83C', '#8C6A26', '#5A5145', '#C8C4BA', '#7A9E7E', '#B05C4A', '#6E7FA3', '#9C8AA5'];
const instancias = {};
export function criarGrafico(canvasId, config) {
  const el = document.getElementById(canvasId);
  if (!el || !window.Chart) return null;
  if (instancias[canvasId]) instancias[canvasId].destroy();
  window.Chart.defaults.color = getComputedStyle(document.body).color;
  window.Chart.defaults.font.family = "'IBM Plex Mono', monospace";
  window.Chart.defaults.font.size = 11;
  instancias[canvasId] = new window.Chart(el, config);
  return instancias[canvasId];
}
