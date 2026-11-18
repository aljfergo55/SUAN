<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { gsap } from 'gsap';
  import '../styles/rosco.css';
  import type { Estado, Rosco } from '../lib/types';
  import { esCorrecta, formatearTiempo, resumen, siguiente } from '../lib/game';
  import { guardarProgreso, leerProgreso } from '../lib/storage';

  let { rosco, archivoHref, marca = '' }: { rosco: Rosco; archivoHref: string; marca?: string } = $props();

  const n = $derived(rosco.preguntas.length);

  // svelte-ignore state_referenced_locally
  let estados = $state<Estado[]>(rosco.preguntas.map(() => 'p'));
  let actual = $state(0);
  let fase = $state<'inicio' | 'jugando' | 'fin'>('inicio');
  let hayPartida = $state(false); // hay una partida a medias que se puede continuar
  let usado = $state(0); // segundos jugados
  let respuesta = $state('');
  let error = $state(false);
  let verRespuestas = $state(false);
  let puntos = $state(0); // marcador del final (se anima de 0 al resultado)

  let inputEl = $state<HTMLInputElement>();
  let entradaEl = $state<HTMLFormElement>();
  let letraEls: HTMLElement[] = [];
  let ondaEls: HTMLElement[] = [];

  const preg = $derived(rosco.preguntas[actual]);
  const res = $derived(resumen(estados));
  const restante = $derived(rosco.tiempo > 0 ? Math.max(0, rosco.tiempo - usado) : usado);
  const urgente = $derived(rosco.tiempo > 0 && fase === 'jugando' && restante <= 15);

  const reducirMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vibrar = (ms: number) => navigator.vibrate?.(ms);

  function persistir() {
    if (fase === 'inicio') return;
    guardarProgreso(rosco.slug, estados, actual, usado, fase === 'fin' ? 'fin' : 'jugando');
  }

  /* ───── Acciones de juego ───── */

  function empezar() {
    fase = 'jugando';
    hayPartida = false;
    // el foco se pide dentro del gesto del usuario para que el teclado móvil se abra
    inputEl?.focus({ preventScroll: true });
    persistir();
  }

  function repetir() {
    estados = estados.map(() => 'p' as Estado);
    actual = 0;
    usado = 0;
    puntos = 0;
    respuesta = '';
    verRespuestas = false;
    fase = 'jugando';
    inputEl?.focus({ preventScroll: true });
    persistir();
  }

  function avanzar() {
    const sig = siguiente(estados, actual);
    if (sig === -1) terminar();
    else actual = sig;
  }

  function responder() {
    if (fase !== 'jugando') return;
    const texto = respuesta.trim();
    if (!texto) return pasar(); // Enter con el campo vacío = pasapalabra

    const acierto = esCorrecta(texto, preg);
    const i = actual;
    estados[i] = acierto ? 'c' : 'w';
    respuesta = '';
    feedback(i, acierto);
    avanzar();
    persistir();
  }

  function pasar() {
    if (fase !== 'jugando') return;
    if (estados[actual] === 'p') estados[actual] = 's';
    respuesta = '';
    vibrar(8);
    avanzar();
    persistir();
  }

  function terminar() {
    if (fase === 'fin') return;
    fase = 'fin';
    respuesta = '';
    inputEl?.blur();
    persistir();
    animarFin();
  }

  /* ───── Feedback y animaciones (sutiles) ───── */

  function feedback(i: number, acierto: boolean) {
    vibrar(acierto ? 12 : 40);
    if (!acierto) {
      error = true;
      setTimeout(() => (error = false), 450);
    }
    if (reducirMovimiento()) return;

    if (letraEls[i]) {
      if (acierto) {
        // sello: baja desde más grande y se clava seco
        gsap.fromTo(letraEls[i], { scale: 1.4 }, { scale: 1, duration: 0.22, ease: 'expo.out', clearProps: 'transform' });
      } else {
        // sacudida corta de la letra (la tachadura la dibuja el CSS)
        gsap.fromTo(letraEls[i], { x: -4, scale: 0.9 }, { x: 0, scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.4)', clearProps: 'transform' });
      }
    }
    if (ondaEls[i]) {
      gsap.fromTo(
        ondaEls[i],
        { scale: 0.9, opacity: 0.6 },
        { scale: 1.9, opacity: 0, duration: 0.6, ease: 'power2.out' },
      );
    }
    if (!acierto && entradaEl) {
      gsap.fromTo(entradaEl, { x: -6 }, { x: 0, duration: 0.35, ease: 'elastic.out(1, 0.4)', clearProps: 'transform' });
    }
  }

  function animarFin() {
    const objetivo = resumen(estados).aciertos;
    if (reducirMovimiento()) {
      puntos = objetivo;
      return;
    }
    const o = { v: 0 };
    gsap.to(o, { v: objetivo, duration: 0.9, ease: 'power1.out', onUpdate: () => (puntos = Math.round(o.v)) });
    // pequeña "ola" recorriendo el rosco
    gsap.fromTo(
      letraEls.filter(Boolean),
      { scale: 1 },
      { scale: 1.12, duration: 0.16, yoyo: true, repeat: 1, stagger: 0.025, ease: 'sine.inOut', clearProps: 'transform' },
    );
  }

  /* ───── Ciclo de vida ───── */

  onMount(() => {
    // 1) recuperar partida guardada
    const guardado = leerProgreso(rosco.slug, n);
    if (guardado) {
      estados = guardado.e.split('') as Estado[];
      usado = guardado.u;
      actual = guardado.a;
      if (guardado.f === 'fin') {
        fase = 'fin';
        puntos = resumen(estados).aciertos;
      } else {
        hayPartida = true;
        if (!(estados[actual] === 'p' || estados[actual] === 's')) {
          actual = Math.max(0, siguiente(estados, actual));
        }
      }
    }

    // 2) entrada escalonada del rosco
    if (!reducirMovimiento()) {
      gsap.from(letraEls.filter(Boolean), {
        opacity: 0,
        scale: 0.6,
        duration: 0.45,
        stagger: 0.018,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });
    }

    // 3) cronómetro: solo cuenta con la pestaña visible
    let ultimo = performance.now();
    const reloj = setInterval(() => {
      const ahora = performance.now();
      const dt = Math.min((ahora - ultimo) / 1000, 1);
      ultimo = ahora;
      if (fase !== 'jugando' || document.hidden) return;
      usado += dt;
      if (rosco.tiempo > 0 && usado >= rosco.tiempo) terminar();
    }, 200);

    // 4) el área de juego sigue al viewport visible (teclado virtual abierto o cerrado)
    const vv = window.visualViewport;
    const raiz = document.documentElement;
    const ajustar = () => {
      if (!vv) return;
      raiz.style.setProperty('--app-h', `${vv.height}px`);
      raiz.style.setProperty('--app-top', `${vv.offsetTop}px`);
    };
    ajustar();
    vv?.addEventListener('resize', ajustar);
    vv?.addEventListener('scroll', ajustar);

    // 5) guardar al salir o cambiar de pestaña
    const alOcultar = () => document.hidden && persistir();
    document.addEventListener('visibilitychange', alOcultar);
    window.addEventListener('pagehide', persistir);

    return () => {
      clearInterval(reloj);
      vv?.removeEventListener('resize', ajustar);
      vv?.removeEventListener('scroll', ajustar);
      raiz.style.removeProperty('--app-h');
      raiz.style.removeProperty('--app-top');
      document.removeEventListener('visibilitychange', alOcultar);
      window.removeEventListener('pagehide', persistir);
    };
  });

  const ocultar = (e: Event) => e.preventDefault(); // los botones no le quitan el foco al input (el teclado sigue abierto)
  const dur = (ms: number) => (typeof window !== 'undefined' && reducirMovimiento() ? 0 : ms);
</script>

<div class="app">
  <header class="barra">
    <a href={archivoHref}>Archivo</a>
    <span class="barra-titulo">{rosco.titulo}</span>
    <span></span>
  </header>

  <div class="rosco-wrap">
    <div class="rosco" style="--n:{n}">
      {#each rosco.preguntas as q, i (q.letra)}
        <div class="slot" class:activa={fase === 'jugando' && i === actual} style="--i:{i}">
          <div
            class="letra est-{estados[i]}"
            bind:this={letraEls[i]}
            role="img"
            aria-label="{q.letra}: {estados[i] === 'c' ? 'acierto' : estados[i] === 'w' ? 'fallo' : estados[i] === 's' ? 'pasada' : 'pendiente'}"
          >
            {q.letra}
            <span class="onda" bind:this={ondaEls[i]}></span>
          </div>
        </div>
      {/each}

      <div class="centro">
        {#key fase}
          <div class="bloque" in:fade={{ duration: dur(250) }}>
            {#if fase === 'inicio'}
              {#if marca}<span class="marca">{marca}</span>{/if}
              <h1 class="centro-titulo">{rosco.titulo}</h1>
              <p class="meta">
                {n} letras{rosco.tiempo > 0 ? ` · ${formatearTiempo(rosco.tiempo)}` : ''}
              </p>
              <button class="btn btn-prim btn-jugar" onmousedown={ocultar} onclick={empezar}>
                {hayPartida ? 'Continuar' : 'Jugar'}
              </button>
            {:else if fase === 'jugando'}
              <span class="tiempo" class:urgente>{formatearTiempo(restante)}</span>
              <div class="marcador">
                <span class="ok">✓ {res.aciertos}</span>
                <span class="mal">✗ {res.fallos}</span>
              </div>
            {:else}
              <div class="puntos">{puntos}<small> / {n}</small></div>
              <p class="meta">{formatearTiempo(usado)}</p>
            {/if}
          </div>
        {/key}
      </div>
    </div>
  </div>

  <section class="panel">
    <!-- El formulario existe siempre (oculto fuera de partida) para poder enfocar el input dentro del gesto de "Jugar" -->
    <div class="panel-juego" class:oculto={fase !== 'jugando'} aria-hidden={fase !== 'jugando'} hidden={fase === 'fin'}>
      <p class="tipo">
        {preg.tipo === 'empieza' ? 'Empieza por' : 'Contiene la'}
        <b>{preg.letra}</b>
      </p>
      {#key actual}
        <p class="pista" in:fly={{ y: 6, duration: dur(220) }} aria-live="polite">{preg.pista}</p>
      {/key}
      <form
        class="entrada"
        bind:this={entradaEl}
        onsubmit={(e) => {
          e.preventDefault();
          responder();
        }}
      >
        <input
          bind:this={inputEl}
          bind:value={respuesta}
          class:error
          type="text"
          placeholder="Tu respuesta"
          enterkeyhint="send"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          aria-label="Tu respuesta"
          tabindex={fase === 'jugando' ? 0 : -1}
        />
        <button type="button" class="btn btn-sec" onmousedown={ocultar} onclick={pasar}>Pasar</button>
        <button type="submit" class="btn btn-prim btn-enviar" onmousedown={ocultar} aria-label="Responder">→</button>
      </form>
    </div>

    {#if fase === 'fin'}
      <div class="panel-fin" in:fly={{ y: 8, duration: dur(280) }}>
        <p class="fin-msg">{res.sinResponder > 0 ? 'Se acabó el tiempo' : '¡Rosco completado!'}</p>
        <div class="fin-acciones">
          <button class="btn btn-sec" onclick={() => (verRespuestas = true)}>Ver respuestas</button>
          <button class="btn btn-prim" onclick={repetir}>Repetir</button>
        </div>
        <a class="enlace-archivo" href={archivoHref}>Ir al archivo</a>
      </div>
    {/if}
  </section>

  {#if verRespuestas}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="fondo" transition:fade={{ duration: dur(200) }} onclick={() => (verRespuestas = false)}></div>
    <div class="hoja" role="dialog" aria-label="Respuestas" transition:fly={{ y: 80, duration: dur(260) }}>
      <div class="hoja-cabecera">
        <h2>Respuestas</h2>
        <button class="btn btn-sec" onclick={() => (verRespuestas = false)}>Cerrar</button>
      </div>
      <ul>
        {#each rosco.preguntas as q, i (q.letra)}
          <li>
            <div class="letra est-{estados[i]}">{q.letra}</div>
            <div>
              <span class="resp-palabra">{q.respuesta}</span>
              <span class="resp-pista">{q.pista}</span>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
