# Pasapalabra

Minijuego del rosco: Astro + Svelte 5 + GSAP, publicado como web estática en GitHub Pages.

## Añadir un rosco

Sube un `.csv` a `src/roscos/` (por ejemplo `2026-12-01-navidad.csv`). Al hacer push, GitHub Actions lo valida, lo publica y aparece solo en el archivo. El más reciente es el de la portada.

```csv
# titulo: Navidad
# fecha: 2026-12-01
# tiempo: 150
letra,tipo,pista,respuesta,alternativas
A,empieza,"Dulce de almendra típico de estas fechas",almendrado,
B,contiene,"Contiene la B: ...",turrón blando,
```

- Las líneas `#` son opcionales. `tiempo` en segundos (por defecto 150; `0` = sin límite). Sin `titulo` se usa el nombre del archivo.
- `tipo`: `empieza` (por defecto) o `contiene`.
- `alternativas`: respuestas extra aceptadas, separadas por `|`.
- Se acepta `,` `;` o tabulador (Excel en español exporta con `;`). No importan tildes ni mayúsculas, pero la Ñ cuenta como letra propia.
- Las letras se ordenan solas (A–Z, Ñ tras la N). El número de letras es el que haya en el archivo.
- Si algo está mal (letra repetida, respuesta que no empieza/contiene la letra…), el build falla indicando archivo y fila.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # lógica y validación de los CSV
npm run build
```

## Publicar en GitHub Pages

1. Crea el repositorio, sube este proyecto a la rama `main`.
2. En *Settings → Pages* elige **Source: GitHub Actions**.
3. Cada push a `main` ejecuta `.github/workflows/deploy.yml`.

La web queda en `https://<usuario>.github.io/<repositorio>/` (el prefijo se configura solo).
