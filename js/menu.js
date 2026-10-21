/*
  Tela inicial: escolha de modo, quantidade de gemas, robô e pegadinha, mais o enfeite do fundo.
  As escolhas ficam em Garimpo.cfg (veja config.js).
*/
(function(){
  var U = Garimpo.Util, Sound = Garimpo.Sound, Gems = Garimpo.Gems, Screens = Garimpo.Screens,
      cfg = Garimpo.cfg, $ = U.$;

  // Estrelinhas piscando no fundo e as gemas de enfeite embaixo do título.
  function decorate(){
    var stars = '';
    for(var k = 0; k < 28; k++){
      stars += '<i style="left:' + Math.floor(Math.random() * 101) + '%;top:' + Math.floor(Math.random() * 101) +
               '%;--d:' + (Math.random() * 4) + 's;width:' + (3 + Math.floor(Math.random() * 5)) +
               'px;height:' + (3 + Math.floor(Math.random() * 5)) + 'px"></i>';
    }
    $('.bg').innerHTML = stars;

    var deco = '';
    [3, 8, 1, 6, 4].forEach(function(value, i){
      deco += Gems.slotHTML(value, Gems.PALETTE[(i * 2 + 1) % Gems.PALETTE.length], i);
    });
    $('#deco').innerHTML = deco;
  }

  // Mostra na tela as escolhas atuais (botões marcados, recorde do modo).
  function sync(){
    U.$$('[data-mode]').forEach(function(b){ b.setAttribute('aria-pressed', String(cfg.mode === b.dataset.mode)); });
    U.$$('[data-n]').forEach(function(b){ b.setAttribute('aria-pressed', String(cfg.n === +b.dataset.n)); });
    U.$$('[data-bot]').forEach(function(b){ b.setAttribute('aria-pressed', String(cfg.bot === b.dataset.bot)); });
    $('#botGrp').hidden = cfg.mode !== 'desafio';
    var best = U.best.get(cfg);
    $('#best').innerHTML = best ? 'Seu recorde neste modo: <b>' + best + ' pontos</b>' : '';
  }

  function bind(){
    document.addEventListener('click', function(e){
      var mode = e.target.closest('[data-mode]'), n = e.target.closest('[data-n]'), bot = e.target.closest('[data-bot]');
      if(mode) cfg.mode = mode.dataset.mode;
      else if(n) cfg.n = +n.dataset.n;
      else if(bot) cfg.bot = bot.dataset.bot;
      else return;
      Sound.play('tap'); sync();
    });
    $('#twins').addEventListener('change', function(e){ cfg.twins = e.target.checked; sync(); });
    $('#play').addEventListener('click', function(){
      Sound.play('tap');
      if(Garimpo.Tutorial.seen()) Garimpo.Game.start(); else Garimpo.Tutorial.open('play');
    });
    $('#howBtn').addEventListener('click', function(){ Sound.play('tap'); Garimpo.Tutorial.open('menu'); });
  }

  Garimpo.Menu = { sync: sync };

  decorate();
  bind();
  sync();
  Screens.show('start');
})();
