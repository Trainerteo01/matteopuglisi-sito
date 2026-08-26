/* Strato comune del movimento. Carica dopo motion.js e prima di tutto il resto.
 *
 * Esiste per due motivi. Il primo: le curve stanno scritte in un posto solo, cosi' il
 * pannello del menu e la tendina delle sottovoci si muovono con la stessa mano, e per
 * cambiare il carattere del sito si tocca un file. Il secondo, piu' importante: il CSS
 * sa spegnersi da solo con prefers-reduced-motion, il JavaScript no. Qui la guardia c'e'
 * una volta e vale per tutti; sotto animazioni ridotte anima() non salta il lavoro, mette
 * lo stato finale di colpo, che e' la cosa giusta: la pagina deve restare corretta, non
 * restare a meta'.
 */
(function () {
  'use strict';

  const preferenza = matchMedia('(prefers-reduced-motion: reduce)');

  // Se motion.js non e' arrivato (rete andata, file spostato) il sito non deve rompersi:
  // resta quello di prima, con le transizioni CSS. La classe sull'elemento radice e' il
  // segnale che il movimento lo comanda il JavaScript, e serve al CSS per togliersi di
  // mezzo sulle proprieta' che d'ora in poi comanda Motion.
  const attivo = typeof window.M === 'object' && window.M !== null && typeof window.M.animate === 'function';
  if (attivo) {
    document.documentElement.classList.add('con-movimento');
  }

  // Le molle sono descritte con visualDuration e bounce, non con rigidita' e smorzamento:
  // il primo e' il tempo che l'occhio percepisce, il secondo quanto supera il bersaglio
  // prima di posarsi. Provati nel browser il 2026-08-26: bounce 0.5 arriva a 1,163, cioe'
  // supera del 16%. Sulle superfici grandi il rimbalzo si nota e sembra un giocattolo:
  // per quelle si resta bassi.
  const molle = {
    // il pannello del menu: deciso, quasi senza rimbalzo. E' mezza pagina che si muove.
    pannello: { type: 'spring', visualDuration: 0.42, bounce: 0.12 },
    // la tendina delle sottovoci: piu' corta, un filo di vita
    tendina: { type: 'spring', visualDuration: 0.32, bounce: 0.14 },
    // il ritorno al dito: corto e vivo, qui il rimbalzo si sente come reattivita'
    pronta: { type: 'spring', visualDuration: 0.22, bounce: 0.35 },
    // il velo e le cose che devono solo comparire: nessun rimbalzo
    velo: { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] },
    // le rivelazioni allo scorrimento: stessa curva expo-out che il sito usa gia' nel CSS
    rivelazione: { duration: 0.62, ease: [0.16, 1, 0.3, 1] }
  };

  function fermo() {
    return preferenza.matches;
  }

  /* Anima, oppure mette lo stato finale se il movimento e' ridotto.
   * I fotogrammi si passano come li vuole Motion: { opacity: [0, 1] } oppure { opacity: 1 }.
   * Con movimento ridotto si tiene solo l'ultimo valore di ogni proprieta'. */
  function anima(bersaglio, fotogrammi, opzioni) {
    if (!attivo) { return null; }
    if (fermo()) {
      const finale = {};
      Object.keys(fotogrammi).forEach(function (chiave) {
        const v = fotogrammi[chiave];
        finale[chiave] = Array.isArray(v) ? v[v.length - 1] : v;
      });
      return window.M.animate(bersaglio, finale, { duration: 0 });
    }
    return window.M.animate(bersaglio, fotogrammi, opzioni);
  }

  /* Passaggio del mouse e pressione del dito sullo stesso elemento.
   * press() di Motion copre anche il tocco e annulla da solo se il dito scivola via o se
   * la pagina scorre: e' il motivo per cui non lo scrivo a mano con pointerdown.
   * Su schermi da toccare il passaggio del mouse non esiste, e la pressione e' l'unico
   * ritorno che il dito riceve: senza, il sito sembra morto in mano. */
  function gesti(elementi, opzioni) {
    if (!attivo || fermo() || !elementi) { return; }
    const lista = typeof elementi === 'string'
      ? Array.from(document.querySelectorAll(elementi))
      : Array.from(elementi.length !== undefined ? elementi : [elementi]);

    lista.forEach(function (el) {
      if (opzioni.sopra) {
        window.M.hover(el, function () {
          window.M.animate(el, opzioni.sopra, opzioni.curvaSopra || molle.pronta);
          return function () {
            window.M.animate(el, opzioni.fuori || riposo(opzioni.sopra), opzioni.curvaSopra || molle.pronta);
          };
        });
      }
      if (opzioni.premuto) {
        window.M.press(el, function () {
          window.M.animate(el, opzioni.premuto, molle.pronta);
          return function () {
            const ritorno = opzioni.rilasciato || riposo(opzioni.premuto);
            window.M.animate(el, ritorno, molle.pronta);
          };
        });
      }
    });
  }

  // Lo stato di riposo di una proprieta', quando non e' dichiarato: scala e opacita'
  // tornano a 1, tutto il resto a 0. Serve per non ripetere l'ovvio a ogni chiamata.
  function riposo(fotogrammi) {
    const r = {};
    Object.keys(fotogrammi).forEach(function (chiave) {
      r[chiave] = (chiave === 'scale' || chiave === 'opacity') ? 1 : 0;
    });
    return r;
  }

  /* Interpolazione: il valore inseguito si avvicina al bersaglio di una frazione a ogni
   * fotogramma, invece di saltarci sopra. E' quello che toglie il senso di robotico alle
   * scene comandate dallo scorrimento: senza, l'animazione insegue il dito fotogramma per
   * fotogramma e si vede tutta la scalinata degli eventi di scroll.
   *
   * `ms` e' quanto tempo e' passato dal fotogramma prima, ed e' facoltativo ma quasi
   * sempre giusto passarlo. Senza, la frazione si applica una volta per fotogramma: su uno
   * schermo a 120Hz i fotogrammi sono il doppio, la frazione si applica il doppio delle
   * volte e lo smorzamento si dimezza. Il sito si muoverebbe in modo diverso a seconda del
   * telefono, e piu' duro proprio sui telefoni buoni. Con `ms` la frazione viene
   * ricalcolata sul tempo vero, prendendo i 60 al secondo come riferimento. */
  function insegui(valore, bersaglio, forza, ms) {
    let f = forza;
    if (typeof ms === 'number' && ms > 0) {
      // Un tetto a 50ms: se la scheda torna in primo piano dopo un minuto, il primo
      // intervallo e' enorme e senza tetto il valore salterebbe di colpo sul bersaglio.
      const passi = Math.min(ms, 50) / (1000 / 60);
      f = 1 - Math.pow(1 - forza, passi);
    }
    return valore + (bersaglio - valore) * f;
  }

  window.Mov = {
    attivo: attivo,
    molle: molle,
    fermo: fermo,
    anima: anima,
    gesti: gesti,
    insegui: insegui,
    // per chi vuole reagire al cambio di preferenza senza riascoltare matchMedia
    preferenza: preferenza
  };
})();
