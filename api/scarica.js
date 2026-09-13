/* Chiede il PDF. Registra la richiesta e manda per posta un link che passa da noi.
 *
 * Il file NON viaggia qui dentro: qui viaggia solo un gettone. Il file lo consegna
 * prendi.js, e solo a chi clicca. Cosi' l'email risulta verificata, e una lista di
 * indirizzi non verificati non serve a niente.
 *
 * Le chiavi stanno nelle variabili d'ambiente di Vercel e non passano mai dal browser.
 * Se ne manca una, la funzione risponde 503 e la pagina torna al comportamento di prima.
 */
'use strict';

const AMBIENTE = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE', 'RESEND_API_KEY', 'MITTENTE', 'SITO_URL'];
const PROGRAMMI = {
  'full-body-uomo':  { it: 'Scheda Full Body Uomo',  en: 'Full Body programme, men' },
  'full-body-donna': { it: 'Scheda Full Body Donna', en: 'Full Body programme, women' }
};

// Volutamente semplice: serve a scartare gli errori di battitura, non a fare da guardia.
const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function testo(lingua, titolo, indirizzo) {
  if (lingua === 'en') {
    return {
      oggetto: 'Your free programme: ' + titolo,
      corpo: 'Hi,\n\nhere is the programme you asked for on matteopuglisi.it:\n\n'
           + indirizzo + '\n\nThe link works for seven days. If you did not ask for this, '
           + 'just ignore this message: nothing was created in your name.\n\n'
           + 'Matteo Puglisi, Kinesiologist\nmatteopuglisi.it'
    };
  }
  return {
    oggetto: 'Il tuo programma gratuito: ' + titolo,
    corpo: 'Ciao,\n\necco il programma che hai chiesto su matteopuglisi.it:\n\n'
         + indirizzo + '\n\nIl link vale sette giorni. Se non hai chiesto niente, '
         + 'ignora questo messaggio: non e\' stato creato niente a tuo nome.\n\n'
         + 'Matteo Puglisi, Chinesiologo\nmatteopuglisi.it'
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ errore: 'metodo' }); return; }

  const manca = AMBIENTE.filter(function (v) { return !process.env[v]; });
  if (manca.length) {
    // Non si dice quale manca: e' informazione di servizio, non per chi passa di qui.
    res.status(503).json({ errore: 'non ancora attivo' });
    return;
  }

  const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = String(corpo.email || '').trim().toLowerCase();
  const programma = String(corpo.programma || '');
  const lingua = corpo.lingua === 'en' ? 'en' : 'it';
  const consenso = corpo.consenso === true;

  if (!EMAIL_VALIDA.test(email) || !PROGRAMMI[programma]) {
    res.status(400).json({ errore: 'dati' });
    return;
  }

  const SB = process.env.SUPABASE_URL.replace(/\/+$/, '');
  const capo = {
    apikey: process.env.SUPABASE_SERVICE_ROLE,
    Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE,
    'Content-Type': 'application/json'
  };

  // Freno: la stessa email non puo' far partire due messaggi a distanza di un minuto.
  // Non ferma un abuso determinato, ma toglie il caso facile del tasto premuto a raffica.
  const daQuando = new Date(Date.now() - 60000).toISOString();
  const recenti = await fetch(SB + '/rest/v1/scaricamenti?select=id&email=eq.'
      + encodeURIComponent(email) + '&chiesto_il=gte.' + encodeURIComponent(daQuando),
      { headers: capo });
  if (recenti.ok && (await recenti.json()).length > 0) {
    res.status(200).json({ esito: 'gia-inviato' });
    return;
  }

  const inserisci = await fetch(SB + '/rest/v1/scaricamenti', {
    method: 'POST',
    headers: Object.assign({}, capo, { Prefer: 'return=representation' }),
    body: JSON.stringify({
      email: email, programma: programma, lingua: lingua,
      consenso_marketing: consenso,
      consenso_il: consenso ? new Date().toISOString() : null
    })
  });
  if (!inserisci.ok) { res.status(502).json({ errore: 'registro' }); return; }
  const riga = (await inserisci.json())[0];

  const indirizzo = process.env.SITO_URL.replace(/\/+$/, '') + '/api/prendi?t=' + riga.gettone;
  const t = testo(lingua, PROGRAMMI[programma][lingua], indirizzo);

  const posta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MITTENTE, to: [email], subject: t.oggetto, text: t.corpo })
  });
  if (!posta.ok) { res.status(502).json({ errore: 'posta' }); return; }

  res.status(200).json({ esito: 'inviato' });
};
