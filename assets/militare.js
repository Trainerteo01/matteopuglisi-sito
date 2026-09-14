/* La barra di sezione della pagina militare: accende la voce della sezione in vista.
   Era uno script inline dentro militare.html; spostato qui perche' la CSP (vercel.json)
   ammette solo script da file, e l'inline era l'unica eccezione in tutto il sito. */
(function() {
  var nav = document.querySelector('.militare-nav');
  if (!nav) return;
  var collegamenti = nav.querySelectorAll('a');
  var sezioni = [];
  collegamenti.forEach(function(a) {
    var id = a.getAttribute('href').slice(1);
    var el = document.getElementById(id);
    if (el) sezioni.push({ el: el, a: a });
  });
  if (!sezioni.length) return;
  var osservatore = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        collegamenti.forEach(function(a) { a.classList.remove('attivo'); });
        var trovata = sezioni.find(function(s) { return s.el === entry.target; });
        if (trovata) trovata.a.classList.add('attivo');
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sezioni.forEach(function(s) { osservatore.observe(s.el); });
})();
