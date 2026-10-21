# Highlords RPG — Frontend P2P

Aplicação publicada: `p2p/index.html` · https://highlords-rpg.vercel.app

## Recursos

Salas por convite, mapas, múltiplas cenas, tokens transferíveis e removíveis, ferramentas de navegação/desenho/revelação, Fog of War visual, chat, dados e fichas básicas. Campanhas podem ser nomeadas, recuperadas por autosave IndexedDB e exportadas como arquivo `.highlords` (JSON nesta Alpha).

## Desenvolvimento

A Vercel publica a pasta `p2p/` segundo `vercel.json`. Os smoke tests estão em `browser-tests/` e no workflow `p2p-browser.yml`.

## Limites conhecidos

PeerJS Cloud para signaling, sem TURN dedicado; conexão entre redes depende do NAT/firewall. A sessão termina quando o navegador do mestre é encerrado. A identidade local ainda não é criptograficamente autenticada. A imagem original do mapa é transmitida aos jogadores, mesmo com névoa ativa: **não use para ocultar conteúdo confidencial**. O autosave é local e não substitui exportações regulares.

A versão Node.js em `server.js` é legada e separada da aplicação publicada.
