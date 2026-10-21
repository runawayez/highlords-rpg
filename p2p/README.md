# Highlords RPG — Frontend P2P

Aplicação publicada: `p2p/index.html` · https://highlords-rpg.vercel.app

## Recursos

Salas por convite, mapas, múltiplas cenas, tokens transferíveis e removíveis, ferramentas de navegação/desenho/revelação, Fog of War com rasterização de áreas reveladas, chat, dados e fichas básicas. Campanhas podem ser nomeadas, recuperadas por autosave IndexedDB e exportadas como arquivo `.highlords` (JSON nesta Alpha).

## Desenvolvimento

A Vercel publica a pasta `p2p/` segundo `vercel.json`. Os smoke tests estão em `browser-tests/` e no workflow `p2p-browser.yml`.

## Identidade dos jogadores

A Alpha utiliza pares de chaves **ECDSA P-256** locais: a chave privada não exportável fica no IndexedDB do navegador (schema v3). Ao entrar, o convidado assina um desafio do mestre. O arquivo de campanha guarda somente as chaves públicas associadas às identidades, preservando a possibilidade de reconhecer um jogador ao reconectar pelo mesmo navegador.

**Atenção à migração:** vínculos antigos que não tinham chave pública não são considerados autenticados; o mestre deve reatribuir as fichas quando esses jogadores voltarem. Apagar os dados do navegador elimina a chave privada e exige reatribuição. Não há recuperação de chaves em outro navegador.

A associação inicial da chave é baseada em confiança no primeiro uso (TOFU). Isso impede a simples falsificação posterior de um UUID já associado, mas **não equivale a uma auditoria criptográfica de toda a sessão nem elimina riscos de sequestro no primeiro vínculo**.

## Limites conhecidos

PeerJS Cloud para signaling; TURN deliberadamente desativado no cliente e no endpoint; apenas STUN público está ativo. Sem TURN ativo, conexão entre redes depende do NAT/firewall. A sessão termina quando o navegador do mestre é encerrado. A identidade local usa assinatura criptográfica, mas a primeira vinculação exige confiança e ainda falta recuperação segura. Com a névoa ativa, o host envia somente uma versão rasterizada das áreas reveladas; o mapa original não entra nas novas projeções. **Ative a névoa antes de conectar jogadores ou mostrar a cena:** mapas já transmitidos anteriormente não podem ser apagados do navegador do participante. Não há auditoria completa desse isolamento em redes reais, portanto continue evitando segredos críticos. O autosave é local e não substitui exportações regulares.

A versão Node.js em `server.js` é legada e separada da aplicação publicada.

## Decisão atual: somente WebRTC P2P + STUN público

TURN está **100% desativado** nesta versão, por decisão explícita do projeto. O navegador não consulta `/api/turn` nem inclui servidores TURN no ICE; somente STUN público é usado. O endpoint `/api/turn` responde sempre `503 turn_disabled`, **inclusive se houver credenciais de um provedor configuradas por engano**.

O código histórico de integração TURN permanece apenas como referência, inacessível durante as partidas. Não habilitar TURN, contratar serviços ou configurar credenciais sem uma nova decisão explícita do responsável pelo projeto.

Limitação aceita: em redes restritivas em que a conexão P2P direta não for viável, o jogador pode não conseguir entrar. Testes positivos em navegadores e redes conhecidas não eliminam essa restrição.
