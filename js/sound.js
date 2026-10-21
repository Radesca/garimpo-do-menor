/*
  Sons gerados na hora com a Web Audio API (não há arquivos de áudio).
  O navegador só libera o som depois do primeiro toque do usuário.
*/
Garimpo.Sound = (function(){
  var ctx = null, muted = false;

  function tone(freq, dur, type, delay, vol){
    if(muted) return;
    try{
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      var t = ctx.currentTime + (delay || 0), osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + dur + 0.02);
    }catch(e){}
  }

  var effects = {
    ok: function(streak){   // o tom sobe a cada acerto seguido
      var up = Math.min(streak || 0, 8) * 45;
      tone(520 + up, .12, 'triangle'); tone(780 + up, .14, 'triangle', .08);
    },
    bad: function(){ tone(150, .28, 'sawtooth', 0, .09); },
    swap: function(){ tone(300, .1, 'square', 0, .05); tone(450, .1, 'square', .09, .05); tone(620, .14, 'square', .18, .05); },
    win: function(){ [523, 659, 784, 1047, 1319].forEach(function(f, i){ tone(f, .3, 'triangle', i * .12); }); },
    tap: function(){ tone(440, .07, 'triangle', 0, .08); }
  };

  return {
    play: function(name, arg){ effects[name](arg); },
    toggleMute: function(){ muted = !muted; return muted; }
  };
})();
