/* Pagina "Chi sono io": il marchio dello sfondo si compone mentre si legge, e si smonta
 * risalendo.
 *
 * Ogni blocco di testo porta un data-tappa. Il marchio mostra tanti gruppi di pezzi
 * quanti sono i blocchi gia' raggiunti: si scende e si accendono, si risale e si
 * spengono, come fa il marchio della pagina iniziale. Chiesto da Matteo il 2026-08-26.
 *
 * Prima era un IntersectionObserver che accendeva e poi smetteva di guardare: andava in
 * un senso solo, ed e' il motivo per cui risalendo non succedeva niente. Adesso lo stato
 * si **ricalcola** a ogni fotogramma utile dalla posizione vera dei blocchi, quindi i due
 * sensi vengono gratis e non c'e' nessuna memoria da tenere allineata.
 *
 * Cosa NON si fa, ed e' una scelta gia' presa per l'apertura della home il 2026-08-22:
 * i pezzi non scivolano e non si ingrandiscono, entrano fermi in dissolvenza. Il contorno
 * del marchio e' li' dal primo istante, e contro un contorno fisso qualsiasi spostamento
 * si legge come disallineamento invece che come movimento.
 */
(function () {
  'use strict';

  const gruppi = Array.from(document.querySelectorAll('.csi-sfondo__gruppo'));
  const blocchi = Array.from(document.querySelectorAll('.csi-blocco[data-tappa]'));
  if (!gruppi.length || !blocchi.length) { return; }

  // Con movimento ridotto il marchio e' gia' intero dal CSS, qualunque classe abbia:
  // qui non c'e' niente da fare e mettersi ad ascoltare lo scorrimento sarebbe lavoro
  // sprecato.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

  let livello = -1;
  let gira = false;

  function applica(n) {
    gruppi.forEach(function (g) {
      g.classList.toggle('acceso', parseInt(g.dataset.tappa, 10) <= n);
    });
  }

  /* Un blocco conta come raggiunto quando la sua cima ha superato in alto il 62% dello
   * schermo: e' il momento in cui il blocco e' entrato per davvero e lo si sta leggendo,
   * non quando spunta appena dal bordo. La stessa soglia vale nei due sensi, quindi il
   * punto in cui una tappa si accende scendendo e' lo stesso in cui si spegne risalendo:
   * senza questo il marchio "ballerebbe" avanti e indietro attorno al confine. */
  function livelloAdesso() {
    const soglia = window.innerHeight * 0.62;
    let n = 0;
    blocchi.forEach(function (b) {
      if (b.getBoundingClientRect().top < soglia) {
        const t = parseInt(b.dataset.tappa, 10);
        if (t > n) { n = t; }
      }
    });
    return n;
  }

  function passo() {
    gira = false;
    const n = livelloAdesso();
    if (n !== livello) {
      livello = n;
      applica(n);
    }
  }

  function sveglia() {
    if (!gira) {
      gira = true;
      // La funzione senza parametri non e' un vezzo: requestAnimationFrame passa al
      // richiamo il tempo trascorso, e passo() non deve trovarselo fra i piedi. E' la
      // stessa trappola gia' costata un pomeriggio in apertura.js il 2026-08-20.
      requestAnimationFrame(function () { passo(); });
    }
  }

  window.addEventListener('scroll', sveglia, { passive: true });
  window.addEventListener('resize', sveglia, { passive: true });

  // Lo stato iniziale si calcola subito: chi arriva con la pagina gia' scorsa, o ricarica
  // a meta' lettura, deve trovare il marchio al punto giusto e non da capo.
  passo();
})();
