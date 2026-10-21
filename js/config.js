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

// Pontuação. Para deixar o jogo mais fácil ou mais difícil, mexa aqui.
Garimpo.RULES = {
  CORRECT: 10,         // pontos por decisão certa
  STREAK_STEP: 5,      // pontos extras por cada acerto seguido
  STREAK_CAP: 6,       // a sequência para de valer mais depois de tantos acertos
  PENALTY: 15,         // pontos perdidos por erro
  SWAP: 50,            // pontos por levar a menor para a vitrine
  SKIP: 70,            // pontos quando a menor já estava no lugar (nenhuma troca)
  TIME_BONUS_DIV: 100  // bônus de tempo = (tempo do robô − seu tempo) em ms ÷ este número
};
