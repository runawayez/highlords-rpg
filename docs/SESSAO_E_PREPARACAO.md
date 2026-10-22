# Preparação e condução de sessão — Highlords VTT 1.1

Esta atualização mantém a identidade de terminal preto/vermelho e a arquitetura gratuita, sem contas e com autoridade no navegador do mestre. Os fluxos foram inspirados na organização de ferramentas do [Atlas VTT](https://github.com/atlas-vtt/atlas-vtt); a implementação é própria, sem incorporar código, imagens ou dependências do Atlas/Obsidian.

## Preparar e jogar

Na barra inferior do mapa, **Preparar** abre uma biblioteca visual. Fechar a biblioteca devolve o foco à sessão. A aba **Mestre** conserva os controles detalhados da cena e também oferece acesso à biblioteca; deixa de ser chamada Biblioteca para evitar duas áreas com o mesmo nome e propósitos diferentes.

A biblioteca tem filtros Mapas, Tokens, Encontros, Personagens e Cenas, miniaturas e busca por nome/tag. Mapas podem ser importados sem substituir imediatamente a cena ativa. **Usar mapa** aplica o item. Também é possível guardar o mapa atual. Itens salvos permitem editar nome e tags ou remover somente o modelo; objetos já colocados na cena permanecem.

Modelos de token conservam nome, tamanho e referências à ficha/recurso da mesma campanha. Ao inserir um modelo são criados novos IDs e o controlador começa como Somente mestre. O modelo não duplica a ficha: múltiplos tokens vinculados à mesma ficha continuam usando seus mesmos campos. Se a ficha original não existir, a inserção não recupera seus dados.

**Salvar encontro selecionado** registra até 25 tokens e seus deslocamentos relativos. Ao colocar o encontro, a formação acompanha o tamanho atual da grade e é limitada às bordas do mapa. Tokens nas bordas podem se sobrepor; não há solver de colisão nem movimentação automática de personagens de outras cenas. O limite da cena permanece 150 tokens. A biblioteca aceita até 20 mapas, 60 modelos de token e 30 encontros; as restrições existentes de imagem e backup total de 15 MB continuam em vigor.

## Selecionar um token

A seleção abre propriedades rápidas junto ao mapa: nome, tamanho, controlador, recurso vinculado, acesso à ficha, vínculo detalhado, criação de modelo e inclusão no combate. Em celular, as propriedades aparecem em painel inferior com rolagem. A ficha completa continua no painel lateral. O recurso usa os mesmos rascunhos, versões e resolução de conflitos do editor de ficha; não escreve diretamente nos campos.

## Notas e marcadores

**Notas** abre anotações privadas da cena, até 20 mil caracteres, com salvamento explícito. **Marcador** permite clicar no mapa e registrar título e texto. Marcadores são privados por padrão; o mestre pode compartilhá-los e posteriormente revogar o compartilhamento. Cada cena aceita até 80 marcadores, com até 10 mil caracteres de nota.

Um marcador compartilhado fica visível independentemente da área revelada do mapa. A interface deixa isso explícito antes de salvar. Não compartilhe antecipadamente localizações desconhecidas. Jogadores recebem e leem apenas os marcadores compartilhados; não podem editar ou excluir. Texto é apresentado como texto simples, sem execução de HTML/Markdown.

## Combate independente de sistema

**Combate** abre/recolhe o rastreador sobre o mapa. O mestre inclui os tokens desejados, pode rolar uma expressão configurável (padrão 1d20), editar números, reordenar pelos botões e iniciar/encerrar o combate. Avançar e voltar controla turno e rodada. Remover o token da cena também remove sua participação; desfazer restaura o estado do editor, inclusive combate e marcadores.

Ordem, rodada e destaque de turno são projetados para os jogadores usando somente tokens que eles já podem receber. Fichas e recursos privados não são adicionados ao rastreador. Quando o turno pertence a um token oculto, a projeção não identifica outro token como atual. O sistema não impõe ações, regras de dano ou atributos de um RPG específico.

## Grade e visão do jogador

**Grade** inicia o alinhamento guiado: informe a distância em células e marque dois pontos da mesma linha/coluna (interseções para grade quadrada, centros para hexagonal). A prévia é local e cancelável. **Aplicar grade** confirma tamanho e origem de uma vez. Configurações passam a ser conservadas por cena; cenas legadas sem esses campos usam os padrões. A ferramenta não detecta automaticamente linhas da imagem nem corrige mapas inclinados ou com perspectiva.

**Visão** gera uma prévia local para um participante escolhido, inclusive um visitante sem ficha. Ela utiliza a mesma projeção e a mesma rasterização de névoa enviadas pela rede, sem trocar o mestre para o papel do jogador nem alterar a campanha. A consulta é um retrato do momento; **Atualizar prévia** refaz a consulta. Somente dados autorizados aparecem. A prévia não constitui teste de conectividade entre redes.

**Comandos** ou Ctrl+K/⌘K oferece busca de ferramentas e ações, com setas, Enter e Esc. Comandos do mestre ficam indisponíveis ao jogador. A busca não substitui os botões de uso frequente.

## Persistência e sincronização

O campo opcional `tabletop` reúne biblioteca e dados por cena. Importações antigas recebem valores vazios. Autosave, checkpoints e ZIP v3 conservam as extensões. Mapas da biblioteca são separados em assets no ZIP, com deduplicação com os mapas das cenas; não dependem de URLs externas. Para preservar esses novos dados, use uma versão atual do Highlords ao reexportar a campanha.

O cliente negocia suporte a deltas. O mestre primeiro calcula a projeção autorizada do destinatário e depois compara com a última projeção enviada àquela conexão. Movimento envia apenas tokens alterados; mudanças de campo enviam patches dos campos, evitando reenviar um retrato inalterado. Imagens de mapa inalteradas não entram no delta. Uma alteração de névoa pode exigir uma nova imagem rasterizada; esse envio continua necessário.

Cada conexão mantém uma sequência independente, além da revisão de campanha. Uma lacuna ou mensagem inválida provoca solicitação limitada de estado completo. Entrada, troca de cena, reconexão, incompatibilidade e casos em que o delta seria maior usam snapshot completo. Clientes sem a capacidade negociada continuam recebendo snapshots. A proteção não depende de esconder controles: ações persistentes destas ferramentas são aceitas somente do mestre autenticado.

## Arquivos

- `assets/session-model.js`: limites, validação, projeção e geometria.
- `assets/session-actions.js`: ações autorizadas e alterações atômicas.
- `assets/session.js` / `assets/session.css`: ferramentas e apresentação responsiva.
- `assets/sync.js`: diferenças por destinatário e reconstrução validada.
- `tests/session-model.test.js`: regressões de dados, geometria, privacidade e protocolo.
- Suíte Chromium: fluxos reais da aplicação, dois contextos isolados, perda simulada de delta, fallback e revogação de acesso.

Nenhuma mudança habilita TURN, exige instalação, cria contas ou armazena campanhas em um servidor. O teste com transporte de integração e a suíte WebRTC do CI não substituem homologação entre operadoras físicas independentes.

Validação local desta revisão: 63 casos de navegador aprovados (incluindo o fluxo entre dois contextos e recuperação de delta) e 17 testes Node aprovados. O teste WebRTC DataChannel real continua habilitado no CI; não é executável neste ambiente local por limitação de coleta ICE. Capturas de desktop, retrato, paisagem e biblioteca em 320 px foram revisadas.
