(function () {
  'use strict';

  const barra = document.querySelector('.barra');
  const pulsanteMenu = document.querySelector('.barra__menu-btn');
  const pannello = document.querySelector('.menu-pannello');
  const pulsanteChiudi = document.querySelector('.menu-pannello__chiudi');
  const velo = document.querySelector('.menu-velo');
  const sentinella = document.querySelector('.sentinella-barra');

  let menuAperto = false;

  function larghezzaBarraScorrimento() {
    return window.innerWidth - document.documentElement.clientWidth;
  }

  function elementiFocusabili(contenitore) {
    return Array.from(
      contenitore.querySelectorAll(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) {
      return el.offsetParent !== null;
    });
  }

  function apriMenu() {
    menuAperto = true;
    document.body.classList.add('menu-aperto');
    const spazio = larghezzaBarraScorrimento();
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = spazio + 'px';
    if (barra) {
      barra.style.paddingRight = spazio + 'px';
    }
    pannello.classList.add('menu-pannello--aperto');
    velo.classList.add('menu-velo--aperto');
    pulsanteMenu.setAttribute('aria-expanded', 'true');

    const focusabili = elementiFocusabili(pannello);
    const primoVoce = pannello.querySelector('.menu-voce__link');
    if (primoVoce) {
      primoVoce.focus();
    } else if (focusabili.length) {
      focusabili[0].focus();
    }
  }

  function chiudiMenu() {
    menuAperto = false;
    document.body.classList.remove('menu-aperto');
    pannello.classList.remove('menu-pannello--aperto');
    velo.classList.remove('menu-velo--aperto');
    pulsanteMenu.setAttribute('aria-expanded', 'false');

    setTimeout(function () {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      if (barra) {
        barra.style.paddingRight = '';
      }
    }, 300);

    pulsanteMenu.focus();
  }

  if (pulsanteMenu) {
    pulsanteMenu.addEventListener('click', function () {
      if (menuAperto) {
        chiudiMenu();
      } else {
        apriMenu();
      }
    });
  }

  if (pulsanteChiudi) {
    pulsanteChiudi.addEventListener('click', chiudiMenu);
  }

  if (velo) {
    velo.addEventListener('click', chiudiMenu);
  }

  document.addEventListener('keydown', function (evento) {
    if (!menuAperto) {
      return;
    }

    if (evento.key === 'Escape') {
      evento.preventDefault();
      chiudiMenu();
      return;
    }

    if (evento.key !== 'Tab') {
      return;
    }

    const focusabili = elementiFocusabili(pannello);
    if (focusabili.length === 0) {
      evento.preventDefault();
      return;
    }

    const primo = focusabili[0];
    const ultimo = focusabili[focusabili.length - 1];

    if (evento.shiftKey && document.activeElement === primo) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primo.focus();
    }
  });

  // Fisarmonica delle sottovoci
  const pulsantiFisarmonica = document.querySelectorAll('.menu-voce__apri');
  pulsantiFisarmonica.forEach(function (pulsante) {
    pulsante.addEventListener('click', function () {
      const espanso = pulsante.getAttribute('aria-expanded') === 'true';
      const sottovoci = pulsante.closest('.menu-voce').querySelector('.menu-voce__sottovoci');
      if (!sottovoci) {
        return;
      }

      if (espanso) {
        pulsante.setAttribute('aria-expanded', 'false');
        sottovoci.style.maxHeight = '0';
      } else {
        pulsante.setAttribute('aria-expanded', 'true');
        sottovoci.style.maxHeight = sottovoci.scrollHeight + 'px';
      }
    });
  });

  // Voce corrente
  const pagina = window.location.pathname.split('/').pop() || 'index.html';
  const linkMenu = document.querySelectorAll('.menu-pannello a[href]');
  linkMenu.forEach(function (link) {
    const destinazione = link.getAttribute('href').split('/').pop();
    if (destinazione === pagina) {
      const voce = link.closest('.menu-voce, li');
      if (voce) {
        voce.classList.add('menu-voce--corrente');
      }
    }
  });

  // Filetto della barra dopo 40px di scorrimento
  if (sentinella && barra) {
    const osservatoreBarra = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            barra.classList.remove('barra--scorsa');
          } else {
            barra.classList.add('barra--scorsa');
          }
        });
      },
      { threshold: 0 }
    );
    osservatoreBarra.observe(sentinella);
  }

  // Animazioni al caricamento
  const osservatoreAnimazioni = new IntersectionObserver(
    function (entries, osservatore) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visibile');
          osservatore.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.fascia-foto, [data-anima]').forEach(function (elemento) {
    osservatoreAnimazioni.observe(elemento);
  });

  // Anno corrente
  const elementiAnno = document.querySelectorAll('.anno-corrente');
  const anno = new Date().getFullYear();
  elementiAnno.forEach(function (el) {
    el.textContent = anno;
  });

  // Metro: si riempie in proporzione allo scorrimento di tutta la pagina.
  const metro = document.querySelector('.metro__strato--acceso');
  if (metro) {
    const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ridotto) {
      metro.style.clipPath = 'none';
    } else {
      let altezzaDocumento = 0;
      let altezzaFinestra = 0;
      let riempito = null;
      let gira = false;

      function misuraMetro() {
        altezzaDocumento = document.documentElement.scrollHeight;
        altezzaFinestra = window.innerHeight;
      }

      function passoMetro() {
        gira = false;
        const corsa = Math.max(1, altezzaDocumento - altezzaFinestra);
        const p = Math.min(1, Math.max(0, window.scrollY / corsa));
        const giu = Math.round((1 - p) * 1000) / 10;
        if (giu !== riempito) {
          metro.style.clipPath = 'inset(0 0 ' + giu + '% 0)';
          riempito = giu;
        }
      }

      function svegliaMetro() {
        if (!gira) {
          gira = true;
          requestAnimationFrame(passoMetro);
        }
      }

      misuraMetro();
      // L'altezza del documento cambia mentre arrivano immagini e caratteri: se si
      // misura solo all'avvio, il metro risulta tarato su una pagina piu' corta di
      // quella vera e si riempie troppo presto. Si rimisura a caricamento finito.
      window.addEventListener('load', function () {
        misuraMetro();
        svegliaMetro();
      });
      window.addEventListener('resize', function () {
        misuraMetro();
        svegliaMetro();
      }, { passive: true });
      window.addEventListener('scroll', svegliaMetro, { passive: true });
      svegliaMetro();
    }
  }
})();
