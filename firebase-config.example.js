/*
  Modelo da configuração da sala (multijogador).

  1. Copie este arquivo para "firebase-config.js" (na mesma pasta).
  2. Troque os valores abaixo pelos do seu projeto Firebase (passo a passo em docs/CONFIGURAR-SALA.md).
  3. NÃO envie o firebase-config.js para o GitHub: ele está no .gitignore.

  Sem esse arquivo o jogo funciona normalmente, só o botão "Jogar em sala" avisa que falta configurar.
*/
window.FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  databaseURL: "COLE_AQUI",
  projectId: "COLE_AQUI",
  appId: "COLE_AQUI"
};

// PIN do professor para criar salas. Escolha o seu.
// Ele fica visível no código da página, então só impede que alunos criem salas sem querer.
window.ADMIN_PIN = "COLE_AQUI";
