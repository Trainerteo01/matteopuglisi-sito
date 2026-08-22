(function () {
  'use strict';

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

  /* ----- Categoria gia scelta da URL (?categoria=...) ----- */
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

  initModuloContatti();
  initCategoriaDaURL();
  initFilmatoColonna();
})();
