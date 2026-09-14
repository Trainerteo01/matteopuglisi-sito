/* Chiede il PDF. Registra la richiesta e manda per posta un link che passa da noi.
 *
 * Il file NON viaggia qui dentro: qui viaggia solo un gettone. Il file lo consegna
 * prendi.js, e solo a chi clicca. Cosi' l'email risulta verificata, e una lista di
 * indirizzi non verificati non serve a niente.
 *
 * Le chiavi stanno nelle variabili d'ambiente di Vercel e non passano mai dal browser.
 * Se ne manca una, la funzione risponde 503 e la pagina torna al comportamento di prima.
 *
 * I freni (una richiesta al minuto per email, cinque all'ora e venti al giorno per IP)
 * li fa il database dentro `richiedi_scaricamento`, in una sola transazione: qui non
 * c'e' nessuna lettura-poi-scrittura da aggirare con richieste in parallelo.
 */
'use strict';

const crypto = require('crypto');

const AMBIENTE = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE', 'RESEND_API_KEY', 'MITTENTE', 'SITO_URL'];
const PROGRAMMI = {
  'full-body-uomo':  { it: 'Scheda Full Body Uomo',  en: 'Full Body programme, men' },
  'full-body-donna': { it: 'Scheda Full Body Donna', en: 'Full Body programme, women' }
};

// Volutamente semplice: serve a scartare gli errori di battitura, non a fare da guardia.
const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const EMAIL_MASSIMA = 254;

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

// L'IP non si salva in chiaro: e' un dato personale, e per contare le richieste della
// stessa provenienza basta un'impronta. HMAC con la chiave di servizio: senza la chiave
// non si risale all'indirizzo, e non serve un altro segreto da tenere.
function improntaIp(req) {
  const grezzo = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '')
    .split(',')[0].trim() || 'sconosciuto';
  return crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE).update(grezzo).digest('hex');
}

function leggiCorpo(req) {
  if (typeof req.body !== 'string') { return req.body && typeof req.body === 'object' ? req.body : {}; }
  try { return JSON.parse(req.body || '{}') || {}; } catch (e) { return null; }
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({ errore: 'metodo' }); return; }

    const manca = AMBIENTE.filter(function (v) { return !process.env[v]; });
    if (manca.length) {
      // Non si dice quale manca: e' informazione di servizio, non per chi passa di qui.
      res.status(503).json({ errore: 'non ancora attivo' });
      return;
    }

    const corpo = leggiCorpo(req);
    if (!corpo) { res.status(400).json({ errore: 'dati' }); return; }
    const email = String(corpo.email || '').trim().toLowerCase();
    const programma = String(corpo.programma || '');
    const lingua = corpo.lingua === 'en' ? 'en' : 'it';
    const consenso = corpo.consenso === true;

    if (email.length > EMAIL_MASSIMA || !EMAIL_VALIDA.test(email) || !PROGRAMMI[programma]) {
      res.status(400).json({ errore: 'dati' });
      return;
    }

    const SB = process.env.SUPABASE_URL.replace(/\/+$/, '');
    const capo = {
      apikey: process.env.SUPABASE_SERVICE_ROLE,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE,
      'Content-Type': 'application/json'
    };

    const registro = await fetch(SB + '/rest/v1/rpc/richiedi_scaricamento', {
      method: 'POST', headers: capo,
      body: JSON.stringify({
        p_email: email, p_programma: programma, p_lingua: lingua,
        p_consenso: consenso, p_ip_hash: improntaIp(req)
      })
    });
    if (!registro.ok) { res.status(502).json({ errore: 'registro' }); return; }
    const esito = (await registro.json())[0] || {};

    if (esito.esito === 'gia-inviato') { res.status(200).json({ esito: 'gia-inviato' }); return; }
    if (esito.esito === 'troppe') { res.status(429).json({ errore: 'troppe' }); return; }
    if (esito.esito !== 'inviato' || !esito.gettone) { res.status(502).json({ errore: 'registro' }); return; }

    const indirizzo = process.env.SITO_URL.replace(/\/+$/, '')
      + '/api/prendi?t=' + esito.gettone + (lingua === 'en' ? '&l=en' : '');
    const t = testo(lingua, PROGRAMMI[programma][lingua], indirizzo);

    const posta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MITTENTE, to: [email], subject: t.oggetto, text: t.corpo })
    });
    if (!posta.ok) { res.status(502).json({ errore: 'posta' }); return; }

    res.status(200).json({ esito: 'inviato' });
  } catch (e) {
    // Niente dettagli a chi chiama: il messaggio finisce nei log di Vercel e basta.
    console.error('scarica:', e && e.message);
    res.status(500).json({ errore: 'interno' });
  }
};
