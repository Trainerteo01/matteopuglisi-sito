/* =========================================================
   Il PDF si scarica lasciando l'email. Il file non parte da qui: parte una richiesta,
   e il link arriva per posta. Chi clicca quel link conferma di avere davvero
   quell'indirizzo, ed e' solo quello che rende la lista utile.

   FINCHE' window.CONFIG.richiedeEmail e' falso, questo file NON TOCCA NIENTE e i
   bottoni restano gli scaricamenti diretti di adesso. E' lo stesso patto gia' usato
   per l'area riservata: una pagina a meta' si pubblica solo se degrada in quella di
   prima.
   ========================================================= */
(function () {
  'use strict';

  if (!window.CONFIG || !window.CONFIG.richiedeEmail) { return; }

  const EN = document.documentElement.lang === 'en';
  const P = EN ? {
    invito: 'Leave your email and I will send you the link.',
    email: 'Your email', manda: 'Send me the link', attendi: 'Sending...',
    fatto: 'Sent. Check your inbox, and the spam folder just in case.',
    gia: 'I have just sent it. Check your inbox.',
    erroreDati: 'That email does not look right.',
    errore: 'Something went wrong. Try again in a moment, or write to me on WhatsApp.',
    troppe: 'Too many requests from this connection. Try again in an hour.',
    spento: 'Not available yet. Write to me on WhatsApp and I will send it to you.',
    consenso: 'I would also like to hear about new programmes. (Optional: you get the PDF either way.)',
    nota: 'I use your address to send you this programme. Nothing else, unless you tick the box.'
  } : {
    invito: 'Lasciami la tua email e ti mando il link.',
    email: 'La tua email', manda: 'Mandami il link', attendi: 'Sto mandando...',
    fatto: 'Mandato. Guarda la posta, e per sicurezza anche lo spam.',
    gia: 'Te l\'ho appena mandato. Controlla la posta.',
    erroreDati: 'Quell\'email non mi torna.',
    errore: 'Qualcosa non ha funzionato. Riprova fra poco, oppure scrivimi su WhatsApp.',
    troppe: 'Troppe richieste da questa connessione. Riprova fra un\'ora.',
    spento: 'Non e\' ancora attivo. Scrivimi su WhatsApp e te lo mando io.',
    consenso: 'Mi fa piacere ricevere notizie sui nuovi programmi. (Facoltativo: il PDF arriva comunque.)',
    nota: 'Uso il tuo indirizzo per mandarti questo programma. Nient\'altro, a meno che tu non spunti la casella.'
  };

  // Dal percorso del file si ricava quale programma e'. Se un giorno se ne aggiunge
  // un terzo, non c'e' niente da cambiare qui.
  function qualeProgramma(href) {
    const m = /([a-z0-9-]+)\.pdf(?:$|\?)/i.exec(href || '');
    return m ? m[1] : null;
  }

  function moduloPer(scheda, programma) {
    const form = document.createElement('form');
    form.className = 'scarica';
    form.noValidate = true;

    const id = 'scarica-' + programma;
    form.innerHTML =
      '<p class="scarica__invito">' + P.invito + '</p>' +
      '<label class="scarica__campo" for="' + id + '">' +
        '<span>' + P.email + '</span>' +
        '<input type="email" id="' + id + '" name="email" autocomplete="email" required>' +
      '</label>' +
      '<label class="scarica__consenso">' +
        '<input type="checkbox" name="consenso">' +
        '<span>' + P.consenso + '</span>' +
      '</label>' +
      '<button type="submit" class="bottone">' + P.manda + '</button>' +
      '<p class="scarica__nota">' + P.nota + '</p>' +
      '<p class="scarica__esito" role="status" aria-live="polite"></p>';

    const esito = form.querySelector('.scarica__esito');
    const bottone = form.querySelector('button');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { esito.textContent = P.erroreDati; return; }

      bottone.disabled = true;
      esito.textContent = P.attendi;
      try {
        const r = await fetch('/api/scarica', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email, programma: programma,
            lingua: EN ? 'en' : 'it',
            consenso: form.querySelector('input[type="checkbox"]').checked
          })
        });
        if (r.status === 503) { esito.textContent = P.spento; return; }
        if (!r.ok) {
          esito.textContent = r.status === 400 ? P.erroreDati : r.status === 429 ? P.troppe : P.errore;
          bottone.disabled = false; return;
        }
        const d = await r.json();
        esito.textContent = d.esito === 'gia-inviato' ? P.gia : P.fatto;
        form.querySelector('.scarica__invito').hidden = true;
        form.querySelector('.scarica__campo').hidden = true;
        form.querySelector('.scarica__consenso').hidden = true;
        bottone.hidden = true;
      } catch (err) {
        esito.textContent = P.errore;
        bottone.disabled = false;
      }
    });
    return form;
  }

  document.querySelectorAll('.all11-scheda-pdf').forEach(function (scheda) {
    const link = scheda.querySelector('a[href$=".pdf"]');
    if (!link) { return; }
    const programma = qualeProgramma(link.getAttribute('href'));
    if (!programma) { return; }
    link.replaceWith(moduloPer(scheda, programma));
  });
})();
