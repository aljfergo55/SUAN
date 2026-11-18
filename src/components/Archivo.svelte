<script lang="ts">
  import { onMount } from 'svelte';
  import '../styles/archivo.css';
  import { leerProgreso, type Progreso } from '../lib/storage';

  interface Item {
    slug: string;
    titulo: string;
    fecha: string;
    n: number;
    href: string;
  }

  let { roscos, inicioHref }: { roscos: Item[]; inicioHref: string } = $props();

  let progresos = $state<Record<string, Progreso | null>>({});

  onMount(() => {
    const p: Record<string, Progreso | null> = {};
    for (const r of roscos) p[r.slug] = leerProgreso(r.slug, r.n);
    progresos = p;
  });

  const formato = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const fechaLarga = (f: string) => (f ? formato.format(new Date(`${f}T12:00:00`)) : '');

  /** Posición del punto k de n sobre un círculo, empezando arriba y en sentido horario. */
  function punto(k: number, n: number) {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + 40 * Math.cos(a), y: 50 + 40 * Math.sin(a) };
  }

  function estado(r: Item): { texto: string; clase: string } {
    const p = progresos[r.slug];
    if (!p) return { texto: 'Nuevo', clase: '' };
    if (p.f === 'fin') {
      const aciertos = [...p.e].filter((c) => c === 'c').length;
      return { texto: `${aciertos}/${r.n}`, clase: 'hecho' };
    }
    return { texto: 'En curso', clase: 'curso' };
  }
</script>

<main class="archivo">
  <header class="archivo-barra">
    <a class="volver" href={inicioHref} aria-label="Volver al rosco">←</a>
    <h1>Archivo</h1>
  </header>

  {#if roscos.length === 0}
    <p class="vacio" style="min-height: 50dvh">Todavía no hay roscos.</p>
  {:else}
    <ul class="lista">
      {#each roscos as r, i (r.slug)}
        {@const e = estado(r)}
        <li style="--i:{i}">
          <a class="item" href={r.href}>
            <svg class="mini" viewBox="0 0 100 100" aria-hidden="true">
              {#each Array(r.n) as _, k}
                {@const c = punto(k, r.n)}
                <circle
                  class="dot e-{progresos[r.slug]?.e[k] ?? 'p'}"
                  cx={c.x}
                  cy={c.y}
                  r={Math.min(7, (Math.PI * 40) / r.n * 0.8)}
                />
              {/each}
            </svg>
            <span class="info">
              <strong>{r.titulo}</strong>
              <small>{[`Nº ${String(roscos.length - i).padStart(2, '0')}`, fechaLarga(r.fecha)].filter(Boolean).join(' · ')}</small>
            </span>
            <span class="estado {e.clase}">{e.texto}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>
