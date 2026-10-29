/*
  Sala da turma: professor (admin) cria a sala, alunos entram pelo código ou QR,
  todos jogam a mesma sequência ao mesmo tempo e o ranking aparece ao vivo.

  Segurança (regras em database.rules.json):
  - Cada pessoa entra no Firebase com login anônimo e ganha um uid. O professor é quem criou a sala
    (adminUid): só ele muda o estado da sala. Cada aluno só escreve na própria pasta.
  - Ninguém grava nota. O aluno grava só as jogadas (log) e o servidor carimba a hora em que ele
    terminou. A nota é recalculada por todos a partir disso (veja ranking.js e engine.js).

  Banco de dados (Realtime Database):
  rooms/{CODIGO}
    adminUid   uid do professor
    status     'lobby' | 'playing' | 'over'
    current    rodada atual: 'r0' (ainda não começou), 'r1', 'r2'...
    rounds/{r}   n, seed (sorteio igual para todos) e startAt (hora do servidor em que a rodada começa)
    players/{uid}  name e rounds/{r}: log (as jogadas) e finishedAt (hora do servidor ao terminar)
*/
(function(){
  'use strict';
  var U = Garimpo.Util, $ = U.$, Screens = Garimpo.Screens, Game = Garimpo.Game, Fx = Garimpo.Fx, Ranking = Garimpo.Ranking;
  var LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // sem I e O (as regras do banco aceitam só estas letras)

  var db = null, ref = null, uid = null, offset = 0, session = null;
  var code = null, myName = '', isAdmin = false, room = null;
  var myRound = null, playing = false, lastLog = '';
  var adminN = 7, qrFor = '', overShown = false, cdTimer = null, liveTimer = null;

  /* ---------- utilidades ---------- */
  function now(){ return Date.now() + offset; }   // hora do servidor

  function err(t){ $('#roomErr').textContent = t || ''; }
  function toast(t){
    var el = document.createElement('div');
    el.className = 'toast'; el.textContent = t;
    document.body.appendChild(el);
    setTimeout(function(){ el.remove(); }, 3800);
  }
  function say(msg){ if(!$('#roomHome').hidden) err(msg); else toast(msg); }
  function fail(e){
    if(window.console) console.error(e);
    say((e && e.code === 'PERMISSION_DENIED')
      ? 'O banco recusou a operação (regras do Firebase).'
      : 'Erro de conexão. Tente de novo.');
  }
  function quiet(e){ if(window.console) console.warn(e); }

  function configured(){
    var c = window.FIREBASE_CONFIG;
    return !!(window.firebase && c && c.databaseURL && c.databaseURL.indexOf('COLE') < 0);
  }

  // Conecta ao Firebase e entra com login anônimo. Devolve uma promessa de true ou false.
  function connect(){
    if(session) return session;
    if(!configured()){
      err(window.firebase ? 'A sala ainda não foi configurada. Veja docs/CONFIGURAR-SALA.md.' : 'Sem internet para carregar o Firebase.');
      return Promise.resolve(false);
    }
    try{
      if(!db){
        firebase.initializeApp(window.FIREBASE_CONFIG);
        db = firebase.database();
        db.ref('.info/serverTimeOffset').on('value', function(s){ offset = s.val() || 0; });
      }
      session = firebase.auth().signInAnonymously().then(function(cred){
        uid = cred.user.uid;
        return true;
      }).catch(function(e){
        session = null;
        say(e && e.code === 'auth/operation-not-allowed'
          ? 'Ative o login Anônimo no Firebase (Authentication → Método de login).'
          : 'Não consegui entrar no Firebase. Tente de novo.');
        return false;
      });
    }catch(e){ session = null; fail(e); return Promise.resolve(false); }
    return session;
  }

  /* ---------- ranking na tela ---------- */
  function standings(){ return room ? Ranking.compute(room, now()) : []; }

  // Atualiza as linhas existentes em vez de recriar, para as barras animarem.
  function renderRank(ul, list, mode){
    if(!ul) return;
    var have = {}, seen = {};
    [].forEach.call(ul.children, function(li){ have[li.dataset.id] = li; });
    list.forEach(function(p, i){
      seen[p.id] = 1;
      var li = have[p.id];
      if(!li){
        li = document.createElement('li'); li.dataset.id = p.id;
        li.innerHTML = '<span class="pos"></span><span class="nm"></span><span class="bar"><i></i></span><span class="pts"></span><span class="ex"></span>';
        ul.appendChild(li);
      }
      li.className = 'rk' + (p.id === uid ? ' me' : '') + (p.done ? ' done' : '') + (i < 3 ? ' top' + (i + 1) : '');
      li.style.order = i;
      li.children[0].textContent = i + 1;
      li.children[1].textContent = p.name;
      li.children[2].firstChild.style.width = Math.round(p.progress * 100) + '%';
      li.children[3].textContent = p.total;
      li.children[4].hidden = mode !== 'full';
      li.children[4].textContent = 'rodada: ' + p.score + ' · erros: ' + p.errors + (p.done ? ' · ' + (p.ms / 1000).toFixed(1) + 's' : '');
    });
    [].slice.call(ul.children).forEach(function(li){ if(!seen[li.dataset.id]) li.remove(); });
  }

  function podiumHTML(list){
    var order = [1, 0, 2], heights = [110, 150, 80];
    return '<div class="podium">' + order.map(function(k, idx){
      var p = list[k]; if(!p) return '';
      return '<div class="pod"><div class="pn">' + U.escape(p.name) + '</div><div class="pp">' + p.total + ' pts</div>' +
             '<div class="blk b' + (k + 1) + '" style="height:' + heights[idx] + 'px">' + (k + 1) + 'º</div></div>';
    }).join('') + '</div>';
  }

  // Recalcula e desenha tudo que depende do ranking. Roda a cada mudança no banco e a cada segundo,
  // porque a nota de quem ainda joga cai com o passar do tempo.
  function refresh(){
    if(!room) return;
    var list = standings();
    if(isAdmin) renderAdmin(list); else if(!playing) renderWait(list);

    renderRank($('#roomRank'), list, 'compact');
    var me = list.map(function(p){ return p.id; }).indexOf(uid);
    var pos = $('#roomPos');
    if(pos && me >= 0) pos.textContent = 'Você está em ' + (me + 1) + 'º lugar de ' + list.length + '.';
    var finalScore = $('#finalScore');
    if(finalScore && me >= 0 && list[me].done) finalScore.textContent = list[me].score;   // nota calculada com o relógio do servidor

    var live = $('#roomLive');
    if(live){
      live.hidden = !(playing && me >= 0 && list.length);
      if(!live.hidden) live.textContent = (me + 1) + 'º lugar · líder: ' + list[0].name + ' (' + list[0].total + ' pts)';
    }
  }

  /* ---------- entrar e criar ---------- */
  function showHome(){
    err('');
    $('#joinName').value = U.store.get('gm:name') || '';
    var saved = U.store.get('gm:adminRoom');
    $('#reopen').hidden = !saved;
    if(saved) $('#reopen').textContent = 'Reabrir minha sala ' + saved;
    Screens.show('roomHome');
  }

  function randomCode(){
    var c = '';
    for(var k = 0; k < 4; k++) c += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
    return c;
  }

  function createRoom(){
    err('');
    if(!window.ADMIN_PIN){ err('Defina o ADMIN_PIN no firebase-config.js.'); return; }
    if($('#hostPin').value !== String(window.ADMIN_PIN)){ err('PIN incorreto.'); return; }
    connect().then(function(ok){
      if(!ok) return;
      var tries = 0;
      (function attempt(){
        var c = randomCode();
        db.ref('rooms/' + c).once('value').then(function(s){
          if(s.exists() && tries++ < 8) return attempt();
          return db.ref('rooms/' + c).set({
            adminUid: uid, status: 'lobby', current: 'r0',
            createdAt: firebase.database.ServerValue.TIMESTAMP
          }).then(function(){ U.store.set('gm:adminRoom', c); enterAdmin(c); });
        }).catch(fail);
      })();
    });
  }

  function reopenRoom(){
    var c = U.store.get('gm:adminRoom'); if(!c) return;
    connect().then(function(ok){
      if(!ok) return;
      db.ref('rooms/' + c).once('value').then(function(s){
        var r = s.val();
        if(!r){ U.store.remove('gm:adminRoom'); showHome(); err('Essa sala não existe mais.'); return; }
        if(r.adminUid !== uid){ err('Esta sala foi criada em outro navegador. Só quem a criou consegue reabri-la.'); return; }
        enterAdmin(c);
      }).catch(fail);
    });
  }

  function listen(c){
    code = c;
    ref = db.ref('rooms/' + c);
    ref.on('value', onRoom, fail);
    clearInterval(liveTimer);
    liveTimer = setInterval(function(){ if(room && room.status === 'playing') refresh(); }, 1000);
  }

  function enterAdmin(c){
    isAdmin = true; qrFor = ''; overShown = false;
    listen(c);
    Screens.show('admin');
  }

  function joinRoom(){
    err('');
    var c = ($('#joinCode').value || '').trim().toUpperCase();
    var name = ($('#joinName').value || '').trim().slice(0, 14);
    if(c.length !== 4){ err('O código tem 4 letras.'); return; }
    if(!name){ err('Digite um apelido.'); return; }
    connect().then(function(ok){
      if(!ok) return;
      return db.ref('rooms/' + c).once('value').then(function(s){
        var r = s.val();
        if(!r){ err('Sala não encontrada. Confira o código.'); return; }
        if(r.status === 'over'){ err('Essa sala já foi encerrada.'); return; }
        U.store.set('gm:name', name);
        myName = name; isAdmin = false; myRound = null; playing = false; lastLog = '';
        return db.ref('rooms/' + c + '/players/' + uid).update({ name: name }).then(function(){
          listen(c);
          Screens.show('roomWait');
        });
      });
    }).catch(fail);
  }

  /* ---------- atualizações em tempo real ---------- */
  function onRoom(snap){
    room = snap.val();
    if(!room){ exitRoom('roomHome'); err('A sala foi fechada.'); return; }
    if(!isAdmin) playerFlow();
    refresh();
  }

  /* ---------- lado do jogador ---------- */
  function playerFlow(){
    if(room.status === 'over'){
      stopPlay(); Screens.show('roomWait'); renderWait(standings());
      if(!overShown){ overShown = true; Fx.rain(); }
      return;
    }
    var round = room.current, info = room.rounds && room.rounds[round];
    if(room.status === 'playing' && info && round !== myRound){
      if(now() - info.startAt < 15000) beginRound(round, info);
      else myRound = round;   // chegou tarde: espera a próxima rodada
    }
  }

  function renderWait(list){
    var over = room.status === 'over', msg;
    $('#waitTitle').textContent = 'Sala ' + code;
    if(over) msg = 'Fim de jogo! Veja o pódio.';
    else if(room.status === 'playing') msg = 'Rodada em andamento. Você entra na próxima!';
    else msg = 'Você está dentro, ' + myName + '! Aguarde o professor iniciar a rodada.';
    $('#waitMsg').textContent = msg;
    $('#waitPodium').innerHTML = over ? podiumHTML(list) : '';
    renderRank($('#waitRank'), list, 'compact');
  }

  function beginRound(round, info){
    myRound = round; playing = true; lastLog = '';
    Game.startRoom({ seed: info.seed, n: info.n });
    var late = now() - info.startAt;
    if(late >= 0) Game.armClock(late); else countdown(info.startAt);
  }

  function countdown(startAt){
    var cd = $('#cd'), last = -1;
    cd.hidden = false; clearInterval(cdTimer);
    function step(){
      var rem = startAt - now();
      if(rem <= 0){
        clearInterval(cdTimer);
        cd.textContent = 'JÁ!'; cd.className = 'cd tick';
        Game.armClock(0);
        setTimeout(function(){ cd.hidden = true; }, 650);
        return;
      }
      var n = Math.ceil(rem / 1000);
      if(n !== last){ last = n; cd.textContent = n; cd.className = 'cd'; void cd.offsetWidth; cd.className = 'cd tick'; }
    }
    step(); cdTimer = setInterval(step, 50);
  }

  function stopPlay(){
    playing = false; clearInterval(cdTimer); $('#cd').hidden = true; Game.leave();
  }

  function myRoundRef(){ return ref.child('players/' + uid + '/rounds/' + myRound); }

  // O game.js chama estas funções nas rodadas da sala. Só as jogadas vão para o banco.
  Garimpo.Rooms = Object.freeze({
    progress: function(S){
      if(!ref || isAdmin || !myRound || S.log === lastLog) return;
      lastLog = S.log;
      myRoundRef().update({ log: S.log }).catch(quiet);
    },
    finish: function(S){
      if(!ref || isAdmin || !myRound) return;
      playing = false;
      // finishedAt é a hora do servidor: ninguém consegue declarar um tempo menor que o real.
      myRoundRef().update({ log: S.log, finishedAt: firebase.database.ServerValue.TIMESTAMP }).catch(fail);
      $('#roomLive').hidden = true;
      refresh();
    },
    exit: function(){ exitRoom('start'); }
  });

  /* ---------- lado do professor ---------- */
  function drawQr(url){
    var box = $('#admQr');
    try{
      var q = qrcode(0, 'M'); q.addData(url); q.make();
      box.innerHTML = q.createSvgTag(6, 2);
    }catch(e){ box.textContent = ''; }
  }

  function renderAdmin(list){
    var total = list.length;
    var done = list.filter(function(p){ return p.done; }).length;
    var over = room.status === 'over';
    var number = Ranking.roundNumber(room.current);
    var base = location.href.split('#')[0].split('?')[0];
    var url = base + '?sala=' + code;

    $('#admCode').textContent = code;
    $('#admUrl').textContent = url.replace(/^https?:\/\//, '').replace(/index\.html$/, '');
    if(qrFor !== code){ qrFor = code; drawQr(url); }

    var st;
    if(over) st = 'Sala encerrada.';
    else if(room.status === 'lobby') st = total ? total + ' jogador(es) na sala. Pronto para começar!' : 'Aguardando os jogadores entrarem...';
    else st = 'Rodada ' + number + ' em andamento: ' + done + ' de ' + total + ' terminaram.';
    $('#admStatus').textContent = st;

    var btn = $('#admStart');
    btn.hidden = over; $('#admEnd').hidden = over; $('#admChips').hidden = over;
    btn.disabled = total === 0;
    btn.textContent = room.status === 'lobby' ? 'Iniciar rodada 1'
      : (done < total ? 'Forçar rodada ' + (number + 1) : 'Próxima rodada (' + (number + 1) + ')');

    renderRank($('#admRank'), list, 'full');
    $('#admPodium').innerHTML = over ? podiumHTML(list) : '';
    $('#admExit').textContent = over ? 'Fechar e apagar a sala' : 'Sair (a sala continua aberta)';
    if(over && !overShown){ overShown = true; Fx.rain(); }
  }

  // O professor só escreve o estado da sala: a rodada nova, com semente e hora de largada.
  function startRound(){
    if(!room || !Object.keys(room.players || {}).length) return;
    var next = 'r' + (Ranking.roundNumber(room.current) + 1);
    var update = { status: 'playing', current: next };
    update['rounds/' + next] = {
      n: adminN,
      seed: 1 + Math.floor(Math.random() * 2147483000),
      startAt: now() + 5500
    };
    ref.update(update).catch(fail);
  }

  function endRoom(){ if(ref) ref.update({ status: 'over' }).catch(fail); }

  function exitRoom(goTo){
    var r = ref, wasOver = isAdmin && room && room.status === 'over';
    ref = null;
    if(r){
      r.off();
      if(wasOver){ r.remove().catch(quiet); U.store.remove('gm:adminRoom'); }
    }
    clearInterval(cdTimer); clearInterval(liveTimer); $('#cd').hidden = true;
    Game.leave();
    room = null; playing = false; myRound = null; qrFor = ''; isAdmin = false; overShown = false;
    if(goTo === 'roomHome') showHome(); else Screens.show(goTo || 'start');
  }

  /* ---------- botões ---------- */
  $('#roomBtn').addEventListener('click', showHome);
  $('#roomBack').addEventListener('click', function(){ Screens.show('start'); });
  $('#joinForm').addEventListener('submit', function(e){ e.preventDefault(); joinRoom(); });
  $('#hostForm').addEventListener('submit', function(e){ e.preventDefault(); createRoom(); });
  $('#reopen').addEventListener('click', reopenRoom);
  $('#admStart').addEventListener('click', startRound);
  $('#admEnd').addEventListener('click', endRoom);
  $('#admExit').addEventListener('click', function(){ exitRoom('start'); });
  $('#waitExit').addEventListener('click', function(){ exitRoom('start'); });
  $('#admChips').addEventListener('click', function(e){
    var b = e.target.closest('[data-an]'); if(!b) return;
    adminN = +b.dataset.an;
    U.$$('#admChips [data-an]').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); });
  });

  // Link do QR: ?sala=ABCD abre direto a tela de entrada.
  var qc = (new URLSearchParams(location.search).get('sala') || '').toUpperCase().slice(0, 4);
  if(qc){ showHome(); $('#joinCode').value = qc; $('#joinName').focus(); }
})();
