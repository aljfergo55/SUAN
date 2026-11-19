import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv, parseRosco } from '../src/lib/csv';
import { esCorrecta, formatearTiempo, normalizar, resumen, siguiente } from '../src/lib/game';
import { claveCorrecta } from '../src/lib/clave';
import { CLAVE_HASH } from '../src/lib/config';
import type { Estado, Pregunta } from '../src/lib/types';

let ok = 0;
const test = (nombre: string, fn: () => void) => {
  fn();
  ok++;
  console.log('  ✓', nombre);
};

const p = (respuesta: string, alternativas: string[] = []): Pregunta => ({
  letra: 'X',
  tipo: 'empieza',
  pista: '',
  respuesta,
  alternativas,
});

console.log('normalizar / esCorrecta');
test('ignora tildes, mayúsculas y espacios', () => {
  assert.equal(normalizar('  ÁGUILA '), 'aguila');
  assert.ok(esCorrecta('aguila', p('águila')));
  assert.ok(esCorrecta('PINGUINO', p('pingüino')));
});
test('la ñ no se confunde con la n', () => {
  assert.ok(!esCorrecta('ano', p('año')));
  assert.ok(esCorrecta('AÑO', p('año')));
  assert.ok(esCorrecta('año', p('año'))); // ñ descompuesta (n + tilde)
});
test('alternativas y puntuación', () => {
  assert.ok(esCorrecta('La luna.', p('luna', ['la luna'])));
  assert.ok(!esCorrecta('', p('luna')));
  assert.ok(!esCorrecta('sol', p('luna')));
});

console.log('siguiente / resumen');
test('avance circular saltando resueltas', () => {
  const e: Estado[] = ['c', 'p', 'w', 's', 'p'];
  assert.equal(siguiente(e, 1), 3);
  assert.equal(siguiente(e, 3), 4);
  assert.equal(siguiente(e, 4), 1);
});
test('si solo queda una vuelve a ella; si no queda ninguna, -1', () => {
  assert.equal(siguiente(['c', 's', 'w'], 1), 1);
  assert.equal(siguiente(['c', 'w', 'c'], 1), -1);
});
test('resumen y tiempo', () => {
  assert.deepEqual(resumen(['c', 'c', 'w', 'p', 's']), { aciertos: 2, fallos: 1, sinResponder: 2, total: 5 });
  assert.equal(formatearTiempo(150), '2:30');
  assert.equal(formatearTiempo(0.2), '0:01');
  assert.equal(formatearTiempo(-3), '0:00');
});

console.log('CSV');
test('comillas, comas y saltos de línea dentro de campo', () => {
  const filas = parseCsv('a,"b, c","d\n""e"""\n1,2,3\n', ',');
  assert.deepEqual(filas, [['a', 'b, c', 'd\n"e"'], ['1', '2', '3']]);
});
test('delimitador ";", BOM, cabecera con tildes y metadatos', () => {
  const r = parseRosco(
    '﻿# Título: Prueba\n# tiempo: 0\nLetra;Tipo;Definición;Respuesta\nB;;"Cosa";barco\nA;;"Otra";avión\n',
    '2026-01-01-prueba',
  );
  assert.equal(r.titulo, 'Prueba');
  assert.equal(r.tiempo, 0);
  assert.deepEqual(r.preguntas.map((x) => x.letra), ['A', 'B']);
});
test('orden español: la Ñ va después de la N', () => {
  const r = parseRosco('letra,tipo,pista,respuesta\nO,,x,oso\nÑ,contiene,x,año\nN,,x,nube\n', 'o');
  assert.equal(r.preguntas.map((x) => x.letra).join(''), 'NÑO');
  assert.equal(r.preguntas[2].tipo, 'empieza'); // tipo omitido => empieza
});
test('título por defecto desde el nombre del archivo', () => {
  assert.equal(parseRosco('letra,pista,respuesta\nA,x,ala\n', '2026-11-19-mi-rosco').titulo, 'Mi rosco');
});
const debeFallar = (csv: string, trozo: string) =>
  assert.throws(() => parseRosco(csv, 't'), (e: Error) => e.message.includes(trozo));
test('errores claros', () => {
  debeFallar('letra,pista,respuesta\nA,x,barco\n', 'no empieza por A');
  debeFallar('letra,tipo,pista,respuesta\nZ,contiene,x,barco\n', 'no contiene la Z');
  debeFallar('letra,pista,respuesta\nA,x,ala\nA,y,avión\n', 'repetida');
  debeFallar('letra,tipo,pista,respuesta\nA,raro,x,ala\n', 'debe ser "empieza" o "contiene"');
  debeFallar('letra,pista,respuesta\nA,,ala\n', 'falta la pista');
  debeFallar('pista,respuesta\nx,ala\n', 'falta la columna "letra"');
  debeFallar('# tiempo: mucho\nletra,pista,respuesta\nA,x,ala\n', 'tiempo');
});

test('puerta: la clave correcta entra y las demás no', () => {
  assert.ok(claveCorrecta('esasodaestamuyblanca', CLAVE_HASH));
  assert.ok(claveCorrecta('  EsaSodaEstaMuyBlanca ', CLAVE_HASH));
  assert.ok(!claveCorrecta('esasodaestamuyblanc', CLAVE_HASH));
  assert.ok(!claveCorrecta('', CLAVE_HASH));
});

console.log('CSV de ejemplo del proyecto');
const dir = join(import.meta.dirname, '..', 'src', 'roscos');
for (const f of readdirSync(dir).filter((x) => x.endsWith('.csv'))) {
  test(f, () => {
    const r = parseRosco(readFileSync(join(dir, f), 'utf8'), f.replace(/\.csv$/, ''));
    assert.ok(r.preguntas.length >= 5);
  });
}

console.log(`\n${ok} pruebas correctas`);
