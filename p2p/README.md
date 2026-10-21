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

PeerJS Cloud para signaling; broker TURN opcional implementado, mas desligado até cadastrar provedor e regras de limitação de tráfego. Sem TURN ativo, conexão entre redes depende do NAT/firewall. A sessão termina quando o navegador do mestre é encerrado. A identidade local usa assinatura criptográfica, mas a primeira vinculação exige confiança e ainda falta recuperação segura. Com a névoa ativa, o host envia somente uma versão rasterizada das áreas reveladas; o mapa original não entra nas novas projeções. **Ative a névoa antes de conectar jogadores ou mostrar a cena:** mapas já transmitidos anteriormente não podem ser apagados do navegador do participante. Não há auditoria completa desse isolamento em redes reais, portanto continue evitando segredos críticos. O autosave é local e não substitui exportações regulares.

A versão Node.js em `server.js` é legada e separada da aplicação publicada.

## TURN opcional — implantação

O frontend tenta obter configuração ICE temporária em `GET /api/turn`; se estiver indisponível, utiliza STUN público e mantém o P2P sem retransmissão. Uma função serverless no diretório raiz `api/turn.js` pode gerar credenciais de **Cloudflare Realtime TURN** com TTL de 1 hora, sem disponibilizar a chave permanente ao navegador.

**Desligado por padrão:** não há credenciais TURN cadastradas no projeto até que o operador autorize o custo. Para habilitar, criar na Vercel as variáveis de servidor `TURN_ENABLED=true`, `TURN_KEY_ID` e `TURN_KEY_API_TOKEN` (sensíveis). **Antes de habilitar**, configurar uma regra de rate limiting no Vercel Firewall para `/api/turn`, com limite por IP e observabilidade de uso/custo no provedor TURN. Sem essas medidas, a emissão aberta de credenciais temporárias pode gerar tráfego tarifado.

O endpoint retorna 503 sem configuração, 403 para origem cruzada, e nunca retorna a chave permanente. A aplicação usa PeerJS com `iceServers` obtidos antes de criar a sala. Credenciais já emitidas têm validade limitada; partidas superiores a uma hora podem exigir atualização de ICE em versão futura.

**Teste de homologação externa ainda obrigatório:** dois dispositivos em ISPs/redes distintas, depois repetir com ao menos um deles em rede que bloqueie P2P direto, verificar na ferramenta WebRTC do navegador que o candidato selecionado seja `relay` e registrar taxa de sucesso, reconexões, latência e custo TURN. Dois contextos de Chromium no CI validam transporte e protocolo, mas não comprovam travessia de NAT.
