/* Pagina "Chi sono io": il marchio dello sfondo si compone mentre si legge, e si smonta
 * risalendo.
 *
 * Il marchio mostra tanti gruppi di pezzi quanto si e' avanti nella pagina: si scende e
 * si compone, si risale e si smonta, come fa il marchio della pagina iniziale.
 * Chiesto da Matteo il 2026-08-26.
 *
 * Le quattro tappe erano legate alla cima dei quattro blocchi di testo, e sulla carta era
 * piu' elegante. Non funzionava: dopo l'ultimo blocco la pagina continua per circa 1500
 * pixel fra la chiusura e il fondo pagina, e in tutta quella parte non c'e' nessuna
 * soglia. Arrivati in fondo bisognava risalire quasi due schermate prima di vedere
 * cambiare qualcosa, e Matteo ha giustamente detto che non si decomponeva.
 * Adesso le tappe sono quote dello scorrimento dell'intera pagina. Le quote scelte
 * cadono comunque vicino ai quattro blocchi, quindi il legame col testo resta nei fatti,
 * ma la risalita risponde subito anche dal fondo.
 *
 * Prima ancora era un IntersectionObserver che accendeva una tappa e poi smetteva di
 * guardarla: per costruzione andava in un senso solo. Adesso lo stato si **ricalcola**
 * a ogni fotogramma utile da dove si e' nella pagina, quindi i due sensi vengono gratis
 * e non c'e' nessuna memoria da tenere allineata.
 *
 * Cosa NON si fa, ed e' una scelta gia' presa per l'apertura della home il 2026-08-22:
 * i pezzi non scivolano e non si ingrandiscono, entrano fermi in dissolvenza. Il contorno
 * del marchio e' li' dal primo istante, e contro un contorno fisso qualsiasi spostamento
 * si legge come disallineamento invece che come movimento.
 */
(function () {
  'use strict';

  const gruppi = Array.from(document.querySelectorAll('.csi-sfondo__gruppo'));
  // I blocchi non entrano piu' nel calcolo, ma se non ci sono la pagina non e' questa.
  const blocchi = Array.from(document.querySelectorAll('.csi-blocco[data-tappa]'));
  if (!gruppi.length || !blocchi.length) { return; }

  // Con movimento ridotto il marchio e' gia' intero dal CSS, qualunque classe abbia:
  // qui non c'e' niente da fare e mettersi ad ascoltare lo scorrimento sarebbe lavoro
  // sprecato.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

  // A che punto della pagina si accende ogni tappa. Misurate sulla pagina vera: cadono
  // vicino all'inizio dei quattro blocchi di testo, e l'ultima si chiude quando finisce
  // il racconto, non al fondo assoluto, se no risalendo non si vedrebbe niente per una
  // schermata intera.
  const QUOTE = [0.12, 0.38, 0.62, 0.84];
  // Quanto bisogna tornare indietro perche' una tappa si spenga. Senza questo margine,
  // fermandosi con lo schermo proprio su una quota, il gruppo si accenderebbe e
  // spegnerebbe a ogni pixel di tremolio del dito.
  const ISTERESI = 0.02;

  let livello = -1;
  let gira = false;

  function applica(n) {
    gruppi.forEach(function (g) {
      g.classList.toggle('acceso', parseInt(g.dataset.tappa, 10) <= n);
    });
  }

  function livelloAdesso() {
    const corsa = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, window.scrollY / corsa));
    let n = 0;
    for (let i = 0; i < QUOTE.length; i++) {
      // Salendo di livello si usa la quota secca, scendendo la si abbassa dell'isteresi:
      // il punto in cui si accende e quello in cui si spegne non coincidono.
      const soglia = (livello > i) ? QUOTE[i] - ISTERESI : QUOTE[i];
      if (p >= soglia) { n = i + 1; }
    }
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
