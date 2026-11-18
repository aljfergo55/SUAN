import { parseRosco } from './csv';
import type { Rosco } from './types';

// Todos los CSV de src/roscos se leen y validan en el build.
const archivos = import.meta.glob('../roscos/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const clave = (r: Rosco) => r.fecha || r.slug.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '';

/** Del más reciente al más antiguo. El primero es el que se juega en la portada. */
export const roscos: Rosco[] = Object.entries(archivos)
  .map(([ruta, raw]) => parseRosco(raw, ruta.split('/').pop()!.replace(/\.csv$/, '')))
  .sort((a, b) => clave(b).localeCompare(clave(a)) || b.slug.localeCompare(a.slug));

/** Ruta absoluta respetando el prefijo de GitHub Pages (/<repositorio>). */
export const href = (ruta = '') => import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + ruta;
