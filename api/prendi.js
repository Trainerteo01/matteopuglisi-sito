/* Consegna il PDF a chi ha cliccato il link arrivato per posta.
 *
 * E' qui che l'email diventa verificata: chi arriva fin qui ha davvero ricevuto il
 * messaggio. Si segna la conferma e si manda al file, con un indirizzo firmato che
 * scade in pochi minuti. Il file resta nel secchio privato: non e' mai raggiungibile
 * senza passare di qua.
 *
 * Due passi, non uno. La GET del link mostra solo una pagina con un pulsante e NON tocca
 * il database; e' la POST del pulsante che consuma la consegna. I filtri di posta
 * aziendali (Defender, Proofpoint e simili) aprono da soli ogni link che arriva per
 * email: se bastasse la GET, sarebbero loro a "confermare" l'indirizzo e a bruciare le
 * consegne prima che la persona veda il messaggio.
 *
 * La consegna e' un solo UPDATE nel database (`consegna_scaricamento`), con dentro le
 * condizioni di validita': sette giorni, massimo dieci volte. Niente lettura-poi-scrittura.
 */
'use strict';

const AMBIENTE = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE'];
const SECCHIO = 'programmi';
const FILE = { 'full-body-uomo': 'full-body-uomo.pdf', 'full-body-donna': 'full-body-donna.pdf' };
const GETTONE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TESTI = {
  it: {
    pronto: ['Il tuo programma e\' pronto', 'Premi il pulsante e il PDF si scarica. Il link vale sette giorni.', 'Scarica il PDF'],
    scaduto: ['Il link non vale piu\'', 'Questo link e\' scaduto o e\' gia\' stato usato troppe volte. Torna sul sito e chiedi di nuovo il programma: te ne arriva uno nuovo.'],
    spento: ['Non ancora attivo', 'Il servizio non e\' ancora acceso. Torna sul sito e scrivimi su WhatsApp.'],
    guasto: ['Qualcosa non ha funzionato', 'Riprova fra poco. Se continua, scrivimi su WhatsApp dal sito.']
  },
  en: {
    pronto: ['Your programme is ready', 'Press the button and the PDF will download. The link works for seven days.', 'Download the PDF'],
    scaduto: ['This link no longer works', 'This link has expired or has been used too many times. Go back to the site and ask for the programme again: a new link will reach you.'],
    spento: ['Not active yet', 'The service is not switched on yet. Go back to the site and write to me on WhatsApp.'],
    guasto: ['Something went wrong', 'Try again in a moment. If it keeps happening, write to me on WhatsApp from the site.']
  }
};

function pagina(lingua, titolo, testo, modulo) {
  return '<!doctype html><html lang="' + lingua + '"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex">'
    + '<title>' + titolo + '</title>'
    + '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;'
    + 'font-family:system-ui,sans-serif;color:#1C1C1C;background:#fff;padding:24px;text-align:center}'
    + 'p{max-width:34ch;line-height:1.6}a{color:#951D1F}'
    + 'button{font:inherit;font-weight:600;color:#fff;background:#951D1F;border:0;border-radius:6px;'
    + 'padding:14px 28px;cursor:pointer}button:hover{background:#7a1719}</style></head><body><div>'
    + '<h1 style="font-size:1.4rem">' + titolo + '</h1><p>' + testo + '</p>'
    + (modulo || '')
    + '<p><a href="https://matteopuglisi.it/">matteopuglisi.it</a></p></div></body></html>';
}

function leggiCampi(req) {
  if (req.body && typeof req.body === 'object') { return req.body; }
  if (typeof req.body === 'string') {
    try { return Object.fromEntries(new URLSearchParams(req.body)); } catch (e) { return {}; }
  }
  return {};
}

module.exports = async (req, res) => {
  const query = req.query || {};
  let lingua = query.l === 'en' ? 'en' : 'it';
  const rispondi = function (stato, chiave, modulo) {
    const t = TESTI[lingua][chiave];
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(stato).send(pagina(lingua, t[0], t[1], modulo));
  };

  try {
    if (AMBIENTE.some(function (v) { return !process.env[v]; })) { rispondi(503, 'spento'); return; }

    if (req.method === 'GET') {
      const gettone = String(query.t || '');
      if (!GETTONE.test(gettone)) { rispondi(410, 'scaduto'); return; }
      const modulo = '<form method="post" action="/api/prendi">'
        + '<input type="hidden" name="t" value="' + gettone.toLowerCase() + '">'
        + '<input type="hidden" name="l" value="' + lingua + '">'
        + '<button type="submit">' + TESTI[lingua].pronto[2] + '</button></form>';
      rispondi(200, 'pronto', modulo);
      return;
    }

    if (req.method !== 'POST') { res.status(405).send('metodo'); return; }

    const campi = leggiCampi(req);
    if (campi.l === 'en') { lingua = 'en'; }
    const gettone = String(campi.t || '');
    if (!GETTONE.test(gettone)) { rispondi(410, 'scaduto'); return; }

    const SB = process.env.SUPABASE_URL.replace(/\/+$/, '');
    const capo = {
      apikey: process.env.SUPABASE_SERVICE_ROLE,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE,
      'Content-Type': 'application/json'
    };

    const consegna = await fetch(SB + '/rest/v1/rpc/consegna_scaricamento', {
      method: 'POST', headers: capo, body: JSON.stringify({ p_gettone: gettone.toLowerCase() })
    });
    if (!consegna.ok) { rispondi(502, 'guasto'); return; }
    const righe = await consegna.json();
    if (!righe.length || !FILE[righe[0].programma]) { rispondi(410, 'scaduto'); return; }
    lingua = righe[0].lingua === 'en' ? 'en' : 'it';

    const firma = await fetch(SB + '/storage/v1/object/sign/' + SECCHIO + '/' + FILE[righe[0].programma], {
      method: 'POST', headers: capo, body: JSON.stringify({ expiresIn: 300 })
    });
    if (!firma.ok) { rispondi(502, 'guasto'); return; }
    const dato = await firma.json();

    // 303: dopo una POST il browser deve fare una GET dell'indirizzo firmato.
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(303, SB + '/storage/v1' + dato.signedURL);
  } catch (e) {
    console.error('prendi:', e && e.message);
    rispondi(500, 'guasto');
  }
};
