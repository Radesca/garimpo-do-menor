# Garimpo do Menor

Jogo para aprender **selection sort** (ordenação por seleção). Você é o algoritmo: em cada rodada, procura a menor gema entre as que ainda não estão ordenadas e a leva para a primeira vaga livre da vitrine. Feito para apresentar em seminário, com uma versão em sala para a turma competir.

Sem dependências, sem build: HTML, CSS e JavaScript puros.

## O que tem

- **Treino:** gemas à vista, o pseudocódigo é destacado a cada passo e os valores de `i`, `j` e `menor` aparecem ao vivo.
- **Desafio:** gemas escondidas em pedras e uma corrida contra o Robô (níveis Calmo, Normal e Turbo).
- **Pegadinha:** duas gemas com o mesmo número, para mostrar que o selection sort **não é estável**.
- **Sala da turma:** o professor cria uma sala com código e QR, todos jogam a mesma sequência ao mesmo tempo e o ranking sobe ao vivo.
- Pontos, sequência de acertos, estrelas, recorde salvo no navegador, sons e animações. No Desafio e na sala a nota é em **pontos por minuto**: pontos das jogadas ÷ tempo, então rapidez e acerto contam juntos.

## Como rodar

Abra o `index.html` no navegador (duplo clique). Para servir por HTTP:

```bash
npx serve .
```

O modo solo funciona sem nenhuma configuração.

## Sala da turma (multijogador)

Precisa de um banco **Firebase Realtime Database** (grátis). O passo a passo está em [docs/CONFIGURAR-SALA.md](docs/CONFIGURAR-SALA.md). Resumo:

1. Copie `firebase-config.example.js` para `firebase-config.js` e preencha com os dados do seu projeto e um PIN do professor.
2. O `firebase-config.js` está no `.gitignore` e **não deve ser enviado ao GitHub**.

## Estrutura

```
index.html                  as telas do jogo
css/style.css               aparência e animações
js/
  config.js                 escolhas do jogador e pontuação (mexa aqui para ajustar)
  util.js                   atalhos, armazenamento, sorteio com semente
  sound.js                  sons (Web Audio)
  gems.js                   desenho das gemas e pedras
  effects.js                faíscas, pontos subindo e confete
  robot.js                  o Robô e os níveis de dificuldade
  screens.js                troca de tela
  game.js                   regras do jogo e desenho da partida
  tutorial.js               "Como jogar"
  menu.js                   tela inicial
  rooms.js                  sala da turma (Firebase)
firebase-config.example.js  modelo da configuração da sala
docs/                       explicação do código e guia do Firebase
```

A explicação detalhada de cada arquivo está em [docs/EXPLICACAO.md](docs/EXPLICACAO.md).

## Publicar na Vercel

O projeto é estático, então basta publicar a pasta. Como o `firebase-config.js` não vai para o Git, publique pelo CLI a partir da pasta onde ele existe (o `.vercelignore` garante que ele seja enviado):

```bash
npx vercel --prod
```

Lembre que, em qualquer site publicado, a configuração do Firebase e o PIN ficam visíveis para quem abrir o código da página. A chave web do Firebase não é um segredo, e a proteção real vem das regras do banco (veja o guia).

## Licença

Ainda não definida. Se quiser que outras pessoas possam reutilizar o código, adicione um arquivo `LICENSE` (por exemplo, MIT).
