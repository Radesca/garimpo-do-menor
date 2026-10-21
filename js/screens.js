/*
  Troca de tela. Cada tela é uma <section class="screen"> do index.html,
  e só uma fica visível por vez (as outras ganham o atributo hidden).
*/
Garimpo.Screens = (function(){
  var U = Garimpo.Util;

  function show(id){
    U.$$('.screen').forEach(function(el){
      el.hidden = (el.id !== id);
      if(el.id === id){   // reinicia a animação de entrada
        el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
      }
    });
    U.$('.app').classList.toggle('wide', id === 'admin');   // o painel do professor usa a largura toda
    window.scrollTo(0, 0);
    if(id !== 'game' && Garimpo.Game) Garimpo.Game.stopClock();
  }

  return { show: show };
})();
