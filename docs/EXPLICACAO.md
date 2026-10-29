# Garimpo do Menor: guia do código

O jogo é feito só com HTML, CSS e JavaScript puros, sem bibliotecas (o Firebase e o gerador de QR são carregados por CDN, só para a sala).

```
index.html                  as telas do jogo
css/style.css               aparência e animações
js/                         a lógica, um arquivo por assunto
firebase-config.example.js  modelo da configuração da sala
```

---

## 1. O selection sort, antes do código

Em cada rodada o algoritmo faz isto:

1. Marca a primeira posição livre (`i`) como "menor até agora".
2. Passa uma "lupa" (`j`) por todas as posições seguintes. Se achar algo menor que o marcado, move a marcação.
3. No fim da busca, troca o menor encontrado com a posição `i`. Essa posição fica ordenada.
4. Repete com `i + 1`, até sobrar só uma gema.

```
para i de 0 até n−2:
    menor ← i
    para j de i+1 até n−1:
        se v[j] < v[menor]: menor ← j
    se menor ≠ i: trocar v[i] ↔ v[menor]
```

No jogo, **você é o algoritmo**:

| No algoritmo | No jogo |
|---|---|
| `i` | **Vaga** (primeira posição livre da vitrine) |
| `menor` | **Bandeira dourada** |
| `j` | **Lupa azul** |
| `se v[j] < v[menor]` | Botões **Manter o menor atual** / **Atualizar o menor** |
| `trocar v[i] ↔ v[menor]` | Botão **Levar para a vitrine!** |

Por que é O(n²): as comparações são sempre n(n−1)/2, não importa a ordem inicial. As trocas são no máximo n−1. A tela final mostra os dois números.

---

## 2. Como os arquivos se conectam

Não há bundler nem módulos: cada arquivo de `js/` cria um módulo dentro do objeto global `Garimpo`, e os scripts são carregados na ordem do `index.html`.

| Arquivo | Módulo | O que faz |
|---|---|---|
| `config.js` | `Garimpo.cfg`, `Garimpo.RULES` | Escolhas do jogador e valores de pontuação |
| `util.js` | `Garimpo.Util` | `$`, armazenamento (`store`), recorde (`best`), sorteio com semente (`rand`), `fmt`, `escape` |
| `sound.js` | `Garimpo.Sound` | Sons gerados com a Web Audio API |
| `gems.js` | `Garimpo.Gems` | SVG das gemas e pedras, paleta de cores |
| `effects.js` | `Garimpo.Fx` | Faíscas, pontos subindo, confete |
| `robot.js` | `Garimpo.Robot` | O roteiro do Robô e os níveis |
| `engine.js` | `Garimpo.Engine` | As regras do jogo e os pontos, sem tela. Também refaz uma partida a partir do log |
| `ranking.js` | `Garimpo.Ranking` | Calcula o ranking da sala a partir dos logs e do relógio do servidor |
| `screens.js` | `Garimpo.Screens` | Mostrar uma tela e esconder as outras |
| `game.js` | `Garimpo.Game` | Desenho da partida e ligação dos botões ao motor |
| `tutorial.js` | `Garimpo.Tutorial` | O "Como jogar" |
| `menu.js` | `Garimpo.Menu` | Tela inicial |
| `rooms.js` | `Garimpo.Rooms` | Sala da turma (Firebase) |

O `game.js` não sabe nada sobre a sala. Em rodadas da sala ele só chama `Garimpo.Rooms.progress(S)` e `Garimpo.Rooms.finish(S)`, e o `rooms.js` grava as jogadas (o log).

As regras do jogo ficam no `engine.js`, sem nada de tela. Uma partida é uma lista de valores mais um log de jogadas (`k` manter, `m` atualizar o menor, `s` levar para a vitrine), e `Engine.replay(valores, log)` refaz a partida inteira. É isso que permite recalcular a nota de qualquer jogador sem confiar no que ele diz.

---

## 3. `game.js` em detalhe

### O estado: o objeto `S` (criado pelo `engine.js`)
```
S.vals    número de cada gema, pelo id (nunca muda)
S.order   order[posição] = id da gema que está ali (muda nas trocas)
S.i       a Vaga     S.min   a Bandeira     S.j   a Lupa
S.phase   'scan' (comparando) | 'swap' (hora de trocar) | 'done'
```
Cada gema tem um **id fixo** (sua posição inicial). Trocar duas gemas é trocar dois itens de `S.order`, e o elemento da tela continua o mesmo. Por isso as animações são suaves.

### Funções principais
- `newGame()`: sorteia valores (`makeValues`), cria o estado, desenha (`build`) e pinta a tela (`paint`).
- `paint()`: lê `S` e atualiza tudo (gemas, vitrine, marcadores, barra, texto do mascote). É a única função que mexe na tela do jogo, então o desenho sempre bate com o estado.
- `decide('keep' | 'move')`: a comparação `v[j] < v[menor]`. Se o jogador errou, perde pontos e a sequência zera. Se acertou, move a Lupa e, se for menor, a Bandeira.
- `swapStep()`: faz a troca com uma animação em arco (Web Animations API) e só depois troca os itens de `S.order`. Se a menor já estava na vaga, não há troca (bônus).
- `endRound()` e `finish()`: avançam a vaga e, no fim, calculam estrelas, bônus e recorde.

### Modos
- **Treino:** todas as gemas abertas.
- **Desafio:** só abrem as gemas ordenadas, a Bandeira, a Lupa e a Vaga na hora da troca. O relógio começa na primeira jogada.

---

## 4. O Robô (`robot.js`)

O robô não joga de verdade. Antes da partida, `Robot.plan(n, ms)` sorteia o tempo de cada ação dele (comparar leva de 75% a 125% do tempo médio, trocar leva de 110% a 170%). A corrida só compara o seu relógio com esse roteiro, e o relógio dos dois começa na sua primeira jogada.

| Nível | Tempo médio por ação | 7 gemas (27 ações) | Para quem é |
|---|---|---|---|
| Calmo | 3,4 s | ~1 min 40 s | quem está aprendendo |
| Normal | 2,5 s | ~1 min 15 s | qualquer pessoa jogando de forma constante |
| Turbo | 1,8 s | ~55 s | só com jogadas rápidas (use as setas do teclado) |

Para mudar a dificuldade, edite `LEVELS` no topo do `robot.js`.

---

## 5. A Sala da turma (`rooms.js`)

O site continua sendo arquivos estáticos. O que une os celulares é o Firebase Realtime Database, que avisa todo mundo quando algo muda. Cada pessoa entra com login anônimo (`firebase.auth().signInAnonymously()`) e ganha um uid. Cada sala é uma pasta no banco:

```
rooms/ABCD
  adminUid   uid do professor (quem criou a sala)
  status     'lobby' (esperando) | 'playing' (rodando) | 'over' (encerrada)
  current    rodada atual: 'r0' (não começou), 'r1', 'r2'...
  rounds/r1  n, seed (sorteio) e startAt (hora do servidor da largada)
  players/<uid>/name
  players/<uid>/rounds/r1/log          as jogadas, por exemplo "mmkkmsmkk..."
  players/<uid>/rounds/r1/finishedAt   hora do servidor em que terminou
```

- **Mesma sequência para todos:** o `seed` vai para `Util.rand.withSeed`. Com a mesma semente, todos os celulares sorteiam os mesmos números.
- **Largada sincronizada:** o professor grava `startAt = agora + 5,5 s` usando a hora do servidor (`.info/serverTimeOffset`). Cada celular mostra a contagem até esse horário.
- **Ninguém grava nota.** O aluno grava só o log. `Ranking.compute` refaz cada partida com `Engine.replay`, pega o tempo do servidor (`finishedAt − startAt`) e calcula a nota. Professor e alunos chegam ao mesmo ranking.
- **Segurança:** as regras (`database.rules.json`) só deixam o professor mudar o estado da sala e cada aluno escrever na própria pasta, e só aceitam logs de letras `k`, `m` e `s`. Veja [SEGURANCA.md](SEGURANCA.md).
- Os apelidos são escritos com `textContent` ou `Util.escape`, então ninguém injeta HTML pelo nome.

---

## 6. Onde mexer para mudar...

| Quero... | Mexa em... |
|---|---|
| Os pontos e o tempo mínimo por jogada | `Garimpo.RULES` em `js/config.js` |
| As regras do jogo (o que é acerto, erro, troca) | `Engine.apply` em `js/engine.js` |
| A dificuldade do robô | `LEVELS` em `js/robot.js` |
| As cores e fontes | variáveis no topo de `css/style.css` e `PALETTE` em `js/gems.js` |
| Os textos do tutorial | `SLIDES` em `js/tutorial.js` |
| O desenho das gemas (ex.: sapos) | `gemSVG()` e `ROCK` em `js/gems.js` |
| As regras de estrelas | `starsFor()` em `js/game.js` |
| As regras de segurança do banco | `database.rules.json` |
| A quantidade de gemas | botões `data-n` no `index.html` |

---

## 7. A pontuação

**Pontos das jogadas** (todos os modos), com os valores em `Garimpo.RULES` (`js/config.js`):
- Acerto: +10, mais +5 por acerto seguido (até +30 extras).
- Levar a menor para a vitrine: +50 (ou +70 se ela já estava no lugar).
- Erro: −10 pontos e a sequência cai pela metade.

**Nota final no Desafio e na sala** (`Engine.rate()` em `js/engine.js`):

```
nota final = pontos das jogadas × 60 ÷ segundos jogados      (pontos por minuto)
```

- Não há tempo de referência nem robô na conta: quanto mais rápido e mais certeiro, maior a nota.
- Depois de um erro no Desafio os botões travam por 1,5 s (`ERROR_LOCK_MS`). O erro custa tempo, e isso impede que chutar rápido compense.
- O tempo nunca conta menos que 0,9 s por jogada (`MIN_ACTION_MS`), o que limita o ganho de quem joga com script.
- Na sala o ranking soma as notas das rodadas. Quem ainda está jogando aparece com uma estimativa, que se acerta ao terminar.
- No Treino não há relógio, então a nota é só a soma dos pontos das jogadas.
- A corrida contra o robô só decide "venceu o robô" e as estrelas, e não entra na nota.
