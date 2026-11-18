import type { Estado } from './types';

export interface Progreso {
  /** Un carácter por pregunta: p, s, c, w */
  e: string;
  /** Índice de la pregunta actual */
  a: number;
  /** Segundos usados */
  u: number;
  /** Fase guardada */
  f: 'jugando' | 'fin';
}

const clave = (slug: string) => `pasapalabra:v1:${slug}`;

export function leerProgreso(slug: string, n: number): Progreso | null {
  try {
    const raw = localStorage.getItem(clave(slug));
    if (!raw) return null;
    const p = JSON.parse(raw) as Progreso;
    if (typeof p.e !== 'string' || p.e.length !== n || !/^[pscw]+$/.test(p.e)) return null;
    return p;
  } catch {
    return null;
  }
}

export function guardarProgreso(slug: string, estados: Estado[], actual: number, usado: number, fase: Progreso['f']) {
  try {
    const p: Progreso = { e: estados.join(''), a: actual, u: Math.round(usado * 10) / 10, f: fase };
    localStorage.setItem(clave(slug), JSON.stringify(p));
  } catch {
    /* almacenamiento no disponible: el juego sigue funcionando sin guardar */
  }
}

export function borrarProgreso(slug: string) {
  try {
    localStorage.removeItem(clave(slug));
  } catch {
    /* nada */
  }
}
