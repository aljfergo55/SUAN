import { hashClave, normalizarClave } from '../src/lib/clave';

const clave = process.argv[2];
if (!clave) {
  console.error('Uso: npm run clave -- "la clave nueva"');
  process.exit(1);
}
console.log(`export const CLAVE_HASH = '${hashClave(normalizarClave(clave))}';`);
