/* Pagina "Chi sono io": il marchio dello sfondo si accende una parte alla volta.
 *
 * Ogni blocco di testo porta un data-tappa. Quando il blocco arriva in mezzo allo schermo,
 * cioe' quando lo si sta davvero leggendo, si accende il gruppo di pezzi con lo stesso
 * numero, e restano accesi quelli di prima: alla fine della lettura il marchio e' intero.
 *
 * Perche' non e' agganciato allo scorrimento come l'apertura della home: li' il marchio e'
 * il protagonista e deve seguire il dito. Qui e' uno sfondo, e legarlo al testo invece che
 * ai pixel fa si' che chi legge piano e chi scorre veloce vedano la stessa cosa.
 */
(function () {
  'use strict';

  const gruppi = Array.from(document.querySelectorAll('.csi-sfondo__gruppo'));
  const blocchi = Array.from(document.querySelectorAll('.csi-blocco[data-tappa]'));
  if (!gruppi.length || !blocchi.length) { return; }

  function accendiFinoA(n) {
    gruppi.forEach(function (g) {
      if (parseInt(g.dataset.tappa, 10) <= n) {
        g.classList.add('acceso');
      }
    });
  }

  // Con movimento ridotto il marchio e' gia' intero dal CSS: qui non serve fare niente,
  // e mettersi a osservare lo scorrimento sarebbe lavoro sprecato.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // La prima tappa si accende subito: la pagina non deve partire con lo sfondo spento e
  // poi svegliarsi, sembrerebbe un caricamento in ritardo.
  accendiFinoA(1);

  let massima = 1;

  // Il margine stringe la finestra di osservazione a una fascia centrale alta un quarto
  // di schermo: il blocco conta come "in lettura" quando ci passa dentro, non appena
  // spunta dal bordo. Senza, su uno schermo alto si accenderebbe tutto in una volta.
  const osservatore = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) { return; }
      const n = parseInt(entry.target.dataset.tappa, 10);
      if (n > massima) {
        massima = n;
        accendiFinoA(n);
      }
      // Una tappa accesa non si spegne piu': si smette di guardare quel blocco.
      osservatore.unobserve(entry.target);
    });
  }, { rootMargin: '-38% 0px -38% 0px' });

  blocchi.forEach(function (b) { osservatore.observe(b); });
})();
