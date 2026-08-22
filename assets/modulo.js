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

  // Il campo di mezzo, in ordine di preferenza. Il primo che esiste vince.
  const CAMPI_DI_MEZZO = [
    { nome: 'categoria', etichetta: 'Categoria' },
    { nome: 'obiettivo', etichetta: 'Obiettivo' },
    { nome: 'societa',   etichetta: 'Società' }
  ];

  function valore(campo) {
    return campo && campo.value ? campo.value.trim() : '';
  }

  function initModuloContatti() {
    const form = document.getElementById('form-contatti');
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
      const righe = ['Ciao Matteo, sono ' + (chi || 'una persona che scrive dal sito') + '.'];

      if (mezzo) {
        const v = valore(mezzo.campo);
        // In home il menu ha sempre un valore scelto; nei campi liberi puo' essere vuoto,
        // e in quel caso la riga non si scrive invece di mandare "Obiettivo: ".
        if (v) { righe.push(mezzo.etichetta + ': ' + v + '.'); }
      }

      if (valore(telefono)) { righe.push('Telefono: ' + valore(telefono) + '.'); }
      if (valore(messaggio)) { righe.push(valore(messaggio)); }

      const testo = righe.join('\n');
      window.open('https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(testo), '_blank');
    });
  }

  initModuloContatti();
})();
