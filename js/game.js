/*
  Tela de jogo: desenha a partida e liga os botões ao motor de regras (engine.js).

  O jogador faz o papel do algoritmo:
    i      "vaga"   primeira posição ainda não ordenada          (marcador branco)
    min    "menor"  posição da menor gema vista nesta rodada     (bandeira dourada)
    j      "lupa"   posição da gema sendo comparada com a menor  (lupa azul)
  Em cada rodada a lupa percorre as gemas depois de i (fase 'scan'). No fim, a menor
  troca de lugar com a vaga (fase 'swap') e a vaga avança. Quando sobra uma gema, acabou ('done').

  As regras e os pontos ficam no engine.js. Aqui ficam só a tela, os sons, os efeitos e o relógio.
*/
Garimpo.Game = (function(){
  var U = Garimpo.Util, Sound = Garimpo.Sound, Fx = Garimpo.Fx, Gems = Garimpo.Gems, Engine = Garimpo.Engine,
      Robot = Garimpo.Robot, Screens = Garimpo.Screens, RULES = Garimpo.RULES, cfg = Garimpo.cfg;
  var $ = U.$;

  /*
    S é o estado do motor (engine.js) mais o que é só da tela:
      room     true quando é uma rodada da sala (rooms.js)
      score    pontos mostrados na tela (a nota final, no fim do Desafio)
      t0, elapsed   relógio do Desafio e da sala
      bot      roteiro do robô (js/robot.js)
  */
  var S = null;
  var cells = [];                // elemento da tela de cada gema, pelo id
  var clock = null;              // intervalo que atualiza o tempo e a corrida
  var shownScore = 0, scoreAnim = 0;
  var cfgBackup = null;          // escolhas do jogador, guardadas enquanto ele joga na sala

  /* ---------- começar uma partida ---------- */

  // `seed` só existe nas rodadas da sala: com ela todos os celulares sorteiam as mesmas gemas.
  function newGame(room, seed){
    clearInterval(clock);
    var n = cfg.n;
    var vals = (seed != null) ? Engine.valuesFor(seed, n) : Engine.makeValues(n, cfg.twins);

    S = Engine.createState(vals);
    S.room = !!room;
    S.score = 0; S.t0 = 0; S.elapsed = 0; S.busy = false; S.lockedUntil = 0;
    S.fb = null; S.won = false; S.botNotified = false;
    S.bot = room ? Robot.uniformPlan(n) : Robot.plan(n, Robot.LEVELS[cfg.bot]);

    shownScore = 0; $('#score').textContent = '0';
    U.$$('#action .btn').forEach(function(b){ b.disabled = false; });
    $('#streak').hidden = true;
    Fx.clear();
    build();
    paint();
    mood('happy');
    clock = setInterval(tick, 100);
  }

  // Cria uma vez os elementos das gemas e da vitrine. Depois disso só mudamos classes e posições.
  function build(){
    var box = $('#gems'), shelf = $('#shelf'), planks = '';
    box.innerHTML = ''; cells = [];
    S.vals.forEach(function(value, id){
      var el = document.createElement('div');
      el.className = 'slot';
      el.style.setProperty('--k', id);
      var twin = (cfg.twins && id < 2) ? String(id + 1) : '';
      el.innerHTML = Gems.inner(value, Gems.colorFor(id, cfg.twins), twin, false);   // número só quando abrir
      box.appendChild(el); cells.push(el);
    });
    for(var k = 0; k < S.n; k++) planks += '<i class="plank" style="grid-column:' + (k + 1) + '"></i>';
    shelf.innerHTML = planks + '<span class="vit" id="vit">VITRINE</span>';
  }

  /* ---------- desenhar a tela a partir do estado ---------- */

  function val(pos){ return Engine.val(S, pos); }
  function slotAt(pos){ return cells[S.order[pos]]; }

  // O número de uma gema só existe na página enquanto ela está aberta. Ao fechar, some depois da
  // animação. Assim o inspetor do navegador não mostra os valores escondidos.
  function showNumber(el, id, open){
    var num = el.querySelector('.jewel .num');
    clearTimeout(el._hide);
    if(open) num.textContent = S.vals[id];
    else if(num.textContent) el._hide = setTimeout(function(){ num.textContent = ''; }, 700);
  }

  // Única função que mexe nas gemas e marcadores: a tela sempre reflete o estado S.
  function paint(){
    var n = S.n, i = S.i, j = S.j, min = S.min, done = S.phase === 'done', treino = cfg.mode === 'treino';
    var sorted = done ? n : i;
    $('#table').style.setProperty('--n', n);

    S.order.forEach(function(id, pos){
      var el = cells[id];
      // No Desafio só abrem as gemas ordenadas, a menor, a da lupa e (na hora da troca) a da vaga.
      var open = treino || done || pos < i || pos === min || pos === j || (S.phase === 'swap' && pos === i);
      el.style.gridColumn = pos + 1;
      el.classList.toggle('open', open);
      el.classList.toggle('sorted', pos < sorted);
      el.classList.toggle('ismin', !done && pos === min);
      el.classList.toggle('isscan', !done && pos === j);
      el.setAttribute('aria-label', open ? 'Gema ' + S.vals[id] : 'Pedra fechada');
      showNumber(el, id, open);
    });

    U.$$('.plank').forEach(function(p, k){ p.classList.toggle('gold', k < sorted); });
    var vit = $('#vit');
    vit.style.gridColumn = '1 / span ' + Math.max(sorted, 1);
    vit.hidden = sorted < 3;

    var markers = { vaga: i, menor: min, lupa: (j == null ? 0 : j) };
    U.$$('.mkr[data-k]').forEach(function(m){
      m.style.setProperty('--pos', markers[m.dataset.k]);   // o CSS desliza o marcador até a coluna
      m.classList.toggle('off', done || (m.dataset.k === 'lupa' && S.phase !== 'scan'));
    });

    $('#progFill').style.width = Math.round(sorted / n * 100) + '%';
    paintAction();
    paintSide();
    notifyRoom();
  }

  function paintAction(){
    var done = S.phase === 'done';
    $('#action').hidden = done; $('#kbd').hidden = done;
    $('#result').hidden = !done;
    if(done) return;

    var treino = cfg.mode === 'treino', i = S.i, scan = S.phase === 'scan';
    var vm = val(S.min), vj = scan ? val(S.j) : null;
    var hadFocus = $('#action').contains(document.activeElement);

    $('#round').textContent = 'Rodada ' + (i + 1) + ' · ' + (scan ? 'Comparação ' + (S.j - i) + ' · Busca do menor' : 'Hora de trocar');
    if(scan){
      $('#qtitle').textContent = 'Qual número é menor?';
      $('#prompt').innerHTML = treino
        ? 'Compare o número <b class="vj">' + vj + '</b> (indicado pela lupa) com o menor encontrado até agora: <b class="vm">' + vm + '</b> (indicado pela bandeira).'
        : 'Compare o número indicado pela lupa com o menor encontrado até agora (indicado pela bandeira).';
      $('#tipText').textContent = 'Se o número da lupa for menor, ele passa a ser o novo menor. Caso contrário, mantenha o menor atual.';
    } else if(S.min === i){
      $('#qtitle').textContent = 'A menor já está no lugar!';
      $('#prompt').innerHTML = 'A busca terminou e o <b class="vm">' + vm + '</b> já está na vaga certa (posição ' + (i + 1) + ').';
      $('#tipText').textContent = 'Não precisa trocar nada: fixe a gema na vitrine e siga para a próxima rodada.';
    } else {
      $('#qtitle').textContent = 'Leve a menor para a vitrine!';
      $('#prompt').innerHTML = 'A busca terminou. O menor número é <b class="vm">' + vm + '</b>, e ele vai para a vaga ' + (i + 1) + '.';
      $('#tipText').textContent = 'A menor troca de lugar com a gema da vaga. Ela fica ordenada na vitrine e a vaga avança.';
    }

    var hint = treino ? 'Só mudamos a bandeira se a da lupa for menor de verdade.'
      : (S.room ? 'Valendo! O relógio já está correndo.' : 'O relógio começa na sua primeira jogada.');
    var fb = $('#fb');
    fb.textContent = S.fb ? S.fb.text : hint;
    fb.className = 'fb' + (S.fb ? ' ' + S.fb.kind : '');

    var keep = $('[data-act=keep]'), move = $('[data-act=move]'), swap = $('[data-act=swap]');
    keep.hidden = move.hidden = !scan;
    swap.hidden = scan;
    if(!scan){
      swap.innerHTML = S.min === i
        ? '<span>Fixar na vitrine</span><small>A menor já está no lugar certo. Nenhuma troca nesta rodada.</small>'
        : '<span>Levar para a vitrine!</span><small>Trocar o ' + val(i) + ' da vaga com o ' + vm + ' (a menor).</small>';
    }
    if(hadFocus) (scan ? keep : swap).focus({ preventScroll: true });   // não perde o foco do teclado
  }

  // Pseudocódigo destacado, variáveis ao vivo e barra de progresso.
  function paintSide(){
    var scan = S.phase === 'scan', done = S.phase === 'done';
    U.$$('.ln').forEach(function(line){
      var k = +line.dataset.l, on = false, context = false;
      if(scan){ on = (k === 3 || k === 4); context = k < 3; }
      else if(!done){ on = k === 5; }
      line.classList.toggle('on', on); line.classList.toggle('ctx', context);
    });
    $('#vars').innerHTML = done ? 'Fim: nenhuma rodada restante.' :
      'n = <b>' + S.n + '</b> · i = <b>' + S.i + '</b> · j = <b>' + (scan ? S.j : '—') + '</b> · menor = <b>' + S.min +
      '</b> (valor <b>' + val(S.min) + '</b>) · comparações = <b>' + S.comps + '</b>/' + S.totalComps + ' · trocas = <b>' + S.swaps + '</b>';
    $('#race').hidden = cfg.mode === 'treino' || S.room;
    $('#progTxt').textContent = progressText();
    paintRace();
  }

  // Corrida contra o robô: duas pistas, contadores e uma frase dizendo quem está na frente.
  function paintRace(){
    if(cfg.mode === 'treino' || S.room) return;
    var n = S.n, done = S.phase === 'done';
    var mine = S.comps + S.rounds;
    var theirs = S.t0 ? Robot.actionsDone(S.bot, S.elapsed) : 0;
    $('#fMe').style.width = (mine / S.bot.acts * 100) + '%';
    $('#fBot').style.width = (theirs / S.bot.acts * 100) + '%';
    $('#lMe').textContent = 'Você ' + (done ? n : Math.min(S.rounds, n - 1)) + '/' + n;
    $('#lBot').textContent = 'Robô ' + Robot.gemsSorted(n, theirs) + '/' + n;
    $('#raceMsg').textContent = !S.t0 ? 'O Robô larga junto com você, na sua primeira jogada.'
      : (theirs >= S.bot.acts && !done) ? 'O Robô terminou! Termine com o melhor tempo que puder.'
      : mine > theirs ? 'Você está na frente!' : mine < theirs ? 'O Robô está na frente!' : 'Empate!';
  }

  // Texto do topo: posições ordenadas, passagem (rodada) e, no Desafio, o tempo.
  function progressText(){
    var done = S.phase === 'done';
    var text = 'Posições ordenadas: ' + (done ? S.n : S.i) + ' de ' + S.n + ' · Passagem: ' + Math.min(S.i + 1, S.n - 1) + ' de ' + (S.n - 1);
    if(cfg.mode === 'desafio') text += ' · Tempo: ' + ((S.t0 || done) ? U.fmt(S.elapsed) : 'pronto?');
    return text;
  }

  function tick(){
    if(!S || !S.t0 || S.phase === 'done') return;
    S.elapsed = performance.now() - S.t0;
    $('#progTxt').textContent = progressText();
    paintRace();
    if(!S.room && !S.botNotified && S.elapsed >= S.bot.total){
      S.botNotified = true;
      mood('sad'); Sound.play('bad');
      say('O Robô terminou! Termine para ver seu tempo.', 'bad');
      paintAction();
    }
  }

  // O relógio do Desafio começa na primeira jogada (na sala, quando termina a contagem).
  function startClock(){ if(!S.t0 && cfg.mode === 'desafio') S.t0 = performance.now(); }

  /* ---------- pequenos ajudantes de interface ---------- */

  function mood(kind){
    var el = $('#mascot');
    el.classList.remove('sad', 'cheer'); void el.getBoundingClientRect();
    if(kind === 'sad') el.classList.add('sad');
    if(kind === 'cheer') el.classList.add('cheer');
  }

  function say(text, kind){ S.fb = { text:text, kind:kind }; }

  // Os pontos sobem até o novo valor em vez de pular.
  function setScore(value){
    S.score = value; cancelAnimationFrame(scoreAnim);
    (function step(){
      var diff = S.score - shownScore;
      shownScore = Math.abs(diff) < 1 ? S.score : shownScore + diff * .2;
      $('#score').textContent = Math.round(shownScore);
      if(shownScore !== S.score) scoreAnim = requestAnimationFrame(step);
    })();
  }

  function showStreak(){
    var el = $('#streak');
    if(S.streak < 2){ el.hidden = true; return; }
    el.textContent = 'Sequência x' + S.streak + '!';
    el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  // Liga uma classe por `ms` milissegundos (para animações curtas).
  function flash(el, cls, ms){
    if(!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function(){ el.classList.remove(cls); }, ms);
  }

  // Há relógio correndo (Desafio e sala)? No Treino a nota é só a soma das jogadas.
  function timed(){ return cfg.mode === 'desafio' && S.t0 > 0; }

  // A sala grava as jogadas (o log) a cada passo. A nota é calculada por todos a partir delas.
  function notifyRoom(){
    if(S.room && Garimpo.Rooms) Garimpo.Rooms.progress(S);
  }

  // Depois de um erro no Desafio os botões travam um instante: errar custa tempo, então chutar não compensa.
  function isLocked(){ return performance.now() < S.lockedUntil; }
  function lockButtons(ms){
    var until = S.lockedUntil = performance.now() + ms;
    var buttons = U.$$('#action .btn');
    buttons.forEach(function(b){ b.disabled = true; });
    setTimeout(function(){
      if(!S || S.lockedUntil !== until) return;
      buttons.forEach(function(b){ b.disabled = false; });
      var visible = buttons.filter(function(b){ return !b.hidden; })[0];
      if(visible && document.activeElement === document.body) visible.focus({ preventScroll: true });
    }, ms);
  }

  /* ---------- as jogadas ---------- */

  // "Manter o menor atual" (keep) ou "Atualizar o menor" (move). É a comparação v[j] < v[menor] do algoritmo.
  function decide(choice){
    if(S.phase !== 'scan' || S.busy || isLocked()) return;
    startClock();
    var gem = slotAt(S.j);
    var event = Engine.apply(S, choice === 'move' ? 'm' : 'k');
    var vj = event.vj, vm = event.vm;

    if(event.kind === 'miss'){
      setScore(S.points); showStreak();
      Fx.floatText(gem, '-' + RULES.PENALTY, '#FF5C6C'); Fx.burst(gem, '#FF5C6C', 8);
      flash(gem, 'wrong', 500); flash($('#board'), 'shake', 400);
      mood('sad'); Sound.play('bad');
      say(choice === 'move'
        ? (vj === vm ? vj + ' = ' + vm + ': empate não troca a bandeira. Tente de novo!' : vj + ' não é menor que ' + vm + '. Tente de novo!')
        : vj + ' é menor que ' + vm + ': a bandeira vai para a lupa. Tente de novo!', 'bad');
      paintAction(); paintSide(); notifyRoom();
      if(cfg.mode === 'desafio') lockButtons(RULES.ERROR_LOCK_MS);
      return;
    }

    setScore(S.points);
    Fx.floatText(gem, '+' + event.points, '#35E0A1'); Fx.burst(gem, ['#35E0A1', '#FFC93C'], 7);
    flash(gem, 'hop', 450); mood('cheer'); Sound.play('ok', S.streak); showStreak();
    if(event.smaller) say(vj + ' < ' + vm + ': a bandeira passa para a ' + vj + '.', 'ok');
    else if(vj === vm) say(vj + ' = ' + vm + ': empate. A bandeira fica (só troca se for menor).', 'ok');
    else say(vj + ' > ' + vm + ': a bandeira continua na ' + vm + '.', 'ok');
    paint();
  }

  // Leva a menor para a vaga: trocar v[i] ↔ v[menor] (ou fixar, se já estava lá).
  function swapStep(){
    if(S.phase !== 'swap' || S.busy || isLocked()) return;
    startClock();
    var a = S.i, b = S.min;

    if(a === b){
      var stay = slotAt(a);
      var skip = Engine.apply(S, 's');
      setScore(S.points);
      say('Já estava no lugar, sem troca! Bônus econômico.', 'ok');
      Fx.burst(stay, ['#FFC93C', '#fff'], 12); Fx.floatText(stay, '+' + skip.points, '#FFC93C');
      Sound.play('swap'); mood('cheer'); showStreak();
      afterRound();
      return;
    }

    S.busy = true; Sound.play('swap');
    var gemA = slotAt(a), gemB = slotAt(b);
    var dx = gemB.getBoundingClientRect().left - gemA.getBoundingClientRect().left;
    var duration = U.reduceMotion ? 1 : 700;
    gemA.style.zIndex = 1; gemB.style.zIndex = 2;
    // As duas gemas trocam de lugar em arco: a menor passa por cima e a outra por baixo.
    var moveA = gemA.animate([
      { transform:'translate(0,0)' },
      { transform:'translate(' + (dx / 2) + 'px,22px)' },
      { transform:'translate(' + dx + 'px,0)' }
    ], { duration:duration, easing:'ease-in-out', fill:'forwards' });
    var moveB = gemB.animate([
      { transform:'translate(0,0) scale(1)' },
      { transform:'translate(' + (-dx / 2) + 'px,-60px) scale(1.2)' },
      { transform:'translate(' + (-dx) + 'px,0) scale(1)' }
    ], { duration:duration, easing:'ease-in-out', fill:'forwards' });

    moveB.finished.then(function(){
      var swap = Engine.apply(S, 's');   // a troca de verdade, só depois da animação
      setScore(S.points);
      say('Troca feita! A ' + val(a) + ' está na vitrine.', 'ok');
      afterRound(function(){ moveA.cancel(); moveB.cancel(); gemA.style.zIndex = gemB.style.zIndex = ''; });
      var landed = slotAt(a);
      Fx.burst(landed, ['#FFC93C', '#FFE08A', '#fff'], 14); Fx.floatText(landed, '+' + swap.points, '#FFC93C');
      flash(landed, 'hop', 450); mood('cheer'); showStreak();
    });
  }

  // Redesenha depois de uma rodada (ou termina a partida).
  function afterRound(beforePaint){
    S.busy = false;
    if(S.phase === 'done' && S.t0){ S.elapsed = performance.now() - S.t0; S.won = S.elapsed < S.bot.total; }
    if(beforePaint) beforePaint();   // solta as animações logo antes de redesenhar, sem piscar
    paint();
    if(S.phase === 'done') finish();
  }

  /* ---------- fim da partida ---------- */

  function starsFor(){
    var stars = 1;
    if(cfg.mode === 'desafio'){
      if(S.errors <= 1) stars++;
      if(S.won && S.errors === 0) stars++;
    } else {
      if(S.errors <= 2) stars++;
      if(S.errors === 0) stars++;
    }
    return stars;
  }

  function finish(){
    // No Desafio a nota final é a velocidade de pontuação (pontos das jogadas por minuto).
    if(timed()) setScore(Engine.rate(S.points, S.elapsed, S.log.length));
    var isBest = !S.room && S.score > U.best.get(cfg);
    if(isBest) U.best.save(cfg, S.score);

    $('#result').innerHTML = resultHTML(starsFor(), isBest);
    if(S.room && Garimpo.Rooms) Garimpo.Rooms.finish(S);
    $('#streak').hidden = true;
    mood('cheer'); Sound.play('win'); Fx.rain();

    var result = $('#result');
    setTimeout(function(){ result.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block:'center' }); }, 400);
    cells.forEach(function(el, k){ setTimeout(function(){ Fx.burst(el, ['#FFC93C', '#fff'], 6); }, 120 * k); });
  }

  function resultHTML(stars, isBest){
    var n = S.n, h = '<h2>Vitrine completa!</h2><div class="stars" aria-label="' + stars + ' de 3 estrelas">';
    for(var k = 0; k < 3; k++) h += '<span class="star' + (k < stars ? ' on' : '') + '" style="--d:' + (.3 + k * .25) + 's">★</span>';
    h += '</div><div class="final"><small>' + (timed() ? 'Pontuação final · pontos por minuto' : 'Pontuação final') + '</small><span id="finalScore">' + S.score + '</span></div>';
    if(isBest) h += '<span class="newbest">Novo recorde!</span>';

    h += '<ul class="facts">';
    if(S.room){
      h += '<li><b>' + S.points + ' pontos das jogadas.</b> A nota final (pontos por minuto) usa o relógio do servidor e aparece no ranking abaixo.</li>';
    } else if(timed()){
      h += '<li><b>Nota por velocidade:</b> ' + S.points + ' pontos em ' + U.fmt(S.elapsed) + ' = <b>' + S.score + ' pontos por minuto</b>.</li>';
    }
    if(cfg.mode === 'desafio' && !S.room){
      h += '<li><b>' + (S.won ? 'Você venceu o Robô!' : 'O Robô chegou primeiro.') + '</b> Seu tempo: ' + U.fmt(S.elapsed) +
           '. Ele levaria ' + U.fmt(S.bot.total) + '.</li>';
    }
    h += '<li><b>' + S.comps + ' comparações.</b> Sempre n(n−1)/2 = ' + S.totalComps + ', não importa a ordem inicial. Por isso o custo é O(n²).</li>';
    h += '<li><b>' + S.swaps + ' trocas</b> (máximo ' + (n - 1) + ').' +
         (S.skipped ? ' Em ' + S.skipped + ' rodada(s) a menor já estava no lugar.' : '') + ' O ponto forte do método é fazer poucas trocas.</li>';
    h += '<li>Erros: <b>' + S.errors + '</b> · Maior sequência de acertos: <b>' + S.bestStreak + '</b></li>';
    if(cfg.twins){
      var posOne = S.order.indexOf(0), posTwo = S.order.indexOf(1), v = S.vals[0];
      h += '<li class="note">' + (posOne > posTwo
        ? 'As duas gemas <b>' + v + '</b> trocaram de ordem: a gema 1 começou antes da 2 e terminou depois. O selection sort <b>não é estável</b>.'
        : 'As duas gemas <b>' + v + '</b> mantiveram a ordem desta vez, mas o selection sort não garante isso.') + '</li>';
    }
    h += '</ul>';

    if(S.room) h += '<p class="roompos" id="roomPos"></p><ul class="rank" id="roomRank"></ul><p class="waitnote">Aguarde o professor liberar a próxima rodada.</p>';
    else h += '<div class="endbtns"><button class="btn b-gold" id="again">Jogar de novo</button><button class="btn b-ghost" id="menu">Menu</button></div>';
    return h;
  }

  /* ---------- entradas: botões e teclado ---------- */

  function bindControls(){
    $('#action').addEventListener('click', function(e){
      var button = e.target.closest('button'); if(!button) return;
      if(button.dataset.act === 'swap') swapStep(); else decide(button.dataset.act);
    });
    $('#result').addEventListener('click', function(e){
      if(e.target.closest('#again')){ Sound.play('tap'); newGame(); window.scrollTo({ top:0 }); }
      else if(e.target.closest('#menu')){ Garimpo.Menu.sync(); Screens.show('start'); }
    });
    $('#back').addEventListener('click', function(){
      if(S && S.room && Garimpo.Rooms){ Garimpo.Rooms.exit(); return; }
      Garimpo.Menu.sync(); Screens.show('start');
    });
    $('#snd').addEventListener('click', function(){
      var muted = Sound.toggleMute();
      this.setAttribute('aria-pressed', String(muted));
      $('#sndWave').style.display = muted ? 'none' : '';
      if(!muted) Sound.play('tap');
    });
    // ← mantém o menor atual, → atualiza o menor (ou leva para a vitrine).
    document.addEventListener('keydown', function(e){
      if(!S || $('#game').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
      if(e.key === 'ArrowLeft' && S.phase === 'scan'){ e.preventDefault(); decide('keep'); }
      else if(e.key === 'ArrowRight'){ e.preventDefault(); if(S.phase === 'scan') decide('move'); else swapStep(); }
    });
  }

  /* ---------- API usada pelos outros arquivos ---------- */

  bindControls();

  return Object.freeze({
    start: function(){ Screens.show('game'); newGame(); },
    stopClock: function(){ clearInterval(clock); },

    // Rodada da sala: sorteio com a semente do professor e escolhas travadas (Desafio, sem gêmeas).
    startRoom: function(o){
      if(!cfgBackup) cfgBackup = { mode:cfg.mode, n:cfg.n, twins:cfg.twins };
      cfg.mode = 'desafio'; cfg.n = o.n; cfg.twins = false;
      Screens.show('game'); newGame(true, o.seed);
    },
    // Liga o relógio (msAgo > 0 quando o jogador entrou depois da largada).
    armClock: function(msAgo){ if(S && !S.t0) S.t0 = performance.now() - (msAgo || 0); },
    // Sai da sala e devolve ao jogador as escolhas que ele tinha.
    leave: function(){
      clearInterval(clock);
      if(cfgBackup){ cfg.mode = cfgBackup.mode; cfg.n = cfgBackup.n; cfg.twins = cfgBackup.twins; cfgBackup = null; }
      S = null;
      Garimpo.Menu.sync();
    }
  });
})();
