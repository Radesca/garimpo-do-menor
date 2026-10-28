/*
  Sala da turma: professor (admin) cria a sala, alunos entram pelo código ou QR,
  todos jogam a mesma sequência ao mesmo tempo e o ranking aparece ao vivo.

  Banco de dados (Firebase Realtime Database):
  rooms/{CODIGO}
    status   'lobby' | 'playing' | 'over'
    round    número da rodada atual (0 = ainda não começou)
    n, seed  quantidade de gemas e semente do sorteio (igual para todos)
    startAt  horário (do servidor) em que a rodada começa
    players/{id}  name, base (pontos de rodadas anteriores), score (rodada atual),
                  progress (0 a 1), errors, done, ms (tempo gasto)
*/
(function(){
  'use strict';
  var U = Garimpo.Util, $ = U.$, Screens = Garimpo.Screens, Game = Garimpo.Game, Fx = Garimpo.Fx;
  var LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

  var db = null, ref = null, offset = 0;
  var code = null, pid = null, myName = '', isAdmin = false;
  var room = null, players = {};
  var myRound = -1, playing = false, lastSnap = '';
  var adminN = 7, qrFor = '', overShown = false, cdTimer = null;

  /* ---------- utilidades ---------- */
  function now(){ return Date.now() + offset; }

  function err(t){ $('#roomErr').textContent = t || ''; }
  function toast(t){
    var el = document.createElement('div');
    el.className = 'toast'; el.textContent = t;
    document.body.appendChild(el);
    setTimeout(function(){ el.remove(); }, 3800);
  }
  function fail(e){
    if(window.console) console.error(e);
    var msg = (e && e.code==='PERMISSION_DENIED')
      ? 'Sem permissão no banco. Confira as regras do Firebase.'
      : 'Erro de conexão. Tente de novo.';
    if(!$('#roomHome').hidden) err(msg); else toast(msg);
  }

  function configured(){
    var c = window.FIREBASE_CONFIG;
    return !!(window.firebase && c && c.databaseURL && c.databaseURL.indexOf('COLE')<0);
  }
  function init(){
    if(db) return true;
    if(!configured()){
      err(window.firebase ? 'A sala ainda não foi configurada. Veja COMO-CONFIGURAR-SALA.md.' : 'Sem internet para carregar o Firebase.');
      return false;
    }
    try{
      firebase.initializeApp(window.FIREBASE_CONFIG);
      db = firebase.database();
      db.ref('.info/serverTimeOffset').on('value', function(s){ offset = s.val() || 0; });
      return true;
    }catch(e){ fail(e); return false; }
  }

  /* ---------- ranking ---------- */
  function standings(){
    return Object.keys(players).map(function(id){
      var p = players[id];
      return { id:id, name:p.name||'?', total:(p.base||0)+(p.score||0), score:p.score||0,
               progress:p.progress||0, errors:p.errors||0, done:!!p.done, ms:p.ms||0 };
    }).sort(function(a,b){
      return b.total-a.total || ((a.done&&b.done) ? a.ms-b.ms : 0) || a.name.localeCompare(b.name);
    });
  }

  // Atualiza as linhas existentes em vez de recriar, para as barras animarem.
  function renderRank(ul, list, mode){
    if(!ul) return;
    var have = {}, seen = {};
    [].forEach.call(ul.children, function(li){ have[li.dataset.id] = li; });
    list.forEach(function(p,i){
      seen[p.id] = 1;
      var li = have[p.id];
      if(!li){
        li = document.createElement('li'); li.dataset.id = p.id;
        li.innerHTML = '<span class="pos"></span><span class="nm"></span><span class="bar"><i></i></span><span class="pts"></span><span class="ex"></span>';
        ul.appendChild(li);
      }
      li.className = 'rk' + (p.id===pid?' me':'') + (p.done?' done':'') + (i<3?' top'+(i+1):'');
      li.style.order = i;
      li.children[0].textContent = i+1;
      li.children[1].textContent = p.name;
      li.children[2].firstChild.style.width = Math.round(p.progress*100)+'%';
      li.children[3].textContent = p.total;
      li.children[4].hidden = mode!=='full';
      li.children[4].textContent = 'rodada: '+p.score+' · erros: '+p.errors+(p.done ? ' · '+(p.ms/1000).toFixed(1)+'s' : '');
    });
    [].slice.call(ul.children).forEach(function(li){ if(!seen[li.dataset.id]) li.remove(); });
  }

  function podiumHTML(list){
    var order = [1,0,2], heights = [110,150,80];
    return '<div class="podium">' + order.map(function(k,idx){
      var p = list[k]; if(!p) return '';
      return '<div class="pod"><div class="pn">'+U.escape(p.name)+'</div><div class="pp">'+p.total+' pts</div>'+
             '<div class="blk b'+(k+1)+'" style="height:'+heights[idx]+'px">'+(k+1)+'º</div></div>';
    }).join('') + '</div>';
  }

  /* ---------- entrar e criar ---------- */
  function showHome(){
    err('');
    $('#joinName').value = U.store.get('gm:name') || '';
    var saved = U.store.get('gm:adminRoom');
    $('#reopen').hidden = !saved;
    if(saved) $('#reopen').textContent = 'Reabrir minha sala '+saved;
    Screens.show('roomHome');
  }

  function createRoom(){
    err('');
    if(!window.ADMIN_PIN){ err('Defina o ADMIN_PIN no firebase-config.js.'); return; }
    if($('#hostPin').value !== String(window.ADMIN_PIN)){ err('PIN incorreto.'); return; }
    if(!init()) return;
    var tries = 0;
    (function attempt(){
      var c = ''; for(var k=0;k<4;k++) c += LETTERS.charAt(Math.floor(Math.random()*LETTERS.length));
      db.ref('rooms/'+c).once('value').then(function(s){
        if(s.exists() && tries++<8) return attempt();
        return db.ref('rooms/'+c).set({
          status:'lobby', round:0, n:adminN, seed:1, startAt:0,
          createdAt:firebase.database.ServerValue.TIMESTAMP
        }).then(function(){ U.store.set('gm:adminRoom', c); enterAdmin(c); });
      }).catch(fail);
    })();
  }

  function reopenRoom(){
    var c = U.store.get('gm:adminRoom'); if(!c || !init()) return;
    db.ref('rooms/'+c).once('value').then(function(s){
      if(!s.exists()){ U.store.remove('gm:adminRoom'); showHome(); err('Essa sala não existe mais.'); return; }
      enterAdmin(c);
    }).catch(fail);
  }

  function enterAdmin(c){
    isAdmin = true; code = c; qrFor = ''; overShown = false;
    ref = db.ref('rooms/'+c);
    ref.on('value', onRoom, fail);
    Screens.show('admin');
  }

  function joinRoom(){
    err('');
    var c = ($('#joinCode').value||'').trim().toUpperCase();
    var name = ($('#joinName').value||'').trim().slice(0,14);
    if(c.length!==4){ err('O código tem 4 letras.'); return; }
    if(!name){ err('Digite um apelido.'); return; }
    if(!init()) return;
    db.ref('rooms/'+c).once('value').then(function(s){
      var r = s.val();
      if(!r){ err('Sala não encontrada. Confira o código.'); return; }
      if(r.status==='over'){ err('Essa sala já foi encerrada.'); return; }
      U.store.set('gm:name', name);
      var key = 'gm:pid:'+c; pid = U.store.get(key);
      if(!pid){ pid = 'p'+Date.now().toString(36)+Math.floor(Math.random()*1e5).toString(36); U.store.set(key, pid); }
      code = c; isAdmin = false; myName = name; myRound = -1; playing = false;
      var pref = db.ref('rooms/'+c+'/players/'+pid);
      return pref.once('value').then(function(ps){
        return pref.update(ps.exists() ? { name:name } : { name:name, base:0, score:0, progress:0, errors:0, done:false, ms:0 });
      }).then(function(){
        ref = db.ref('rooms/'+c);
        ref.on('value', onRoom, fail);
        Screens.show('roomWait');
      });
    }).catch(fail);
  }

  /* ---------- atualizações em tempo real ---------- */
  function onRoom(snap){
    room = snap.val();
    if(!room){ exitRoom('roomHome'); err('A sala foi fechada.'); return; }
    players = room.players || {};
    if(isAdmin) renderAdmin(); else playerFlow();

    var list = standings();
    renderRank($('#roomRank'), list, 'compact');
    var me = list.map(function(p){ return p.id; }).indexOf(pid);
    var rp = $('#roomPos');
    if(rp && me>=0) rp.textContent = 'Você está em '+(me+1)+'º lugar de '+list.length+'.';
    var live = $('#roomLive');
    if(live){
      live.hidden = !(playing && me>=0 && list.length);
      if(!live.hidden) live.textContent = (me+1)+'º lugar · líder: '+list[0].name+' ('+list[0].total+' pts)';
    }
  }

  /* ---------- lado do jogador ---------- */
  function playerFlow(){
    if(room.status==='over'){
      stopPlay(); Screens.show('roomWait'); renderWait();
      if(!overShown){ overShown = true; Fx.rain(); }
      return;
    }
    if(room.status==='playing' && room.round!==myRound){
      var late = now() - room.startAt;
      if(late < 15000){ beginRound(); }
      else { myRound = room.round; renderWait(); }  // chegou tarde: espera a próxima rodada
      return;
    }
    if(!playing) renderWait();
  }

  function renderWait(){
    var list = standings(), over = room.status==='over', msg;
    $('#waitTitle').textContent = 'Sala '+code;
    if(over) msg = 'Fim de jogo! Veja o pódio.';
    else if(room.status==='playing') msg = 'Rodada em andamento. Você entra na próxima!';
    else msg = 'Você está dentro, '+myName+'! Aguarde o professor iniciar a rodada.';
    $('#waitMsg').textContent = msg;
    $('#waitPodium').innerHTML = over ? podiumHTML(list) : '';
    renderRank($('#waitRank'), list, 'compact');
  }

  function beginRound(){
    myRound = room.round; playing = true; lastSnap = '';
    Game.startRoom({ seed:room.seed, n:room.n });
    var late = now() - room.startAt;
    if(late >= 0) Game.armClock(late); else countdown(room.startAt);
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
      var n = Math.ceil(rem/1000);
      if(n!==last){ last = n; cd.textContent = n; cd.className = 'cd'; void cd.offsetWidth; cd.className = 'cd tick'; }
    }
    step(); cdTimer = setInterval(step, 50);
  }

  function stopPlay(){
    playing = false; clearInterval(cdTimer); $('#cd').hidden = true; Game.leave();
  }

  // O game.js chama estas funções quando S.room está ligado.
  Garimpo.Rooms = {
    progress:function(S){
      if(!ref || isAdmin) return;
      var snap = [S.rankScore, S.rounds, S.errors].join();
      if(snap===lastSnap) return;
      lastSnap = snap;
      ref.child('players/'+pid).update({ score:S.rankScore, progress:S.rounds/(S.n-1), errors:S.errors });
    },
    finish:function(S){
      if(!ref || isAdmin) return;
      playing = false;
      ref.child('players/'+pid).update({ score:S.score, progress:1, errors:S.errors, done:true, ms:Math.round(S.elapsed) });
      $('#roomLive').hidden = true;
      renderRank($('#roomRank'), standings(), 'compact');
    },
    exit:function(){ exitRoom('start'); }
  };

  /* ---------- lado do professor ---------- */
  function drawQr(url){
    var box = $('#admQr');
    try{
      var q = qrcode(0,'M'); q.addData(url); q.make();
      box.innerHTML = q.createSvgTag(6,2);
    }catch(e){ box.textContent = ''; }
  }

  function renderAdmin(){
    var list = standings(), total = list.length;
    var done = list.filter(function(p){ return p.done; }).length;
    var over = room.status==='over';
    var base = location.href.split('#')[0].split('?')[0];
    var url = base + '?sala=' + code;

    $('#admCode').textContent = code;
    $('#admUrl').textContent = url.replace(/^https?:\/\//,'').replace(/index\.html$/,'');
    if(qrFor!==code){ qrFor = code; drawQr(url); }

    var st;
    if(over) st = 'Sala encerrada.';
    else if(room.status==='lobby') st = total ? total+' jogador(es) na sala. Pronto para começar!' : 'Aguardando os jogadores entrarem...';
    else st = 'Rodada '+room.round+' em andamento: '+done+' de '+total+' terminaram.';
    $('#admStatus').textContent = st;

    var btn = $('#admStart');
    btn.hidden = over; $('#admEnd').hidden = over; $('#admChips').hidden = over;
    btn.disabled = total===0;
    btn.textContent = room.status==='lobby' ? 'Iniciar rodada 1'
      : (done<total ? 'Forçar rodada '+(room.round+1) : 'Próxima rodada ('+(room.round+1)+')');

    renderRank($('#admRank'), list, 'full');
    $('#admPodium').innerHTML = over ? podiumHTML(list) : '';
    $('#admExit').textContent = over ? 'Fechar e apagar a sala' : 'Sair (a sala continua aberta)';
    if(over && !overShown){ overShown = true; Fx.rain(); }
  }

  function startRound(){
    if(!room || !Object.keys(players).length) return;
    var base = 'rooms/'+code+'/', u = {};
    Object.keys(players).forEach(function(id){
      var p = players[id], b = base+'players/'+id+'/';
      u[b+'base'] = (p.base||0) + (p.score||0);
      u[b+'score'] = 0; u[b+'progress'] = 0; u[b+'errors'] = 0; u[b+'done'] = false; u[b+'ms'] = 0;
    });
    u[base+'round'] = (room.round||0) + 1;
    u[base+'n'] = adminN;
    u[base+'seed'] = 1 + Math.floor(Math.random()*2147483000);
    u[base+'startAt'] = now() + 5500;
    u[base+'status'] = 'playing';
    db.ref().update(u).catch(fail);
  }

  function endRoom(){ if(ref) ref.update({ status:'over' }).catch(fail); }

  function exitRoom(goTo){
    var r = ref, wasOver = isAdmin && room && room.status==='over';
    ref = null;
    if(r){
      r.off();
      if(wasOver){ r.remove(); U.store.remove('gm:adminRoom'); }
    }
    clearInterval(cdTimer); $('#cd').hidden = true;
    Game.leave();
    room = null; players = {}; playing = false; myRound = -1; qrFor = ''; isAdmin = false; overShown = false;
    if(goTo==='roomHome') showHome(); else Screens.show(goTo || 'start');
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
    [].forEach.call($('#admChips').querySelectorAll('[data-an]'), function(x){ x.setAttribute('aria-pressed', String(x===b)); });
  });

  // Link do QR: ?sala=ABCD abre direto a tela de entrada.
  var qc = (new URLSearchParams(location.search).get('sala') || '').toUpperCase().slice(0,4);
  if(qc){ showHome(); $('#joinCode').value = qc; $('#joinName').focus(); }
})();
