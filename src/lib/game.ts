import type { Estado, Pregunta } from './types';

/**
 * Normaliza texto para comparar respuestas:
 * minúsculas, sin tildes ni diéresis, sin signos y con espacios colapsados.
 * La ñ se conserva como letra distinta de la n.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFC') // une "n" + "◌̃" en "ñ" antes de tocar nada
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'ñ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function esCorrecta(texto: string, p: Pregunta): boolean {
  const intento = normalizar(texto);
  if (!intento) return false;
  return [p.respuesta, ...p.alternativas].some((r) => normalizar(r) === intento);
}

/**
 * Índice de la siguiente pregunta sin resolver (pendiente o pasada),
 * avanzando de forma circular. Puede devolver `actual` si es la única que queda.
 * Devuelve -1 si no queda ninguna.
 */
export function siguiente(estados: Estado[], actual: number): number {
  const n = estados.length;
  for (let k = 1; k <= n; k++) {
    const i = (actual + k) % n;
    if (estados[i] === 'p' || estados[i] === 's') return i;
  }
  return -1;
}

export function resumen(estados: Estado[]) {
  let aciertos = 0;
  let fallos = 0;
  let sinResponder = 0;
  for (const e of estados) {
    if (e === 'c') aciertos++;
    else if (e === 'w') fallos++;
    else sinResponder++;
  }
  return { aciertos, fallos, sinResponder, total: estados.length };
}

export function formatearTiempo(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
