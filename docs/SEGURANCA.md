# Segurança e trapaças

O jogo roda no navegador de cada pessoa, e tudo que roda no navegador pode ser mexido por quem sabe abrir o console. Por isso as regras ficam separadas em duas camadas: o que o servidor (Firebase) impede e o que só dá para dificultar.

## O que está protegido (modo sala)

| Tentativa | Como fica protegido |
|---|---|
| Editar a própria nota ou a de outra pessoa | Ninguém grava nota. O aluno grava só as jogadas (o "log"), e todos os celulares recalculam a nota a partir delas (`js/engine.js` e `js/ranking.js`). |
| Declarar um tempo menor que o real | O tempo vem do relógio do servidor (`finishedAt` só aceita a hora do servidor) e a rodada só aceita jogadas depois da largada. |
| Refazer a jogada depois de terminar | Depois do `finishedAt` ninguém consegue mudar nem apagar o próprio log, o horário ou a rodada (testado: o banco recusa). |
| Mudar a rodada, a semente ou o estado da sala | Só o professor (quem criou a sala) escreve nessas partes. Cada aluno escreve só na própria pasta. |
| Apagar ou editar o jogador de outra pessoa | As regras do banco só deixam cada pessoa escrever em `players/<seu uid>`. |
| Entrar como outra pessoa | Cada navegador entra com login anônimo e ganha um uid. Ninguém escreve no uid dos outros. |
| Escrever lixo no banco | As regras validam o formato: o log só aceita as letras k, m e s, o apelido tem no máximo 14 letras, e a sala só aceita 5, 7 ou 9 gemas. |
| Usar o PIN visível no código para virar professor | O PIN só abre a tela. Quem manda de verdade é o uid de quem criou a sala. |
| Ver os números das gemas escondidas pelo inspetor | O número só entra na página quando a gema abre (`js/gems.js` e `js/game.js`). |
| Mudar os pontos pelo console (`Garimpo.RULES`) | Os valores são congelados, e o ranking é recalculado de qualquer jeito a partir do log. |

## O que ainda dá para fazer (e o limite do que se evita)

- **Um script que joga sozinho.** Quem sabe programar pode ler as gemas abertas e clicar nos botões sozinho. Nada no navegador impede isso. Para que não valha a pena, o tempo conta no mínimo 0,9 s por jogada (`MIN_ACTION_MS` em `js/config.js`), então o script rende no máximo o que um jogador muito rápido e sem erros renderia.
- **Calcular a sequência antes.** A semente da rodada está no banco, e o sorteio é público. Dá para descobrir as gemas durante a contagem de 5 s. Isso ajuda quem joga manualmente, mas o piso de tempo por jogada limita o ganho.
- **O PIN do professor** aparece no código da página. Qualquer pessoa pode criar uma sala própria (só não consegue mexer nas dos outros).
- **Quem tem o código da sala consegue ver** o ranking e as jogadas dos colegas. Os códigos têm 4 letras, e não dá para listar as salas.

Para impedir tudo isso de verdade seria preciso um servidor que valide cada jogada (por exemplo, Cloud Functions, que exige o plano pago do Firebase). Para uma aula entre colegas, as proteções acima cobrem as trapaças fáceis.

## Modo solo

No Treino e no Desafio solo a nota e o recorde ficam só no navegador da pessoa (`localStorage`). Dá para editá-los, mas só enganam a própria pessoa.

## Como as regras do banco foram escritas

As regras estão em `database.rules.json`. Para ver o que cada linha faz, leia a seção "A Sala da turma" do [guia do código](EXPLICACAO.md). Para publicá-las, veja [CONFIGURAR-SALA.md](CONFIGURAR-SALA.md).
