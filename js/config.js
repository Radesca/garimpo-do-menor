/*
  Ponto de partida de todos os scripts: cria o objeto global `Garimpo`,
  onde cada arquivo de js/ pendura o seu módulo, e guarda as escolhas e regras do jogo.
*/
window.Garimpo = window.Garimpo || {};

// Escolhas feitas na tela inicial.
Garimpo.cfg = {
  mode: 'treino',   // 'treino' (gemas à vista) ou 'desafio' (gemas escondidas e corrida contra o robô)
  n: 7,             // quantidade de gemas: 5, 7 ou 9
  bot: 'normal',    // velocidade do robô: 'calmo', 'normal' ou 'turbo' (veja js/robot.js)
  twins: false      // pegadinha: duas gemas com o mesmo número
};

/*
  Pontuação. Para deixar o jogo mais fácil ou mais difícil, mexa aqui.

  Durante a partida você soma "pontos das jogadas". No Desafio (e na sala) a nota final é a
  velocidade com que você pontuou, sem tempo de referência:

      nota final = pontos das jogadas × 60 ÷ segundos jogados      (pontos por minuto)

  Errar custa pontos e uma pausa curta (que também gasta tempo), então chutar rápido não compensa.
*/
Garimpo.RULES = {
  CORRECT: 10,         // pontos por decisão certa
  STREAK_STEP: 5,      // pontos extras por cada acerto seguido
  STREAK_CAP: 6,       // a sequência para de valer mais depois de tantos acertos
  PENALTY: 10,         // pontos perdidos por erro
  STREAK_KEEP: 0.5,    // quanto da sequência sobra depois de um erro (0 = zera, 0.5 = metade)
  ERROR_LOCK_MS: 1500, // pausa dos botões depois de um erro no Desafio, em milissegundos
  SWAP: 50,            // pontos por levar a menor para a vitrine
  SKIP: 70,            // pontos quando a menor já estava no lugar (nenhuma troca)
  MIN_TIME_MS: 5000    // tempo mínimo usado na divisão, para a nota não disparar no começo
};
