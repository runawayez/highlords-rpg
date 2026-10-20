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
- O mestre precisa manter a aba e o computador conectados. Se ele cair, a conexão dos outros cai; é necessário criar nova sala.
- O autosave local é uma redução de risco, não garantia contra exclusão de dados do navegador, corrupção ou armazenamento cheio. Faça exportações frequentes.
- O formato `.highlords` desta PoC é **JSON**, sem compactação ZIP, versionamento avançado ou empacotamento de assets externos. As imagens de mapas atuais são incluídas como data URL, aumentando tamanho de arquivo e transmissão.
- **Identidade local não é autenticação forte.** As fichas e permissões são adequadas só para grupos de confiança; um participante tecnicamente malicioso pode imitar um vínculo. Ainda faltam credenciais criptográficas por jogador, autenticação da sessão P2P, limites de mensagens, tratamento de reconexão e protocolos antiabuso.
- Dados e mapas são encaminhados aos pares conectados. Não use para campanhas com informações privadas.
- Este módulo está **separado** da versão Node existente, portanto ainda não migra automaticamente campanhas antigas.
- A dependência PeerJS é carregada via CDN; caso indisponível, a aplicação não conecta.

## Critério para evoluir
Antes de chamar de Beta: testes E2E em duas redes, TURN fallback, reconexão, autenticação de vínculo por chave pública, exportação .highlords ZIP e limpeza de mensagens/assets.
