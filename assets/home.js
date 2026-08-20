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

  /* ----- Carosello servizi in home, solo sotto i 900px (7.3) ----- */
  function initServiziCarousel() {
    const carosello = document.querySelector('.servizi__track');
    if (!carosello) return;

    const schede = Array.from(carosello.querySelectorAll('.servizio-card'));
    if (schede.length === 0) return;

    const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const media = matchMedia('(max-width: 900px)');
    let timer = null;
    let fermoDa = 0;
    let larghezzaScheda = 0;
    let gap = 0;

    function attivo() {
      return media.matches && !ridotto;
    }

    function misura() {
      if (!media.matches) return;
      const stile = getComputedStyle(carosello);
      gap = parseFloat(stile.gap) || 16;
      larghezzaScheda = schede[0].offsetWidth + gap;
    }

    function indiceDaScroll() {
      return Math.round(carosello.scrollLeft / larghezzaScheda);
    }

    function vaiA(i) {
      if (i < 0) i = 0;
      if (i >= schede.length) i = schede.length - 1;
      carosello.scrollTo({ left: i * larghezzaScheda, behavior: 'smooth' });
    }

    function prossima() {
      const i = indiceDaScroll();
      vaiA(i + 1 >= schede.length ? 0 : i + 1);
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

    function toccato() {
      fermaDa = Date.now();
      ferma();
    }

    function lascia() {
      fermaDa = Date.now();
      setTimeout(function () {
        if (Date.now() - fermaDa >= 5000 && attivo()) {
          avvia();
        }
      }, 5000);
    }

    function gestisciMedia() {
      if (attivo()) {
        misura();
        avvia();
      } else {
        ferma();
      }
    }

    carosello.addEventListener('pointerdown', function () {
      if (!attivo()) return;
      toccato();
    });
    carosello.addEventListener('pointerup', function () {
      if (!attivo()) return;
      lascia();
    });
    carosello.addEventListener('pointercancel', function () {
      if (!attivo()) return;
      lascia();
    });
    carosello.addEventListener('mouseenter', function () {
      if (!attivo()) return;
      ferma();
    });
    carosello.addEventListener('mouseleave', function () {
      if (!attivo()) return;
      lascia();
    });

    window.addEventListener('resize', function () {
      misura();
    }, { passive: true });

    media.addEventListener('change', gestisciMedia);

    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && attivo()) {
        misura();
        avvia();
      } else {
        ferma();
      }
    }, { threshold: 0.1 }).observe(carosello);

    gestisciMedia();
  }

  /* ----- Modulo contatti che apre WhatsApp (11) ----- */
  function initModuloContatti() {
    const form = document.getElementById('form-contatti');
    if (!form) return;

    const nome = form.querySelector('[name="nome"]');
    const cognome = form.querySelector('[name="cognome"]');
    const categoria = form.querySelector('[name="categoria"]');
    const telefono = form.querySelector('[name="telefono"]');
    const messaggio = form.querySelector('[name="messaggio"]');

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();

      const righe = [
        'Ciao Matteo, sono ' + (nome.value || '').trim() + ' ' + (cognome.value || '').trim() + '.',
        'Categoria: ' + (categoria.value || 'Altro') + '.'
      ];

      if (telefono && telefono.value.trim()) {
        righe.push('Telefono: ' + telefono.value.trim() + '.');
      }

      if (messaggio && messaggio.value.trim()) {
        righe.push(messaggio.value.trim());
      }

      const testo = righe.join('\n');
      window.open('https://wa.me/393453425891?text=' + encodeURIComponent(testo), '_blank');
    });
  }

  initFotoCarousel();
  initServiziCarousel();
  initModuloContatti();
})();
