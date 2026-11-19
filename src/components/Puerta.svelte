<script lang="ts">
  import { gsap } from 'gsap';
  import { claveCorrecta } from '../lib/clave';

  interface Props {
    hash: string;
    almacen: string;
    marca: string;
  }
  let { hash, almacen, marca }: Props = $props();

  let valor = $state('');
  let ver = $state(false);
  let error = $state(false);
  let abierta = $state(false);
  let raiz: HTMLDivElement;
  let caja: HTMLFormElement;
  let campo: HTMLInputElement;

  const reducido = () =>
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  $effect(() => {
    // En móvil no enfocamos solos: abriría el teclado y taparía la puerta.
    if (matchMedia('(pointer: fine)').matches) campo?.focus();
  });

  function enviar(e: SubmitEvent) {
    e.preventDefault();
    if (abierta) return;
    if (claveCorrecta(valor, hash)) {
      abierta = true;
      error = false;
      try {
        localStorage.setItem(almacen, hash);
      } catch {}
      campo.blur();
      const fin = () => {
        document.documentElement.dataset.acceso = 'ok';
      };
      if (reducido()) return fin();
      gsap
        .timeline({ onComplete: fin })
        .to(caja, { scale: 1.03, duration: 0.18, ease: 'power2.out' })
        .to(raiz, { opacity: 0, duration: 0.45, ease: 'power1.inOut' }, '>-0.02');
    } else {
      error = true;
      if (!reducido()) {
        gsap.fromTo(
          caja,
          { x: 0 },
          { keyframes: [{ x: -9 }, { x: 8 }, { x: -6 }, { x: 4 }, { x: 0 }], duration: 0.4, ease: 'power2.out' }
        );
      }
      valor = '';
      campo.focus();
    }
  }
</script>

<div class="puerta" bind:this={raiz} role="dialog" aria-modal="true" aria-label="Acceso">
  <form class="puerta-caja" bind:this={caja} onsubmit={enviar} autocomplete="off">
    <svg class="puerta-sello" viewBox="0 0 100 100" aria-hidden="true">
      {#each Array.from({ length: 24 }) as _, i}
        {@const a = (i / 24) * Math.PI * 2 - Math.PI / 2}
        <circle cx={50 + 42 * Math.cos(a)} cy={50 + 42 * Math.sin(a)} r={i === 0 ? 4.6 : 3.2} class:rojo={i === 0} />
      {/each}
    </svg>
    <h1 class="puerta-titulo">{marca}</h1>
    <p class="puerta-sub">Acceso restringido</p>

    <label class="puerta-campo" class:mal={error}>
      <span class="puerta-etiqueta">Clave</span>
      <input
        bind:this={campo}
        bind:value={valor}
        oninput={() => (error = false)}
        type={ver ? 'text' : 'password'}
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        enterkeyhint="go"
        aria-invalid={error}
        aria-describedby="puerta-error"
      />
      <button
        type="button"
        class="puerta-ver"
        onmousedown={(e) => e.preventDefault()}
        onclick={() => (ver = !ver)}
        aria-pressed={ver}>{ver ? 'Ocultar' : 'Ver'}</button
      >
    </label>
    <p id="puerta-error" class="puerta-error" class:visible={error} role="alert">
      {error ? 'Clave incorrecta' : ''}
    </p>

    <button class="puerta-entrar" type="submit" onmousedown={(e) => e.preventDefault()}>Entrar</button>
  </form>
</div>
