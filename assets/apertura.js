(function () {
  'use strict';

  const sezione = document.getElementById('apertura');
  const marchio = document.getElementById('marchio');
  const scorri = document.getElementById('scorri');
  const pezzi = Array.from(document.querySelectorAll('.pezzo'));
  const battute = Array.from(document.querySelectorAll('.battuta'));
  const titoli = Array.from(document.querySelectorAll('.apertura__titolo'));
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Questo file oggi lo carica solo la pagina iniziale, che l'apertura ce l'ha sempre.
  // La guardia serve al domani: se finisse in una pagina senza apertura, misura() farebbe
  // getBoundingClientRect() su null e romperebbe tutto il resto dello script.
  if (!sezione || !marchio) return;

  // Con animazioni ridotte il marchio e' gia' intero, l'ultima battuta e' quella viva
  // e il titolo completo e' gia' visible.
  if (fermo) {
    pezzi.forEach(function (p) { p.classList.add('acceso'); });
    battute.forEach(function (b, i) {
      b.classList.toggle('viva', i === battute.length - 1);
    });
    titoli.forEach(function (t, i) {
      t.classList.toggle('viva', i === titoli.length - 1);
    });
    if (scorri) { scorri.classList.add('via'); }
    return;
  }

  const TAPPE = 15; // quanti pezzi, quindi quante soglie
  let cima = 0;
  let corsa = 1; // geometria della sezione, letta solo al ridimensionamento
  let acceso = -1;
  let battutaViva = 0;
  let titoloVivo = 0;
  let spostamento = null;
  let gira = false;
  let bersaglio = 0;
  // null vuol dire non ancora inizializzato: al primo calcolo prende l'avanzamento
  // corrente, non zero. Chi arriva con la pagina gia' scorsa, o ricarica a meta',
  // non deve vedere il marchio rimontarsi da capo.
  let inseguito = null;
  // Istante dell'ultimo fotogramma, per misurare quanto tempo e' passato: serve a
  // rendere lo smorzamento uguale a 60 e a 120 fotogrammi al secondo.
  let ultimoFotogramma = 0;

  function misura() {
    const r = sezione.getBoundingClientRect();
    cima = r.top + window.scrollY;
    corsa = Math.max(1, sezione.offsetHeight - window.innerHeight);
  }

  function passo() {
    bersaglio = Math.min(1, Math.max(0, (window.scrollY - cima) / corsa));
    if (inseguito === null) { inseguito = bersaglio; }
  }

  function disegna() {
    const p = inseguito;

    // I pezzi seguono lo scorrimento nei due sensi: si scende e il marchio si monta,
    // si risale e si smonta. Le frasi il ritorno lo facevano gia': se il marchio non lo
    // faceva, la scena si contraddiceva da sola.
    const quanti = Math.floor(p * TAPPE);
    if (quanti !== acceso) {
      acceso = quanti;
      pezzi.forEach(function (pz) {
        pz.classList.toggle('acceso', parseInt(pz.dataset.pezzo, 10) <= quanti);
      });
    }

    // la battuta di turno
    const i = battute.findIndex(function (b) {
      return p >= parseFloat(b.dataset.da) && p < parseFloat(b.dataset.a);
    });
    if (i !== -1 && i !== battutaViva) {
      battute[battutaViva].classList.remove('viva');
      battute[i].classList.add('viva');
      battutaViva = i;
    }

    // il titolo di turno sotto al marchio
    const j = titoli.findIndex(function (t) {
      return p >= parseFloat(t.dataset.da) && p < parseFloat(t.dataset.a);
    });
    if (j !== -1 && j !== titoloVivo) {
      titoli[titoloVivo].classList.remove('viva');
      titoli[j].classList.add('viva');
      titoloVivo = j;
    }

    // parallasse: il marchio sale piu' piano del testo
    const y = Math.round(-p * 46);
    if (y !== spostamento) {
      marchio.style.transform = 'translate3d(0,' + y + 'px,0)';
      spostamento = y;
    }

    if (scorri) { scorri.classList.toggle('via', p > 0.04); }
  }

  // Perche' si insegue invece di agganciare: gli eventi di scorrimento arrivano a
  // raffiche, e agganciare la scena a ognuno fa vedere tutta la scalinata dei
  // fotogrammi, che e' il movimento robotico. Avvicinarsi di una frazione a ogni
  // fotogramma fonde i gradini in una planata.
  function giro() {
    passo();

    // Sotto la soglia ci siamo: un ultimo giro agganciati al bersaglio, disegna e
    // ferma. Il ciclo esiste solo finche' serve: un ciclo che gira sempre scalda il
    // telefono per niente.
    if (Math.abs(bersaglio - inseguito) <= 0.0005) {
      inseguito = bersaglio;
      disegna();
      gira = false;
      // Il ciclo si ferma: si azzera anche la misura del tempo, altrimenti al risveglio
      // il primo intervallo varrebbe tutta la pausa e il valore salterebbe sul bersaglio.
      ultimoFotogramma = 0;
      return;
    }

    if (window.Mov) {
      const adesso = performance.now();
      const trascorso = ultimoFotogramma ? adesso - ultimoFotogramma : 0;
      ultimoFotogramma = adesso;
      inseguito = window.Mov.insegui(inseguito, bersaglio, 0.14, trascorso);
    } else {
      // movimento.js non caricato: niente smorzamento, la pagina resta quella di prima.
      inseguito = bersaglio;
    }
    disegna();
    requestAnimationFrame(function () { giro(); });
  }

  function sveglia() {
    if (!gira) {
      gira = true;
      // La freccia non e' un vezzo: requestAnimationFrame passa al richiamo il tempo
      // trascorso. Se la funzione del ciclo prendesse un parametro, si ritroverebbe
      // 2630 al posto dell'avanzamento e la parallasse sparerebbe il marchio a
      // centomila pixel dallo schermo. E' gia' successo il 2026-08-20.
      requestAnimationFrame(function () { giro(); });
    }
  }

  // il ciclo esiste solo mentre l'apertura e' sullo schermo
  let attaccato = false;
  new IntersectionObserver(function (entries) {
    const e = entries[0];
    if (e.isIntersecting && !attaccato) {
      misura();
      window.addEventListener('scroll', sveglia, { passive: true });
      attaccato = true;
      sveglia();
    } else if (!e.isIntersecting && attaccato) {
      window.removeEventListener('scroll', sveglia);
      attaccato = false;
    }
  }, { rootMargin: '200px' }).observe(sezione);

  window.addEventListener('resize', function () {
    misura();
    sveglia();
  }, { passive: true });
})();
