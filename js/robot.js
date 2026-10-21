/*
  O Robô do modo Desafio.

  Ele não joga de verdade: sorteamos de antemão quanto tempo leva cada ação dele
  (comparar ou trocar) e a corrida só compara o relógio com esse "roteiro".
  O relógio dos dois começa na primeira jogada do jogador, então o robô não sai na frente.

  Uma partida com n gemas tem n(n−1)/2 comparações e n−1 trocas.
  A rodada r (começando em 0) tem (n−1−r) comparações e 1 troca, ou seja, n−r ações.
*/
Garimpo.Robot = (function(){
  // Tempo médio por comparação em milissegundos (a troca leva mais). Para mudar a dificuldade, mexa só aqui.
  // Com 7 gemas o robô termina em média em:
  //   calmo : ~1 min 40 s, dá tempo de pensar e errar um pouco
  //   normal: ~1 min 15 s, quem joga de forma constante consegue ganhar
  //   turbo : ~55 s, só com jogadas rápidas (dica: use as setas do teclado)
  var LEVELS = { calmo: 3400, normal: 2500, turbo: 1800 };

  // Na sala todos jogam a mesma partida, então o "tempo de referência" é fixo.
  var ROOM_MS = 1100;

  function actionsFor(n){ return n * (n - 1) / 2 + (n - 1); }

  // Roteiro com ritmo variável: comparar leva de 75% a 125% do tempo médio
  // e trocar leva mais (de 110% a 170%), como acontece com uma pessoa.
  function plan(n, ms){
    var steps = [], t = 0;
    for(var r = 0; r < n - 1; r++){
      for(var c = 0; c < n - 1 - r; c++){
        t += ms * (0.75 + Math.random() * 0.5);
        steps.push(t);
      }
      t += ms * (1.1 + Math.random() * 0.6);
      steps.push(t);
    }
    return { steps: steps, total: t, acts: steps.length };
  }

  function uniformPlan(n){
    var acts = actionsFor(n);
    return { steps: null, total: acts * ROOM_MS, acts: acts };
  }

  // Quantas ações o robô já terminou depois de `elapsed` ms.
  function actionsDone(p, elapsed){
    var k = 0;
    while(k < p.steps.length && p.steps[k] <= elapsed) k++;
    return k;
  }

  // Quantas gemas o robô já levou para a vitrine depois de `actions` ações.
  function gemsSorted(n, actions){
    var rounds = 0, used = 0;
    while(rounds < n - 1 && used + (n - rounds) <= actions){ used += n - rounds; rounds++; }
    return rounds >= n - 1 ? n : rounds;   // a última gema fica no lugar sozinha
  }

  return { LEVELS: LEVELS, plan: plan, uniformPlan: uniformPlan, actionsDone: actionsDone, gemsSorted: gemsSorted };
})();
