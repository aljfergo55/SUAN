/**
 * Protección DECORATIVA: todo se comprueba en el navegador, así que cualquiera que
 * lea el código puede saltársela. Guardamos solo un hash para que la clave no esté
 * a la vista en el repositorio, nada más.
 *
 * Para cambiar la clave:  npm run clave -- "la nueva clave"
 * y pega el resultado en CLAVE_HASH (src/lib/config.ts).
 */

/** Ignora mayúsculas, tildes sueltas de teclado y espacios al principio o al final. */
export function normalizarClave(texto: string): string {
  return texto.normalize('NFC').trim().toLowerCase();
}

/** Hash rápido y síncrono (cyrb53). No es criptográfico; vale para una puerta de adorno. */
export function hashClave(texto: string, semilla = 0): string {
  let h1 = 0xdeadbeef ^ semilla;
  let h2 = 0x41c6ce57 ^ semilla;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export function claveCorrecta(intento: string, hashEsperado: string): boolean {
  return hashClave(normalizarClave(intento)) === hashEsperado;
}
