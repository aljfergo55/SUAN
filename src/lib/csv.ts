import { normalizar } from './game';
import type { Pregunta, Rosco, Tipo } from './types';

const sinTildes = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Parser CSV mínimo: comillas dobles, saltos de línea dentro de comillas y delimitador configurable. */
export function parseCsv(texto: string, delimitador: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          comillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      comillas = true;
    } else if (c === delimitador) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo);
      campo = '';
      if (fila.some((x) => x.trim() !== '')) filas.push(fila);
      fila = [];
    } else {
      campo += c;
    }
  }
  fila.push(campo);
  if (fila.some((x) => x.trim() !== '')) filas.push(fila);
  return filas;
}

/** Excel en español exporta con ";" — se detecta mirando la cabecera. */
function detectarDelimitador(cabecera: string): string {
  const comas = (cabecera.match(/,/g) ?? []).length;
  const puntoycoma = (cabecera.match(/;/g) ?? []).length;
  const tabs = (cabecera.match(/\t/g) ?? []).length;
  if (tabs > comas && tabs > puntoycoma) return '\t';
  return puntoycoma > comas ? ';' : ',';
}

const ALIAS: Record<string, string[]> = {
  letra: ['letra'],
  tipo: ['tipo'],
  pista: ['pista', 'definicion', 'pregunta'],
  respuesta: ['respuesta', 'palabra'],
  alternativas: ['alternativas', 'alternativa', 'sinonimos'],
};

function titularDesdeSlug(slug: string): string {
  const limpio = slug.replace(/^\d{4}-\d{2}-\d{2}-?/, '').replace(/[-_]+/g, ' ').trim();
  const base = limpio || slug;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Convierte el contenido de un CSV en un rosco validado.
 * Lanza un Error con el nombre del archivo y la fila si algo no cuadra,
 * para que el build falle de forma clara en lugar de publicar un rosco roto.
 *
 * Formato:
 *   # titulo: Mi rosco          (opcional)
 *   # fecha: 2026-11-19         (opcional)
 *   # tiempo: 150               (opcional, segundos; 0 = sin límite)
 *   letra,tipo,pista,respuesta,alternativas
 *   A,empieza,"Ave rapaz...",águila,
 */
export function parseRosco(raw: string, slug: string): Rosco {
  const fallo = (msg: string): never => {
    throw new Error(`[roscos/${slug}.csv] ${msg}`);
  };

  const lineas = raw.replace(/^﻿/, '').split(/\r?\n/);
  const meta: Record<string, string> = {};
  let inicio = 0;
  for (; inicio < lineas.length; inicio++) {
    const l = lineas[inicio].trim();
    if (l === '') continue;
    if (!l.startsWith('#')) break;
    const m = l.replace(/^#\s*/, '').match(/^([^:]+):\s*(.*)$/);
    if (m) meta[sinTildes(m[1])] = m[2].trim();
  }
  const cuerpo = lineas.slice(inicio).join('\n');
  if (!cuerpo.trim()) fallo('el archivo no tiene filas.');

  const delimitador = detectarDelimitador(lineas[inicio] ?? '');
  const filas = parseCsv(cuerpo, delimitador);
  const cabecera = filas[0].map(sinTildes);

  const col: Record<string, number> = {};
  for (const [campo, nombres] of Object.entries(ALIAS)) {
    col[campo] = cabecera.findIndex((h) => nombres.includes(h));
  }
  for (const obligatoria of ['letra', 'pista', 'respuesta']) {
    if (col[obligatoria] === -1) fallo(`falta la columna "${obligatoria}" en la cabecera.`);
  }

  const preguntas: Pregunta[] = [];
  const vistas = new Set<string>();

  filas.slice(1).forEach((f, idx) => {
    const n = idx + 2; // número de fila contando la cabecera como 1
    const get = (campo: string) => (col[campo] >= 0 ? (f[col[campo]] ?? '').trim() : '');

    const letra = normalizar(get('letra')).toUpperCase();
    if ([...letra].length !== 1) fallo(`fila ${n}: la letra "${get('letra')}" debe ser un solo carácter.`);
    if (vistas.has(letra)) fallo(`fila ${n}: la letra ${letra} está repetida.`);
    vistas.add(letra);

    const tipoRaw = sinTildes(get('tipo'));
    let tipo: Tipo;
    if (tipoRaw === '' || tipoRaw === 'empieza') tipo = 'empieza';
    else if (tipoRaw === 'contiene') tipo = 'contiene';
    else return fallo(`fila ${n}: el tipo "${get('tipo')}" debe ser "empieza" o "contiene".`);

    const pista = get('pista');
    const respuesta = get('respuesta');
    if (!pista) fallo(`fila ${n} (${letra}): falta la pista.`);
    if (!respuesta) fallo(`fila ${n} (${letra}): falta la respuesta.`);

    const resp = normalizar(respuesta);
    const l = letra.toLowerCase();
    if (tipo === 'empieza' && !resp.startsWith(l)) {
      fallo(`fila ${n}: la respuesta "${respuesta}" no empieza por ${letra}.`);
    }
    if (tipo === 'contiene' && !resp.includes(l)) {
      fallo(`fila ${n}: la respuesta "${respuesta}" no contiene la ${letra}.`);
    }

    const alternativas = get('alternativas')
      .split('|')
      .map((x) => x.trim())
      .filter(Boolean);

    preguntas.push({ letra, tipo, pista, respuesta, alternativas });
  });

  if (preguntas.length === 0) fallo('no hay ninguna pregunta.');

  // Orden alfabético español (la Ñ queda después de la N)
  const colador = new Intl.Collator('es');
  preguntas.sort((a, b) => colador.compare(a.letra, b.letra));

  let tiempo = 150;
  if (meta['tiempo'] !== undefined) {
    const t = Number(meta['tiempo']);
    if (!Number.isFinite(t) || t < 0) fallo(`"tiempo" debe ser un número de segundos (0 = sin límite).`);
    tiempo = Math.round(t);
  }

  const fecha = meta['fecha'] ?? '';
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) fallo(`"fecha" debe tener el formato AAAA-MM-DD.`);

  return {
    slug,
    titulo: meta['titulo'] || titularDesdeSlug(slug),
    fecha,
    tiempo,
    preguntas,
  };
}
