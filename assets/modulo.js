/* =========================================================
   Il modulo che apre WhatsApp col messaggio gia' scritto.
   Vale per la pagina iniziale e per tutte le pagine interne: cambia solo il campo di
   mezzo, che e' "categoria" in home, "obiettivo" nelle pagine di servizio e "societa"
   nella pagina delle societa'. Il modulo non spedisce niente da solo: compone il testo
   e lo consegna a WhatsApp, poi e' il visitatore che preme invio.
   ========================================================= */
(function () {
  'use strict';

  const NUMERO = '393453425891';

  // Le parole del messaggio seguono la lingua della pagina. Il messaggio lo legge Matteo,
  // ma lo manda il visitatore: deve capire cosa sta per spedire. E ricevere un messaggio
  // in inglese gli dice subito con chi ha a che fare.
  const INGLESE = document.documentElement.lang === 'en';

  const PAROLE = INGLESE
    ? { saluto: 'Hi Matteo, this is ', anonimo: 'someone writing from your website',
        telefono: 'Phone', categoria: 'Category', obiettivo: 'Goal', societa: 'Club' }
    : { saluto: 'Ciao Matteo, sono ', anonimo: 'una persona che scrive dal sito',
        telefono: 'Telefono', categoria: 'Categoria', obiettivo: 'Obiettivo', societa: 'Società' };

  // Il campo di mezzo, in ordine di preferenza. Il primo che esiste vince.
  const CAMPI_DI_MEZZO = [
    { nome: 'categoria', etichetta: PAROLE.categoria },
    { nome: 'obiettivo', etichetta: PAROLE.obiettivo },
    { nome: 'societa',   etichetta: PAROLE.societa }
  ];

  function valore(campo) {
    return campo && campo.value ? campo.value.trim() : '';
  }

  function initModuloContatti() {
    // Si cerca per prefisso e non per id esatto: la pagina delle societa' usa
    // "form-contatti-societa", e con getElementById('form-contatti') il suo modulo
    // non veniva agganciato da nessuno. Il tasto WhatsApp ricaricava la pagina e il
    // messaggio si perdeva. Trovato il 2026-09-13.
    const form = document.querySelector('[id^="form-contatti"]');
    if (!form) return;

    const nome = form.querySelector('[name="nome"]');
    const cognome = form.querySelector('[name="cognome"]');
    const telefono = form.querySelector('[name="telefono"]');
    const messaggio = form.querySelector('[name="messaggio"]');

    let mezzo = null;
    for (const c of CAMPI_DI_MEZZO) {
      const campo = form.querySelector('[name="' + c.nome + '"]');
      if (campo) { mezzo = { campo: campo, etichetta: c.etichetta }; break; }
    }

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();

      const chi = (valore(nome) + ' ' + valore(cognome)).trim();
      const righe = [PAROLE.saluto + (chi || PAROLE.anonimo) + '.'];

      if (mezzo) {
        const v = valore(mezzo.campo);
        // In home il menu ha sempre un valore scelto; nei campi liberi puo' essere vuoto,
        // e in quel caso la riga non si scrive invece di mandare "Obiettivo: ".
        if (v) { righe.push(mezzo.etichetta + ': ' + v + '.'); }
      }

      if (valore(telefono)) { righe.push(PAROLE.telefono + ': ' + valore(telefono) + '.'); }
      if (valore(messaggio)) { righe.push(valore(messaggio)); }

      const testo = righe.join('\n');
      window.open('https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(testo), '_blank', 'noopener');
    });
  }

  initModuloContatti();
})();
