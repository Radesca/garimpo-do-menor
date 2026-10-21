/*
  Efeitos visuais: faíscas, números de pontos subindo e confete.
  São elementos pequenos criados na camada fixa #fx, animados por CSS e removidos no fim da animação.
*/
Garimpo.Fx = (function(){
  var U = Garimpo.Util;

  function layer(){ return U.$('#fx'); }

  function centerOf(el){
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function spawn(parent, tag, className, css){
    var el = document.createElement(tag);
    el.className = className;
    el.style.cssText = css;
    el.addEventListener('animationend', function(){ el.remove(); });
    parent.appendChild(el);
    return el;
  }

  // Explosão de faíscas saindo do centro de `el`. `color` pode ser uma cor ou uma lista.
  function burst(el, color, count){
    if(U.reduceMotion || !el) return;
    var c = centerOf(el);
    for(var k = 0; k < count; k++){
      var angle = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 70;
      var fill = Array.isArray(color) ? color[k % color.length] : color;
      spawn(layer(), 'i', 'p',
        'left:' + c.x + 'px;top:' + c.y + 'px;background:' + fill +
        ';--dx:' + (Math.cos(angle) * dist) + 'px;--dy:' + (Math.sin(angle) * dist) + 'px');
    }
  }

  // Texto (por exemplo "+15") que sobe a partir de `el` e some.
  function floatText(el, text, color){
    if(U.reduceMotion || !el) return;
    var c = centerOf(el);
    spawn(layer(), 'span', 'ft', 'left:' + c.x + 'px;top:' + (c.y - 20) + 'px;color:' + color).textContent = text;
  }

  function rain(){
    if(U.reduceMotion) return;
    var colors = Garimpo.Gems.PALETTE;
    for(var k = 0; k < 80; k++){
      spawn(layer(), 'i', 'conf',
        'left:' + (Math.random() * 100) + '%;background:' + colors[k % colors.length] +
        ';--x:' + Math.round(Math.random() * 240 - 120) + 'px;--t:' + (2.4 + Math.random() * 2) + 's;--dl:' + (Math.random() * .9) + 's');
    }
  }

  return {
    burst: burst, floatText: floatText, rain: rain,
    clear: function(){ layer().innerHTML = ''; }
  };
})();
