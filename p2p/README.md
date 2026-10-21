# Highlords RPG — Frontend P2P

Aplicação publicada: `p2p/index.html` · https://highlords-rpg.vercel.app

## Recursos

Salas por convite, mapas, múltiplas cenas, tokens transferíveis e removíveis, ferramentas de navegação/desenho/revelação, Fog of War visual, chat, dados e fichas básicas. Campanhas podem ser nomeadas, recuperadas por autosave IndexedDB e exportadas como arquivo `.highlords` (JSON nesta Alpha).

## Desenvolvimento

A Vercel publica a pasta `p2p/` segundo `vercel.json`. Os smoke tests estão em `browser-tests/` e no workflow `p2p-browser.yml`.

## Identidade dos jogadores

A Alpha utiliza pares de chaves **ECDSA P-256** locais: a chave privada não exportável fica no IndexedDB do navegador (schema v3). Ao entrar, o convidado assina um desafio do mestre. O arquivo de campanha guarda somente as chaves públicas associadas às identidades, preservando a possibilidade de reconhecer um jogador ao reconectar pelo mesmo navegador.

**Atenção à migração:** vínculos antigos que não tinham chave pública não são considerados autenticados; o mestre deve reatribuir as fichas quando esses jogadores voltarem. Apagar os dados do navegador elimina a chave privada e exige reatribuição. Não há recuperação de chaves em outro navegador.

A associação inicial da chave é baseada em confiança no primeiro uso (TOFU). Isso impede a simples falsificação posterior de um UUID já associado, mas **não equivale a uma auditoria criptográfica de toda a sessão nem elimina riscos de sequestro no primeiro vínculo**.

## Limites conhecidos

PeerJS Cloud para signaling, sem TURN dedicado; conexão entre redes depende do NAT/firewall. A sessão termina quando o navegador do mestre é encerrado. A identidade local usa assinatura criptográfica, mas a primeira vinculação exige confiança e ainda falta recuperação segura. A imagem original do mapa é transmitida aos jogadores, mesmo com névoa ativa: **não use para ocultar conteúdo confidencial**. O autosave é local e não substitui exportações regulares.

A versão Node.js em `server.js` é legada e separada da aplicação publicada.
