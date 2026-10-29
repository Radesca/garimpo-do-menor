/*
  Classificação da sala, calculada a partir dos dados brutos.

  Ninguém grava a própria nota. Cada jogador grava só as jogadas (o log) e o servidor carimba a hora
  em que ele terminou. Todo celular (o do professor e os dos alunos) refaz as partidas com a mesma
  função e chega ao mesmo ranking, então não adianta editar a nota na mão.
*/
Garimpo.Ranking = (function(){
  var Engine = Garimpo.Engine;

  function roundNumber(id){ return +String(id).slice(1); }   // 'r3' -> 3

  // room: os dados da sala no banco. serverNow: a hora do servidor neste instante.
  function compute(room, serverNow){
    var rounds = room.rounds || {}, players = room.players || {}, current = room.current;
    var ids = Object.keys(rounds).sort(function(a, b){ return roundNumber(a) - roundNumber(b); });

    var list = Object.keys(players).map(function(uid){
      var p = players[uid], total = 0;
      var now = { score:0, errors:0, progress:0, done:false, ms:0 };

      ids.forEach(function(id, k){
        var info = rounds[id], entry = p.rounds && p.rounds[id];
        if(!entry || !entry.log) return;   // quem não jogou a rodada fica com 0

        var S = Engine.replay(Engine.valuesFor(info.seed, info.n), entry.log);
        // Fim da contagem: a hora do servidor ao terminar. Se não terminou, até a rodada seguinte
        // (ou até agora, na rodada em andamento).
        var next = rounds[ids[k + 1]];
        var end = entry.finishedAt || (next ? next.startAt : serverNow);
        var elapsed = Math.max(0, end - info.startAt);
        var score = Engine.rate(S.points, elapsed, S.log.length);

        total += score;
        if(id === current){
          now = { score:score, errors:S.errors, progress:S.rounds / (info.n - 1), done:!!entry.finishedAt, ms:elapsed };
        }
      });

      return { id:uid, name:p.name || '?', total:total, score:now.score, errors:now.errors,
               progress:now.progress, done:now.done, ms:now.ms };
    });

    return list.sort(function(a, b){
      return b.total - a.total || ((a.done && b.done) ? a.ms - b.ms : 0) || a.name.localeCompare(b.name);
    });
  }

  return Object.freeze({ compute: compute, roundNumber: roundNumber });
})();
