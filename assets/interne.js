(function () {
  'use strict';

  function initCategoriaDaURL() {
    const select = document.getElementById('categoria');
    if (!select) return;

    const params = new URLSearchParams(window.location.search);
    const valore = params.get('categoria');
    if (!valore) return;

    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === valore) {
        select.selectedIndex = i;
        break;
      }
    }
  }

  /* ----- Filmatoscrub della colonna nella pagina Chi sono (10.2) ----- */
  function initFilmatoColonna() {
    const contenitore = document.querySelector('.protocollo__media');
    if (!contenitore) return;

    const video = contenitore.querySelector('video');
    const img = contenitore.querySelector('img');
    const srcVideo = video ? video.dataset.src : null;

    const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mediaLargo = matchMedia('(min-width: 900px)');

    if (!srcVideo || ridotto || !mediaLargo.matches) {
      if (video) video.remove();
      if (img) img.style.display = 'block';
      return;
    }

    if (img) img.style.display = 'none';

    let blobUrl = null;
    let durata = 0;
    let cima = 0;
    let corsa = 1;
    let target = 0;
    let mostrato = 0;
    let gira = false;
    let attaccato = false;
    let caricato = false;

    function misura() {
      const r = contenitore.getBoundingClientRect();
      cima = r.top + window.scrollY;
      corsa = Math.max(1, contenitore.offsetHeight + 240);
    }

    function passo() {
      gira = false;
      const p = Math.min(1, Math.max(0, (window.scrollY - cima + window.innerHeight * 0.35) / corsa));
      target = p * durata;
    }

    function interpolazione() {
      if (!caricato || !video) return;
      const diff = target - mostrato;
      if (Math.abs(diff) < 0.04) {
        mostrato = target;
      } else {
        mostrato += diff * 0.12;
      }
      if (video.currentTime !== mostrato) {
        video.currentTime = mostrato;
      }
    }

    function ciclo() {
      if (!gira) return;
      passo();
      interpolazione();
      requestAnimationFrame(ciclo);
    }

    function sveglia() {
      if (!gira) {
        gira = true;
        requestAnimationFrame(ciclo);
      }
    }

    function attiva() {
      if (!mediaLargo.matches || ridotto) return;
      misura();
      if (!attaccato) {
        window.addEventListener('scroll', sveglia, { passive: true });
        window.addEventListener('resize', function () { misura(); sveglia(); }, { passive: true });
        attaccato = true;
      }
      sveglia();
    }

    function disattiva() {
      if (attaccato) {
        window.removeEventListener('scroll', sveglia);
        attaccato = false;
        gira = false;
      }
    }

    fetch(srcVideo)
      .then(function (risposta) {
        if (!risposta.ok) throw new Error('Errore nel caricamento del filmato');
        return risposta.blob();
      })
      .then(function (blob) {
        blobUrl = URL.createObjectURL(blob);
        video.src = blobUrl;
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.load();
        video.addEventListener('loadedmetadata', function () {
          durata = video.duration || 1;
          caricato = true;
          misura();
          sveglia();
        });
      })
      .catch(function () {
        if (video) video.remove();
        if (img) img.style.display = 'block';
      });

    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        attiva();
      } else {
        disattiva();
      }
    }, { rootMargin: '200px' }).observe(contenitore);

    mediaLargo.addEventListener('change', function () {
      if (mediaLargo.matches && !ridotto) {
        attiva();
      } else {
        disattiva();
        if (video) video.style.display = 'none';
        if (img) img.style.display = 'block';
      }
    });
  }


  /* ----- La barretta dei passaggi segue la sezione in cui ci si trova -----
     Su calcio.html e militare.html la pagina e' lunga e i tasti della pagina iniziale ci
     saltano dentro: senza un riferimento che si muove, uno non sa piu' dove sta. La voce
     della sezione visibile si accende in bordeaux. */
  function initBarrettaPassaggi() {
    const barretta = document.querySelector('.calcio-nav, .militare-nav');
    if (!barretta) return;

    const voci = Array.from(barretta.querySelectorAll('a[href^="#"]'));
    if (!voci.length) return;

    const sezioni = voci
      .map(function (v) { return document.getElementById(v.getAttribute('href').slice(1)); })
      .filter(Boolean);
    if (!sezioni.length) return;

    let corrente = null;

    function accendi(id) {
      if (id === corrente) return; // si scrive nel DOM solo quando cambia davvero
      corrente = id;
      voci.forEach(function (v) {
        v.classList.toggle('attivo', v.getAttribute('href') === '#' + id);
      });
    }

    const osservatore = new IntersectionObserver(function (entries) {
      // fra le sezioni visibili vince quella piu' in alto nello schermo
      const viste = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      if (viste.length) { accendi(viste[0].target.id); }
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });

    sezioni.forEach(function (s) { osservatore.observe(s); });
  }

  initBarrettaPassaggi();
  initCategoriaDaURL();
  initFilmatoColonna();
})();
