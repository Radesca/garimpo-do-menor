/*
  Motor do selection sort: as regras do jogo, sem nada de tela.

  Uma partida é só uma lista de valores e uma sequência de jogadas, que vira texto (o "log"):
    k  manter o menor atual        m  atualizar o menor        s  levar a menor para a vitrine
  Quem tem os valores e o log consegue refazer a partida inteira (replay) e chegar aos mesmos pontos.
  É isso que torna a sala confiável: ninguém grava a própria nota, só as jogadas, e todos os
  celulares recalculam a nota a partir delas (veja ranking.js).

  Estado de uma partida (S):
    vals    número de cada gema, pelo id. O id é a posição inicial e nunca muda.
    order   order[posição] = id da gema que está ali. Trocar duas gemas é trocar dois itens daqui.
    i       "vaga": primeira posição ainda não ordenada
    min     "menor": posição da menor gema vista nesta rodada
    j       "lupa": posição da gema sendo comparada com a menor
    phase   'scan' (comparando), 'swap' (hora de trocar) ou 'done'
    points  pontos das jogadas, log  jogadas feitas até agora
*/
Garimpo.Engine = (function(){
  var U = Garimpo.Util, R = Garimpo.RULES;

  function inversions(list){
    var count = 0;
    for(var a = 0; a < list.length; a++)
      for(var b = a + 1; b < list.length; b++) if(list[a] > list[b]) count++;
    return count;
  }

  // Sorteia os valores. Com `twins`, as duas primeiras gemas são iguais e a menor fica no fim:
  // assim o selection sort sempre inverte o par e dá para mostrar que ele não é estável.
  function makeValues(n, twins){
    var rand = U.rand;
    if(twins){
      var unique = rand.sample(n - 1, 1, 99).sort(function(a, b){ return a - b; });
      var smallest = unique[0], rest = unique.slice(1), twin = rest[rand.int(0, rest.length - 1)];
      var middle = rand.shuffle(rest.filter(function(x){ return x !== twin; }));
      return [twin, twin].concat(middle, [smallest]);
    }
    var vals;
    do { vals = rand.sample(n, 1, 99); } while(inversions(vals) < n);   // evita sequências quase ordenadas
    return vals;
  }

  // Valores de uma rodada da sala: a mesma semente sempre dá os mesmos números, em qualquer celular.
  var cache = {};
  function valuesFor(seed, n){
    var key = seed + ':' + n;
    if(!cache[key]) cache[key] = U.rand.withSeed(seed, function(){ return makeValues(n, false); });
    return cache[key].slice();
  }

  function createState(vals){
    var n = vals.length, order = [];
    for(var k = 0; k < n; k++) order.push(k);
    return { n:n, vals:vals, order:order, i:0, min:0, j:1, phase:'scan',
             points:0, streak:0, bestStreak:0, errors:0, comps:0, swaps:0, skipped:0, rounds:0,
             log:'', totalComps:n * (n - 1) / 2 };
  }

  function val(S, pos){ return S.vals[S.order[pos]]; }

  function countHit(S){
    S.streak++;
    S.bestStreak = Math.max(S.bestStreak, S.streak);
  }

  // Aplica uma jogada e diz o que aconteceu. Jogadas que não cabem na fase atual são ignoradas
  // e não entram no log.
  //   miss  errou a comparação        hit   acertou (a lupa e a bandeira andam)
  //   swap  trocou a menor com a vaga skip  a menor já estava na vaga
  function apply(S, action){
    var event;
    if(S.phase === 'scan' && (action === 'k' || action === 'm')){
      var vj = val(S, S.j), vm = val(S, S.min), smaller = vj < vm;
      S.log += action;
      if((action === 'm') !== smaller){
        S.errors++;
        S.streak = Math.floor(S.streak * R.STREAK_KEEP);
        S.points = Math.max(0, S.points - R.PENALTY);
        return { kind:'miss', vj:vj, vm:vm, smaller:smaller };
      }
      S.comps++; countHit(S);
      var points = R.CORRECT + R.STREAK_STEP * Math.min(S.streak - 1, R.STREAK_CAP);
      S.points += points;
      if(smaller) S.min = S.j;
      if(S.j < S.n - 1) S.j++; else { S.phase = 'swap'; S.j = null; }
      return { kind:'hit', vj:vj, vm:vm, smaller:smaller, points:points };
    }

    if(S.phase === 'swap' && action === 's'){
      S.log += 's';
      var a = S.i, b = S.min;
      countHit(S);
      if(a === b){
        S.skipped++; S.points += R.SKIP;
        event = { kind:'skip', a:a, points:R.SKIP };
      } else {
        var tmp = S.order[a]; S.order[a] = S.order[b]; S.order[b] = tmp;
        S.swaps++; S.points += R.SWAP;
        event = { kind:'swap', a:a, b:b, points:R.SWAP };
      }
      S.rounds++; S.i++;
      if(S.i >= S.n - 1){ S.phase = 'done'; S.j = null; }
      else { S.min = S.i; S.j = S.i + 1; S.phase = 'scan'; }
      return event;
    }
    return { kind:'ignored' };
  }

  // Refaz uma partida inteira a partir dos valores e do log.
  function replay(vals, log){
    var S = createState(vals);
    for(var k = 0; k < log.length; k++) apply(S, log.charAt(k));
    return S;
  }

  // Nota por velocidade: pontos das jogadas por minuto.
  // O tempo nunca conta menos que MIN_ACTION_MS por jogada, o que limita quem joga com robô.
  function rate(points, elapsedMs, actions){
    var ms = Math.max(elapsedMs, actions * R.MIN_ACTION_MS, R.MIN_TIME_MS);
    return Math.round(points * 60000 / ms);
  }

  return Object.freeze({
    makeValues: makeValues, valuesFor: valuesFor, createState: createState, val: val,
    apply: apply, replay: replay, rate: rate
  });
})();
