(function () {
  'use strict';

  const barra = document.querySelector('.barra');
  const pulsanteMenu = document.querySelector('.barra__menu-btn');
  const pannello = document.querySelector('.menu-pannello');
  const pulsanteChiudi = document.querySelector('.menu-pannello__chiudi');
  const velo = document.querySelector('.menu-velo');
  const sentinella = document.querySelector('.sentinella-barra');

  let menuAperto = false;

  // Il movimento in JavaScript c'e' solo se motion.js e' arrivato davvero. Se manca,
  // tutto quello che segue si tira indietro e restano le transizioni CSS di prima.
  const conMotion = !!(window.Mov && window.Mov.attivo);
  const vociMenu = pannello ? Array.from(pannello.querySelectorAll('.menu-voce__link')) : [];

  // Motion deve sapere da dove parte, altrimenti alla prima apertura legge una matrice di
  // trasformazione dal CSS e puo' interpretarla come zero, facendo comparire il pannello
  // gia' aperto per un fotogramma. Glielo si dice una volta sola, all'avvio.
  if (conMotion && pannello && velo) {
    window.M.animate(pannello, { x: '-100%' }, { duration: 0 });
    window.M.animate(velo, { opacity: 0 }, { duration: 0 });
  }

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

    // Il pannello lo muove una molla, e le si passa solo il punto d'arrivo: cosi' se si
    // preme due volte di fila riparte da dove si trova adesso, con la velocita' che ha
    // adesso, invece di saltare all'inizio. E' la differenza fra un pannello vivo e uno
    // che va a scatti.
    if (conMotion) {
      window.Mov.anima(pannello, { x: '0%' }, window.Mov.molle.pannello);
      window.Mov.anima(velo, { opacity: 1 }, window.Mov.molle.velo);
      // Le voci entrano una dopo l'altra, non tutte insieme: da' la sensazione che il
      // pannello si stia componendo invece di apparire gia' fatto.
      if (vociMenu.length) {
        window.Mov.anima(vociMenu, { opacity: [0, 1], y: [14, 0] },
          Object.assign({ delay: window.M.stagger(0.035, { startDelay: 0.08 }) },
                        window.Mov.molle.rivelazione));
      }
    }

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

    // Lo spazio della barra di scorrimento si restituisce quando il pannello e' davvero
    // uscito, non a tempo scaduto: con una molla la durata non e' un numero fisso, e
    // restituirlo troppo presto fa saltare la pagina di qualche pixel sotto il pannello
    // ancora visibile.
    function ripristina() {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      if (barra) {
        barra.style.paddingRight = '';
      }
    }

    if (conMotion) {
      window.Mov.anima(velo, { opacity: 0 }, window.Mov.molle.velo);
      const uscita = window.Mov.anima(pannello, { x: '-100%' }, window.Mov.molle.pannello);
      if (uscita && typeof uscita.then === 'function') {
        uscita.then(ripristina, ripristina);
      } else {
        setTimeout(ripristina, 300);
      }
    } else {
      setTimeout(ripristina, 300);
    }

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

  /* Fisarmonica delle sottovoci.
   * Prima era max-height: un tetto inventato piu' alto del contenuto, che a tempo fisso
   * scorre tutto, per cui la tendina parte piano e finisce di colpo quando il contenuto
   * e' gia' tutto fuori. Adesso si anima l'altezza vera, misurata. */
  function apriTendina(el) {
    if (!conMotion) { el.style.maxHeight = el.scrollHeight + 'px'; return; }
    const a = window.Mov.anima(el, { height: 'auto' }, window.Mov.molle.tendina);
    // Arrivati in fondo si lascia 'auto': se poi il contenuto cambia — un carattere che
    // arriva tardi, il telefono che ruota — la tendina si adatta invece di restare
    // tagliata all'altezza di un momento fa.
    if (a && typeof a.then === 'function') {
      a.then(function () { el.style.height = 'auto'; }, function () {});
    } else {
      el.style.height = 'auto';
    }
  }

  function chiudiTendina(el) {
    if (!conMotion) { el.style.maxHeight = '0'; return; }
    // Da 'auto' non si scende: prima si fissa l'altezza vera in pixel, poi si va a zero.
    el.style.height = el.scrollHeight + 'px';
    window.Mov.anima(el, { height: 0 }, window.Mov.molle.tendina);
  }

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
        chiudiTendina(sottovoci);
      } else {
        pulsante.setAttribute('aria-expanded', 'true');
        apriTendina(sottovoci);
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
  const movimentoRidotto = matchMedia('(prefers-reduced-motion: reduce)');
  const passoRitardo = 70;
  const massimoPassi = 4;

  const osservatoreAnimazioni = new IntersectionObserver(
    function (entries, osservatore) {
      // Il conteggio riparte da zero a ogni giro dell'osservatore, non e' un contatore
      // globale: si scaglionano gli elementi che entrano nello stesso istante, non quelli
      // che arrivano in giri diversi.
      let passo = 0;
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // Il ritardo e' limitato a 4 passi (280ms): con una lista lunga, far aspettare
          // un secondo perche' compaia l'ultimo elemento sarebbe peggio del difetto di
          // prima, cioe' tutto insieme.
          if (!movimentoRidotto.matches) {
            const ritardo = Math.min(passo, massimoPassi) * passoRitardo;
            if (ritardo > 0) {
              const bersaglio = entry.target;
              bersaglio.style.transitionDelay = ritardo + 'ms';
              // Finita la transizione il ritardo si toglie, cosi' non resta appiccicato
              // allo stile in linea.
              // Il controllo su evento.target non e' pignoleria: transitionend risale dai
              // figli, e dentro una .fascia-foto la pennellata dura 900ms contro i 700 del
              // padre. Senza controllo, l'evento del figlio cancellerebbe il ritardo del
              // padre mentre il padre sta ancora aspettando il suo turno, e la fascia
              // scatterebbe di colpo: esattamente il difetto che lo scaglionamento serve
              // a togliere.
              bersaglio.addEventListener('transitionend', function toglieRitardo(evento) {
                if (evento.target !== bersaglio) {
                  return;
                }
                bersaglio.style.transitionDelay = '';
                bersaglio.removeEventListener('transitionend', toglieRitardo);
              });
            }
          }
          passo++;
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

  // Ritorno al dito e al passaggio del mouse. Su uno schermo da toccare il passaggio del
  // mouse non esiste, e la pressione e' l'unico ritorno che il dito riceve: senza, il
  // sito sembra morto in mano.
  if (conMotion) {
    window.Mov.gesti('.bottone, .bottone--vuoto', { sopra: { y: -2 }, premuto: { scale: 0.97 } });
    window.Mov.gesti('.servizio-card', { sopra: { y: -4 }, premuto: { scale: 0.99 } });
  }
})();
