/* Consegna il PDF a chi ha cliccato il link arrivato per posta.
 *
 * E' qui che l'email diventa verificata: chi arriva fin qui ha davvero ricevuto il
 * messaggio. Si segna la conferma e si manda al file, con un indirizzo firmato che
 * scade in pochi minuti. Il file resta nel secchio privato: non e' mai raggiungibile
 * senza passare di qua.
 */
'use strict';

const AMBIENTE = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE'];
const SECCHIO = 'programmi';
const FILE = { 'full-body-uomo': 'full-body-uomo.pdf', 'full-body-donna': 'full-body-donna.pdf' };
const GETTONE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pagina(lingua, titolo, testo) {
  return '<!doctype html><html lang="' + lingua + '"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex">'
    + '<title>' + titolo + '</title>'
    + '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;'
    + 'font-family:system-ui,sans-serif;color:#1C1C1C;background:#fff;padding:24px;text-align:center}'
    + 'p{max-width:34ch;line-height:1.6}a{color:#951D1F}</style></head><body><div>'
    + '<h1 style="font-size:1.4rem">' + titolo + '</h1><p>' + testo + '</p>'
    + '<p><a href="https://matteopuglisi.it/">matteopuglisi.it</a></p></div></body></html>';
}

module.exports = async (req, res) => {
  const scaduto = {
    it: ['Il link non vale piu\'', 'Questo link e\' scaduto o e\' gia\' stato usato troppe volte. Torna sul sito e chiedi di nuovo il programma: te ne arriva uno nuovo.'],
    en: ['This link no longer works', 'This link has expired or has been used too many times. Go back to the site and ask for the programme again: a new link will reach you.']
  };
  const rispondiScaduto = function (lingua) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(410).send(pagina(lingua, scaduto[lingua][0], scaduto[lingua][1]));
  };

  if (AMBIENTE.some(function (v) { return !process.env[v]; })) {
    res.status(503).send('non ancora attivo'); return;
  }

  const gettone = String((req.query && req.query.t) || '');
  if (!GETTONE.test(gettone)) { rispondiScaduto('it'); return; }

  const SB = process.env.SUPABASE_URL.replace(/\/+$/, '');
  const capo = {
    apikey: process.env.SUPABASE_SERVICE_ROLE,
    Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE,
    'Content-Type': 'application/json'
  };

  const cerca = await fetch(SB + '/rest/v1/scaricamenti?select=*&gettone=eq.' + gettone, { headers: capo });
  const righe = cerca.ok ? await cerca.json() : [];
  if (!righe.length) { rispondiScaduto('it'); return; }
  const riga = righe[0];
  const lingua = riga.lingua === 'en' ? 'en' : 'it';

  // Il link vale sette giorni e non piu' di dieci consegne: basta per chi cambia
  // dispositivo o riscarica, e non basta per farlo girare.
  const eta = Date.now() - new Date(riga.chiesto_il).getTime();
  if (eta > 7 * 24 * 3600 * 1000 || riga.scaricato_volte >= 10) { rispondiScaduto(lingua); return; }

  await fetch(SB + '/rest/v1/scaricamenti?id=eq.' + riga.id, {
    method: 'PATCH', headers: capo,
    body: JSON.stringify({
      confermato_il: riga.confermato_il || new Date().toISOString(),
      scaricato_volte: riga.scaricato_volte + 1
    })
  });

  const firma = await fetch(SB + '/storage/v1/object/sign/' + SECCHIO + '/' + FILE[riga.programma], {
    method: 'POST', headers: capo, body: JSON.stringify({ expiresIn: 300 })
  });
  if (!firma.ok) { res.status(502).send('archivio non raggiungibile'); return; }
  const dato = await firma.json();

  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, SB + '/storage/v1' + dato.signedURL);
};
