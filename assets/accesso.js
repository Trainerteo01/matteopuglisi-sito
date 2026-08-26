/* Area riservata: entra, crea un account, recupera la password.
   Parla con Supabase. Se in configurazione.js manca la chiave, questa pagina
   mostra il messaggio di attesa e non prova nemmeno a collegarsi. */
(function () {
  "use strict";

  var conf = window.CONFIG || {};
  var pronto = Boolean(conf.supabaseUrl && conf.supabaseAnon && window.SB);

  var attesa   = document.getElementById("accesso-attesa");
  var modulo   = document.getElementById("accesso-modulo");
  var dentro   = document.getElementById("accesso-dentro");
  var recupero = document.getElementById("accesso-recupero");
  if (!attesa || !modulo || !dentro || !recupero) return;

  /* Finche' i servizi non sono collegati resta il messaggio di attesa,
     che e' gia' quello scritto nel documento. */
  if (!pronto) return;

  var cliente = window.SB.creaCliente(conf.supabaseUrl, conf.supabaseAnon);

  /* ---------- Attrezzi ---------- */

  function mostra(pannello) {
    [attesa, modulo, dentro, recupero].forEach(function (p) {
      p.hidden = p !== pannello;
    });
  }

  function scriviMessaggio(dove, testo, tipo) {
    dove.textContent = testo;
    dove.className = "accesso__messaggio accesso__messaggio--" + tipo;
    dove.hidden = !testo;
  }

  function pulisciMessaggio(dove) {
    dove.textContent = "";
    dove.hidden = true;
  }

  /* Supabase risponde in inglese. Qui si traduce quello che capita davvero;
     per il resto si dice una frase onesta invece di mostrare l'inglese. */
  function inItaliano(errore) {
    var m = String((errore && errore.message) || "").toLowerCase();
    if (m.indexOf("invalid login credentials") > -1)
      return "Indirizzo o password non corretti.";
    if (m.indexOf("email not confirmed") > -1)
      return "Devi prima confermare l'indirizzo. Controlla la posta, anche nello spam.";
    if (m.indexOf("user already registered") > -1 || m.indexOf("already been registered") > -1)
      return "Questo indirizzo ha gia' un account. Prova a entrare, oppure recupera la password.";
    if (m.indexOf("password should be at least") > -1)
      return "La password deve avere almeno 8 caratteri.";
    if (m.indexOf("unable to validate email") > -1 || m.indexOf("invalid email") > -1)
      return "Questo indirizzo email non sembra valido.";
    if (m.indexOf("for security purposes") > -1 || m.indexOf("rate limit") > -1 ||
        m.indexOf("too many requests") > -1)
      return "Troppi tentativi ravvicinati. Aspetta qualche minuto e riprova.";
    if (m.indexOf("failed to fetch") > -1 || m.indexOf("network") > -1)
      return "Non riesco a raggiungere il servizio. Controlla la connessione.";
    return "Qualcosa non ha funzionato. Riprova fra poco.";
  }

  function occupato(tasto, si, testoDiAttesa) {
    if (si) {
      tasto.dataset.testo = tasto.textContent;
      tasto.textContent = testoDiAttesa;
      tasto.disabled = true;
    } else {
      if (tasto.dataset.testo) tasto.textContent = tasto.dataset.testo;
      tasto.disabled = false;
    }
  }

  /* L'indirizzo a cui Supabase rimanda dopo Google o dopo il collegamento
     di recupero: questa stessa pagina, senza parametri appiccicati. */
  function questaPagina() {
    return location.origin + location.pathname;
  }

  /* ---------- I due sportelli ---------- */

  var sportelli = modulo.querySelectorAll(".accesso__sportello");
  var titolo    = document.getElementById("accesso-titolo");
  var intro     = document.getElementById("accesso-intro");
  var tastoInvia = document.getElementById("accesso-invia");
  var rigaPassword = document.getElementById("accesso-riga-password");
  var messaggio = document.getElementById("accesso-messaggio");
  var campoEmail = document.getElementById("accesso-email");
  var campoPassword = document.getElementById("accesso-password");
  var modalita = "entra";

  var testi = {
    entra: {
      titolo: "Bentornato.",
      intro: "Entra per vedere i tuoi programmi e prenotare la videochiamata.",
      tasto: "Entra",
      aiuto: ""
    },
    registrati: {
      titolo: "Crea il tuo account.",
      intro: "Ti serve per tenere i programmi che compri e prenotare la videochiamata.",
      tasto: "Crea l'account",
      aiuto: "Almeno 8 caratteri."
    }
  };

  function cambiaModalita(nuova) {
    modalita = nuova;
    Array.prototype.forEach.call(sportelli, function (s) {
      s.setAttribute("aria-selected", String(s.dataset.modalita === nuova));
    });
    titolo.textContent = testi[nuova].titolo;
    intro.textContent = testi[nuova].intro;
    tastoInvia.textContent = testi[nuova].tasto;
    document.getElementById("accesso-aiuto-password").textContent = testi[nuova].aiuto;
    campoPassword.setAttribute("autocomplete",
      nuova === "entra" ? "current-password" : "new-password");
    pulisciMessaggio(messaggio);
  }

  Array.prototype.forEach.call(sportelli, function (s) {
    s.addEventListener("click", function () { cambiaModalita(s.dataset.modalita); });
  });

  /* ---------- Google ---------- */

  document.getElementById("accesso-google").addEventListener("click", function () {
    var tasto = this;
    occupato(tasto, true, "Un attimo...");
    cliente.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: questaPagina() }
    }).then(function (esito) {
      if (esito.error) {
        occupato(tasto, false);
        scriviMessaggio(messaggio, inItaliano(esito.error), "errore");
      }
      /* Se va bene il browser se ne va da solo su Google: non si ripristina niente. */
    });
  });

  /* ---------- Entra / crea un account ---------- */

  document.getElementById("accesso-form").addEventListener("submit", function (evento) {
    evento.preventDefault();
    pulisciMessaggio(messaggio);

    var email = campoEmail.value.trim();
    var password = campoPassword.value;
    if (!email || !password) return;

    if (modalita === "registrati" && password.length < 8) {
      scriviMessaggio(messaggio, "La password deve avere almeno 8 caratteri.", "errore");
      campoPassword.focus();
      return;
    }

    occupato(tastoInvia, true, "Un attimo...");

    var promessa = modalita === "entra"
      ? cliente.auth.signInWithPassword({ email: email, password: password })
      : cliente.auth.signUp({ email: email, password: password,
                              options: { emailRedirectTo: questaPagina() } });

    promessa.then(function (esito) {
      occupato(tastoInvia, false);
      if (esito.error) {
        scriviMessaggio(messaggio, inItaliano(esito.error), "errore");
        return;
      }
      if (modalita === "registrati" && esito.data && esito.data.user &&
          !esito.data.session) {
        scriviMessaggio(messaggio,
          "Ti ho mandato una email a " + email + ". Aprila e conferma l'indirizzo, " +
          "poi torna qui. Se non la vedi, guarda nello spam.", "fatto");
        campoPassword.value = "";
      }
      /* Se invece la sessione c'e' gia', ci pensa onAuthStateChange a cambiare schermo. */
    }).catch(function (errore) {
      occupato(tastoInvia, false);
      scriviMessaggio(messaggio, inItaliano(errore), "errore");
    });
  });

  /* ---------- Password dimenticata ---------- */

  document.getElementById("accesso-dimenticata").addEventListener("click", function () {
    var email = campoEmail.value.trim();
    if (!email) {
      scriviMessaggio(messaggio,
        "Scrivi prima il tuo indirizzo email qui sopra, poi premi di nuovo.", "errore");
      campoEmail.focus();
      return;
    }
    var tasto = this;
    tasto.disabled = true;
    cliente.auth.resetPasswordForEmail(email, { redirectTo: questaPagina() })
      .then(function (esito) {
        tasto.disabled = false;
        if (esito.error) {
          scriviMessaggio(messaggio, inItaliano(esito.error), "errore");
          return;
        }
        scriviMessaggio(messaggio,
          "Se esiste un account con quell'indirizzo, ti arriva una email per " +
          "cambiare la password. Il collegamento vale un'ora.", "fatto");
      });
  });

  /* ---------- La password nuova, dopo il collegamento di recupero ---------- */

  var messaggioRecupero = document.getElementById("recupero-messaggio");
  var campoNuova = document.getElementById("recupero-password");
  var tastoRecupero = document.getElementById("recupero-invia");

  document.getElementById("recupero-form").addEventListener("submit", function (evento) {
    evento.preventDefault();
    pulisciMessaggio(messaggioRecupero);
    var nuova = campoNuova.value;
    if (nuova.length < 8) {
      scriviMessaggio(messaggioRecupero,
        "La password deve avere almeno 8 caratteri.", "errore");
      return;
    }
    occupato(tastoRecupero, true, "Un attimo...");
    cliente.auth.updateUser({ password: nuova }).then(function (esito) {
      occupato(tastoRecupero, false);
      if (esito.error) {
        scriviMessaggio(messaggioRecupero, inItaliano(esito.error), "errore");
        return;
      }
      inRecupero = false;
      campoNuova.value = "";
      mostraDentro(esito.data.user);
    });
  });

  /* ---------- Esci ---------- */

  document.getElementById("accesso-esci").addEventListener("click", function () {
    var tasto = this;
    occupato(tasto, true, "Un attimo...");
    cliente.auth.signOut().then(function () {
      occupato(tasto, false);
      /* Ci pensa onAuthStateChange a riportare al modulo. */
    });
  });

  /* ---------- Chi sei ---------- */

  function mostraDentro(utente) {
    var email = (utente && utente.email) || "";
    document.getElementById("dentro-indirizzo").textContent = email;
    document.getElementById("dentro-iniziale").textContent = email.charAt(0) || "?";
    mostra(dentro);
  }

  /* Il collegamento del recupero porta qui con una sessione buona ma con
     l'intenzione di cambiare password: quello schermo deve avere la precedenza
     su "sei dentro", altrimenti la password non la cambia piu' nessuno. */
  var inRecupero = false;

  cliente.auth.onAuthStateChange(function (evento, sessione) {
    if (evento === "PASSWORD_RECOVERY") {
      inRecupero = true;
      mostra(recupero);
      campoNuova.focus();
      return;
    }
    if (inRecupero) return;
    if (sessione && sessione.user) mostraDentro(sessione.user);
    else { mostra(modulo); cambiaModalita("entra"); }
  });

  /* Primo giro: si chiede la sessione che c'e' gia'. */
  cliente.auth.getSession().then(function (esito) {
    if (inRecupero) return;
    var sessione = esito.data && esito.data.session;
    if (sessione && sessione.user) mostraDentro(sessione.user);
    else { mostra(modulo); cambiaModalita("entra"); }
  });
})();
