/*
  Desenho das gemas e das pedras que as escondem (SVG em texto).
  Cada gema tem duas camadas: a pedra (.rock, com "?") e a gema (.jewel, com o número).
  A classe .open no .slot troca uma pela outra (veja css/style.css).
*/
Garimpo.Gems = (function(){
  var PALETTE = Object.freeze(['#FF5FA2','#4CC9FF','#35E0A1','#FFC93C','#B388FF','#FF8A4C','#7BE05A','#FF6B6B','#5AA9FF']);

  var ROCK =
    '<svg viewBox="0 0 100 100"><path d="M18 86Q4 62 16 40Q22 16 50 13Q80 12 90 40Q99 64 82 86Q50 98 18 86Z" fill="#7A6F99" stroke="rgba(0,0,0,.4)" stroke-width="3"/>' +
    '<path d="M28 30Q42 19 60 22" stroke="#fff" opacity=".28" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<path d="M64 50l-9 11 7 4-7 13" stroke="rgba(0,0,0,.3)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';

  // Gema facetada: um polígono base e quatro facetas mais claras ou escuras por cima.
  function gemSVG(color){
    return '<svg viewBox="0 0 100 100">' +
      '<polygon points="25,15 75,15 95,38 50,92 5,38" fill="' + color + '" stroke="rgba(0,0,0,.35)" stroke-width="3" stroke-linejoin="round"/>' +
      '<polygon points="25,15 50,38 5,38" fill="#fff" opacity=".28"/>' +
      '<polygon points="25,15 75,15 50,38" fill="#fff" opacity=".5"/>' +
      '<polygon points="75,15 95,38 50,38" fill="#000" opacity=".1"/>' +
      '<polygon points="5,38 50,38 50,92" fill="#000" opacity=".1"/>' +
      '<polygon points="50,38 95,38 50,92" fill="#000" opacity=".25"/></svg>';
  }

  // Miolo de uma gema (sem o .slot ao redor). `twin` é o selo "1" ou "2" das gemas gêmeas.
  // Com `reveal` falso o número não entra no HTML: no Desafio, quem abrir o inspetor do navegador
  // não enxerga os valores das gemas fechadas. O jogo escreve o número só quando a gema abre.
  function inner(value, color, twin, reveal){
    return '<div class="lift"><div class="bob">' +
      '<div class="layer rock">' + ROCK + '<span class="num q">?</span></div>' +
      '<div class="layer jewel">' + gemSVG(color) + '<span class="num">' + (reveal ? value : '') + '</span>' +
      (twin ? '<i class="badge">' + twin + '</i>' : '') + '</div></div></div>';
  }

  // Gema já aberta, pronta para telas fora do jogo (tutorial e enfeite do início).
  function slotHTML(value, color, index, extraClass){
    return '<div class="slot open' + (extraClass ? ' ' + extraClass : '') + '" style="--k:' + index + '">' + inner(value, color, '', true) + '</div>';
  }

  // As gêmeas (ids 0 e 1) usam a mesma cor; as outras ganham cores diferentes.
  function colorFor(id, twins){
    return (twins && id < 2) ? PALETTE[0] : PALETTE[(id % 8) + 1];
  }

  return { PALETTE: PALETTE, inner: inner, slotHTML: slotHTML, colorFor: colorFor };
})();
