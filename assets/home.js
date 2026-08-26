(function () {
  'use strict';

  /* ----- Carosello delle foto in home (7.1) ----- */
  function initFotoCarousel() {
    const carosello = document.querySelector('.foto-carousel');
    if (!carosello) return;

    const slide = Array.from(carosello.querySelectorAll('.foto-carousel__slide'));
    const parole = Array.from(carosello.querySelectorAll('.foto-carousel__parola'));
    const indicatori = Array.from(carosello.querySelectorAll('.foto-carousel__indicatore'));
    const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let attiva = 0;
    let timer = null;
    let inPausa = false;

    function mostra(i) {
      if (i < 0) i = slide.length - 1;
      if (i >= slide.length) i = 0;
      attiva = i;

      slide.forEach(function (s, idx) {
        s.classList.toggle('attiva', idx === attiva);
      });
      parole.forEach(function (w, idx) {
        w.classList.toggle('viva', idx === attiva);
      });
      indicatori.forEach(function (ind, idx) {
        ind.classList.toggle('attivo', idx === attiva);
        ind.setAttribute('aria-selected', idx === attiva ? 'true' : 'false');
      });
    }

    if (ridotto) {
      mostra(0);
      return;
    }

    function prossima() {
      mostra(attiva + 1);
    }

    function avvia() {
      if (timer) clearInterval(timer);
      timer = setInterval(prossima, 5000);
    }

    function ferma() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    indicatori.forEach(function (ind, i) {
      ind.addEventListener('click', function () {
        mostra(i);
        if (!inPausa) avvia();
      });
    });

    carosello.addEventListener('mouseenter', function () {
      inPausa = true;
      ferma();
    });

    carosello.addEventListener('mouseleave', function () {
      inPausa = false;
      avvia();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        ferma();
      } else if (!inPausa) {
        avvia();
      }
    });

    // IntersectionObserver: ferma quando esce dallo schermo
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        if (!inPausa) avvia();
      } else {
        ferma();
      }
    }, { threshold: 0.1 }).observe(carosello);

    mostra(0);
  }

  /* ----- Carosello servizi in home -----
   * Il 2026-08-26 Matteo ha chiesto di togliere lo scorrimento automatico ai tre
   * riquadri dei servizi. Qui dentro non c'era altro: niente frecce, niente indicatori,
   * solo la macchina che faceva scorrere da solo il nastro sotto i 900px e che si fermava
   * al tocco. Tolto quello, la funzione restava vuota, quindi e' andata via tutta: il
   * nastro .servizi__track resta un contenitore che scorre di suo, con il dito o con il
   * trackpad, e si comanda dal CSS.
   * Nel giro c'era anche un difetto: fermoDa dichiarata e fermaDa usata. Senza
   * 'use strict' in questo file non dava errore, si creava una variabile globale di
   * nascosto. Segnalato e sparito con il resto. */


  initFotoCarousel();
})();
