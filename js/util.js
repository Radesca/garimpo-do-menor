/*
  Utilitários: atalhos do DOM, armazenamento local, sorteio (com semente) e formatação.
*/
Garimpo.Util = (function(){
  var rng = Math.random;   // na sala vira um sorteio com semente, igual para todos os jogadores

  // mulberry32: gerador pequeno que, dada a mesma semente, produz sempre a mesma sequência.
  function seeded(seed){
    var a = seed;
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var rand = {
    useSeed: function(seed){ rng = seeded(seed); },
    useRandom: function(){ rng = Math.random; },
    int: function(min, max){ return min + Math.floor(rng() * (max - min + 1)); },
    shuffle: function(list){
      for(var k = list.length - 1; k > 0; k--){
        var r = rand.int(0, k), tmp = list[k];
        list[k] = list[r]; list[r] = tmp;
      }
      return list;
    },
    // `count` números diferentes entre min e max.
    sample: function(count, min, max){
      var seen = new Set();
      while(seen.size < count) seen.add(rand.int(min, max));
      return Array.from(seen);
    }
  };

  // localStorage pode falhar (aba anônima, dados bloqueados), então tudo fica em try/catch.
  var store = {
    get: function(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } },
    set: function(key, value){ try{ localStorage.setItem(key, value); }catch(e){} },
    remove: function(key){ try{ localStorage.removeItem(key); }catch(e){} }
  };

  // Recorde por combinação de modo, quantidade de gemas e pegadinha.
  function bestKey(cfg){ return 'gm:best:' + cfg.mode + ':' + cfg.n + ':' + (cfg.twins ? 1 : 0); }
  var best = {
    get: function(cfg){ return +(store.get(bestKey(cfg)) || 0); },
    save: function(cfg, score){ store.set(bestKey(cfg), String(score)); }
  };

  var ESCAPES = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };

  return {
    $: function(selector){ return document.querySelector(selector); },
    $$: function(selector){ return [].slice.call(document.querySelectorAll(selector)); },
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    rand: rand,
    store: store,
    best: best,
    fmt: function(ms){ return (ms / 1000).toFixed(1) + 's'; },
    // Para texto digitado por outras pessoas (apelidos) que entra em innerHTML.
    escape: function(text){ return String(text).replace(/[&<>"']/g, function(c){ return ESCAPES[c]; }); }
  };
})();
