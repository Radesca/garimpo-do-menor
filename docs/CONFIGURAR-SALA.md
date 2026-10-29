# Como configurar a Sala (Firebase)

Leva uns 5 a 10 minutos e é grátis (plano Spark). Você só faz isso uma vez.

## 1. Criar o projeto
1. Abra https://console.firebase.google.com e entre com sua conta Google. O Firebase exige a verificação em duas etapas ativada na conta.
2. Clique em **Criar um projeto**, dê um nome (ex.: `meu-garimpo`) e continue.
3. Pode **desativar o Google Analytics e o Gemini** e clicar em Criar projeto.

## 2. Criar o banco de dados em tempo real
1. No menu da esquerda: **Criação** (*Build*) → **Realtime Database** → **Criar banco de dados**.
2. Escolha o local (qualquer um serve).
3. Escolha **Iniciar no modo bloqueado** e clique em Ativar.

## 3. Ativar o login anônimo
1. No menu da esquerda: **Criação** → **Authentication** → **Vamos começar**.
2. Em **Método de login**, escolha **Anônimo**, ative e salve.

Cada navegador entra sozinho, sem cadastro, e ganha um identificador. É ele que as regras do banco usam para saber quem é o professor e de quem é cada jogada.

## 3b. Colar as regras
1. No Realtime Database, abra a aba **Regras**.
2. Apague tudo e cole o conteúdo do arquivo `database.rules.json` deste projeto.
3. Clique em **Publicar**.

Essas regras só deixam o professor (quem criou a sala) mudar o estado dela, cada aluno escrever só na própria pasta, e só aceitam jogadas, nunca notas. Veja [SEGURANCA.md](SEGURANCA.md) para os detalhes e os limites.

## 4. Registrar o app web e copiar a configuração
1. Engrenagem (⚙) → **Configurações do projeto**.
2. Em **Seus apps**, clique no ícone web `</>`.
3. Dê um apelido (ex.: `garimpo`), **não** marque o Firebase Hosting e clique em Registrar app.
4. Copie os valores do bloco `firebaseConfig`.

## 5. Colar no projeto
Copie `firebase-config.example.js` para `firebase-config.js` e preencha:

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://SEU-PROJETO-default-rtdb.firebaseio.com",
  projectId: "...",
  appId: "..."
};
window.ADMIN_PIN = "escolha-um-pin";
```

Se o bloco do Firebase não trouxer o `databaseURL`, ele aparece no topo da aba **Dados** do Realtime Database.

**Importante:** o `firebase-config.js` está no `.gitignore`. Não o envie para o GitHub.

## 6. Publicar
Veja a seção "Publicar na Vercel" do [README](../README.md).

## 7. Usar na aula
1. No jogo, clique em **Jogar em sala**, abra **Sou o professor**, digite o PIN e clique em **Criar sala**.
2. Projete a tela. Ela mostra o **código** e o **QR code** da sala.
3. Os alunos escaneiam o QR (ou digitam o código), escolhem um apelido e esperam no lobby.
4. Escolha a quantidade de gemas e clique em **Iniciar rodada**. Todos recebem uma contagem de 5 segundos e jogam a mesma sequência.
5. O ranking sobe ao vivo no telão. Quando todos terminarem, clique em **Próxima rodada** (os pontos acumulam).
6. Para acabar, clique em **Encerrar e ver pódio**.

Se a tela do professor fechar sem querer, volte em **Jogar em sala → Sou o professor → Reabrir minha sala** (no mesmo navegador).

## Limitações
- Os pontos são calculados no celular de cada aluno. Quem souber mexer no código do navegador poderia trapacear.
- O PIN do professor fica visível no código da página. Ele só evita que alunos criem salas sem querer.
- Quem entra mais de 15 segundos depois da largada espera a próxima rodada.
- Se o Wi-Fi do local for fraco, o ranking pode atrasar.
