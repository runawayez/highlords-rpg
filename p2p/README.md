# Highlords RPG — Experimento P2P (Vercel)

A versão em `p2p/index.html` é um **protótipo independente** do servidor legado Node.js. O arquivo `vercel.json` configura a Vercel para publicar a pasta `p2p/`.

## Implantação
No painel Vercel, importe `runawayez/highlords-rpg`, escolha Framework **Other** e deixe as configurações do `vercel.json` prevalecerem (Output Directory: `p2p`). Nenhuma variável de ambiente nem banco são necessários nesta prova de conceito. O GitHub conectado não significa que o projeto já foi implantado.

## Teste entre amigos
1. Abra o endereço publicado por HTTPS em dois navegadores/computadores.
2. No navegador do mestre, clique **Criar** e aguarde «Mesa pronta».
3. Clique **Copiar convite** e compartilhe com um amigo.
4. O amigo informa um apelido e clica **Entrar**.
5. Teste chat, tokens, dados, fichas e sincronização.
6. O mestre pode importar um arquivo `.highlords` (nesta versão: JSON simples) antes de criar a sala, exportar durante a sessão e recuperar autosaves do IndexedDB no mesmo navegador.

## Limites e riscos (importante)
- Usa **PeerJS Cloud público** para signaling, e STUN como padrão. **Não há TURN configurado**; participantes atrás de alguns NATs ou firewalls podem não conseguir se conectar. Para produção é necessário signaling e TURN confiáveis, com teste entre redes.
- Os testes realizados até agora só verificaram a sintaxe JavaScript; **não há evidência de teste ponta a ponta em navegadores reais ou deployment confirmado**.
- O mestre precisa manter a aba e o computador conectados. Jogadores agora tentam se reconectar automaticamente à **mesma** sala P2P com backoff. Se o navegador do mestre fechar ou a sala expirar no signaling, será necessário criar uma nova sala e compartilhar outro convite; não há restauração automática de ID após o encerramento do host.
- O autosave local é uma redução de risco, não garantia contra exclusão de dados do navegador, corrupção ou armazenamento cheio. Faça exportações frequentes.
- O formato `.highlords` desta PoC é **JSON**, sem compactação ZIP, versionamento avançado ou empacotamento de assets externos. As imagens de mapas atuais são incluídas como data URL, aumentando tamanho de arquivo e transmissão.
- **Identidade local não é autenticação forte.** As fichas e permissões são adequadas só para grupos de confiança; um participante tecnicamente malicioso pode imitar um vínculo. Ainda faltam credenciais criptográficas por jogador, autenticação da sessão P2P, limites de mensagens, recuperação completa do host e protocolos antiabuso.
- Dados e mapas são encaminhados aos pares conectados. Não use para campanhas com informações privadas.
- Este módulo está **separado** da versão Node existente, portanto ainda não migra automaticamente campanhas antigas.
- A dependência PeerJS é carregada via CDN; caso indisponível, a aplicação não conecta.

## Critério para evoluir
Antes de chamar de Beta: testes E2E em duas redes, TURN fallback, reconexão, autenticação de vínculo por chave pública, exportação .highlords ZIP e limpeza de mensagens/assets.

## Iteração de confiabilidade
- Reconexão com tentativas progressivas para visitantes quando a conexão P2P cai e reconexão com signaling quando disponível.
- Conexões antigas do mesmo navegador são encerradas pelo mestre quando uma nova sessão entra.
- Autosave periódico não regrava o mesmo estado sem alterações; alerta de saída condicionado a alterações ainda não salvas.
- **Não validado** em navegadores diferentes ou NATs restritivos. TURN e autenticação criptográfica ainda pendentes.

## Ferramentas visuais P2P (Alpha)
- O mestre pode adicionar cenas e alterná-las pelo seletor; cada cena armazena mapa, tokens, desenhos e névoa. Saves antigos sem `scenes` são convertidos em memória na abertura.
- Ferramenta **Desenhar**: mantenha pressionado e arraste sobre a mesa para criar traços; **Limpar desenhos** remove os traços da cena ativa.
- **Névoa de guerra**: marque a opção e selecione **Revelar névoa**; arraste um retângulo sobre a região a revelar.
- **Aviso de privacidade:** fog é apenas visual nesta Alpha. O estado completo e a imagem original são enviados a todos os participantes; não use a névoa para informações secretas. A separação de estado do mestre será necessária antes da Beta.
- Não foi executado teste real de navegadores multiusuário nesta rodada; o JavaScript foi validado quanto à sintaxe.

## Sincronização com visibilidade por jogador
- O mestre continua mantendo o estado completo. Na transmissão para cada participante, apenas a cena ativa é enviada; futuras cenas não são incluídas.
- Fichas de terceiros chegam sem o conteúdo de suas anotações. O próprio jogador recebe o texto da ficha atribuída a sua identidade local.
- Tokens cobertos pela névoa são removidos do estado transmitido para os jogadores. O mestre também rejeita movimentações remotas de tokens que não estejam revelados.
- **Limite de segurança importante:** a imagem original do mapa e as áreas reveladas continuam sendo enviadas ao navegador. **O Fog of War não é uma barreira criptográfica e não esconde segredos impressos no mapa**. Para isso, precisamos fornecer mapas já expurgados/segmentados ou um serviço de entrega por regiões. A identidade local também ainda não é autenticação forte.
- Verificação desta rodada: sintaxe do JS, sem testes multi-navegador realizados. Não considerar prontidão de produção.

## Checkpoints locais (IndexedDB v2)
- Cada autosave grava o estado atualizado e mantém até cinco checkpoints recentes no navegador do mestre.
- Na abertura do site, a recuperação verifica a cópia mais recente e os checkpoints, ignorando versões que não atendam à validação básica.
- A exportação atualiza a cena ativa antes de gerar o arquivo JSON `.highlords`.
- Não há criptografia dos backups locais nem proteção contra exclusão da base IndexedDB. O mestre deve baixar arquivos `.highlords` regularmente.
- Ainda faltam ZIP portátil definitivo, migração avançada de versões, teste de queda abrupta de energia e teste E2E.

## Estabilização Alpha — 20/10/2026
- Reentrada do convidado agora aceita o primeiro snapshot da nova conexão mesmo quando a revisão é inferior à revisão da conexão anterior; snapshots posteriores continuam ordenados.
- O mestre restringe ações recebidas a até 15 por segundo e payloads de até 10.000 caracteres, e rejeita identidade igual à do mestre.
- Falhas ao enviar estado ao convidado são sinalizadas em vez de encerrar silenciosamente o fluxo.
- **Validação executada:** parse do JavaScript. **Ainda pendente:** E2E real, TURN, identidade criptográfica, proteção segura de mapas e teste de rede adversa.

## Handshake da Alpha — Outubro/2026
- Convidados só entram na interface da mesa após receber o primeiro snapshot válido do mestre; antes disso aparece status de sincronização.
- Tentativas de conexão que não recebem snapshot em 12 segundos são fechadas e reiniciadas usando backoff.
- Erros de serialização do payload não devem interromper o processamento das próximas mensagens.
- Testes realizados: verificação estática dos marcadores de fluxo e parse do JavaScript. Testes E2E reais entre redes distintas e TURN continuam pendentes.
