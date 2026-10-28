/*
  Tutorial "Como jogar": quatro passos, cada um com uma cena animada só com CSS.
  Aparece sozinho na primeira vez que a pessoa clica em Jogar e depois só pelo botão "Como jogar".
*/
Garimpo.Tutorial = (function(){
  var U = Garimpo.Util, Sound = Garimpo.Sound, Gems = Garimpo.Gems, Screens = Garimpo.Screens, $ = U.$;

  var SEEN_KEY = 'gm:seen';
  var slide = 0;
  var from = 'play';   // 'play' = veio do botão Jogar (termina entrando no jogo); 'menu' = só volta ao início

  // Gema aberta de tamanho fixo para as cenas.
  function mini(value, index, extraClass){
    return Gems.slotHTML(value, Gems.PALETTE[(value + index) % Gems.PALETTE.length], index, extraClass);
  }
  function minis(values){ return values.map(function(v, i){ return mini(v, i); }).join(''); }

  var FLAG = '<span class="pill pm"><svg viewBox="0 0 24 24"><path d="M6 21V4M6 5h12l-3 4 3 4H6"/></svg></span>';
  var LUPA = '<span class="pill pl"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/></svg></span>';

  var SLIDES = [
    { title:'Sua missão',
      text:'Ordene as gemas da menor para a maior, da esquerda para a direita.',
      scene:function(){ return '<div class="row">' + minis([7, 3, 9, 1]) + '</div><div class="arrow">menor  →  maior</div>'; } },

    { title:'Procure a menor',
      text:'A lupa passa por uma gema de cada vez. A bandeira marca a menor encontrada até agora.',
      scene:function(){
        return '<div class="row">' + minis([5, 8, 2, 6]) +
          '<div class="mkr tm-flag">' + FLAG + '</div><div class="mkr tm-lupa">' + LUPA + '</div></div>';
      } },

    { title:'Decida rápido',
      text:'Se a gema da lupa for menor, escolha Nova menor. Se não, Manter. Acertos seguidos valem mais pontos. Errar tira pontos e corta a sequência. No Desafio, quem pontua mais rápido ganha.',
      scene:function(){
        return '<div class="say"><span>8 é maior que 5: manter</span><span>2 é menor que 5: nova menor!</span></div>' +
          '<div class="mock"><span class="btn b-gold">Manter</span><span class="btn b-sky">Nova menor!</span></div>';
      } },

    { title:'Leve para a vitrine',
      text:'No fim da busca, a menor troca de lugar com a vaga e fica dourada. Repita até a vitrine ficar completa.',
      scene:function(){
        // A gema 5 (primeira) e a 2 (terceira) trocam de lugar em vai e vem.
        return '<div class="row">' + mini(5, 0, 'tm-b') + mini(8, 1) + mini(2, 2, 'tm-a') + mini(6, 3) + '</div>' +
          '<div class="mini-plank"><i class="g"></i><i></i><i></i><i></i></div>';
      } }
  ];

  function render(){
    var s = SLIDES[slide], last = slide === SLIDES.length - 1;
    $('#howTitle').textContent = s.title;
    $('#howText').textContent = s.text;
    $('#stage').innerHTML = s.scene();
    $('#dots').innerHTML = SLIDES.map(function(_, k){ return '<i class="' + (k === slide ? 'on' : '') + '"></i>'; }).join('');
    $('#next').textContent = last ? (from === 'play' ? 'Começar!' : 'Entendi!') : 'Próximo';
    $('#skip').hidden = last;
  }

  function finish(){
    U.store.set(SEEN_KEY, '1');
    if(from === 'play') Garimpo.Game.start(); else Screens.show('start');
  }

  $('#next').addEventListener('click', function(){
    Sound.play('tap');
    if(slide < SLIDES.length - 1){ slide++; render(); } else finish();
  });
  $('#skip').addEventListener('click', finish);

  return {
    seen: function(){ return !!U.store.get(SEEN_KEY); },
    open: function(origin){ from = origin; slide = 0; render(); Screens.show('how'); }
  };
})();
