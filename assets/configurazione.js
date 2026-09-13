/* Configurazione dei servizi esterni.
   ATTENZIONE: questo file finisce nel browser di chiunque. Qui dentro ci va
   SOLO roba pubblica.

   La chiave "anon" di Supabase e' pubblica per costruzione: quello che protegge
   i dati non e' la sua segretezza, e' la Row Level Security scritta nelle
   migrazioni. La chiave di servizio (service_role) non va MAI qui dentro: quella
   salta la Row Level Security e sta solo nelle variabili d'ambiente di Vercel.

   Finche' la chiave qui sotto e' vuota, la pagina dell'area riservata mostra il
   messaggio di attesa invece del modulo. Non si rompe niente. */

window.CONFIG = {
  supabaseUrl: "https://mbzwknehanchdxwipzuk.supabase.co",

  /* MANCA DA MATTEO: la chiave anon, da prendere in
     supabase.com/dashboard/project/mbzwknehanchdxwipzuk/settings/api-keys */
  supabaseAnon: "",

  /* I PDF gratuiti si scaricano lasciando l'email, invece che direttamente?
     Finche' e' false la pagina resta com'e' adesso, con gli scaricamenti liberi.
     Si accende SOLO quando sono pronte tutte e tre queste cose, se no la gente
     lascia l'email e non riceve niente:
       1. i due PDF spostati nel secchio privato "programmi" di Supabase;
       2. le variabili su Vercel: SUPABASE_URL, SUPABASE_SERVICE_ROLE,
          RESEND_API_KEY, MITTENTE, SITO_URL;
       3. il dominio verificato su Resend, coi record DNS messi a mano su Netsons
          (l'SPF va ESTESO, non sostituito: sul dominio c'e' gia' la posta Netsons). */
  richiedeEmail: false
};
