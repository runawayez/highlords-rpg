# Highlords RPG — Frontend P2P

Aplicação publicada: `p2p/index.html` · https://highlords-rpg.vercel.app

## Recursos

Salas por convite, mapas, múltiplas cenas, tokens transferíveis e removíveis, ferramentas de navegação/desenho/revelação, Fog of War com rasterização de áreas reveladas, chat, dados e fichas básicas. Campanhas podem ser nomeadas, recuperadas por autosave IndexedDB e exportadas como arquivo `.highlords` ZIP v3 com cenas, personagens e imagens separados (importação v2 e JSON Alpha mantida).

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

## Editor da Beta

O mestre dispõe de pincel, linha, retângulo, elipse, borracha de traços, régua (em unidades de grid), seleção contextual simples, grid quadrado/hexagonal, magnetismo de tokens e controle de visibilidade local do grid, tokens e desenhos. O alinhamento do grid, tamanho, opacidade e encaixe são configurações da campanha; a visibilidade das camadas é persistida e sincronizada pelo mestre, mas não substitui permissões de dados privadas nem camadas de objetos individuais.

**Limites:** ainda não há paredes, iluminação dinâmica, ordenação/bloqueio de objetos individuais, seleção múltipla, macros, plugins ou histórico de ações persistente entre sessões. O histórico em memória cobre o estado do editor da cena ativa. Essas ferramentas exigem evolução de modelo e validações P2P antes de serem anunciadas como implementadas. TURN continua desativado.

Campos de fichas podem ser organizados por seção e marcados como exclusivos do mestre; o host filtra campos privados antes de projetar a ficha para jogadores e valida direitos de edição a cada ação. Fichas de outros jogadores não recebem seus campos privados.

Exportação ZIP usa entradas armazenadas, sem compressão, com manifesto v3, limite de 15 MB e checagens CRC32, arquivos permitidos e referências válidas. O ZIP v2 legado continua importável; backups JSON originais também.

O mestre controla a visibilidade, bloqueio de edição e confidencialidade das camadas Mapa/Desenhos/Tokens por cena. Campos 'Somente mestre' não entram no payload WebRTC do convidado, mesmo sem Fog; desenhos privados não entram no raster do mapa mascarado. Configuração validada pelo host e preservada em backups.

Recuperação assistida: o mestre escolhe uma identidade previamente vinculada e um novo navegador já autenticado, confirma a identidade por canal externo, transfere personagens e tokens e remove o vínculo de chave antiga. Não exporta ou replica chave privada. Não é recuperação autônoma sem mestre.

O mestre pode selecionar vários tokens pressionando Shift e clicando nos tokens, depois alinhar, distribuir horizontalmente ou excluir em lote. Todas as alterações em lote são verificadas pelo host e negadas aos convidados.

## Layout da Beta — painéis da mesa

A interface usa navegação por abas inspirada no padrão de mesas virtuais modernas: Chat e dados (aba padrão, envio e rolagem sempre acessíveis), Fichas e Mestre (apenas host). Somente o conteúdo do painel ativo recebe rolagem, e o histórico de conversa tem rolagem independente da composição fixa. As abas permitem navegação por setas, Home e End; o mapa permanece como área principal. A alteração é exclusivamente de interface, sem dependências adicionais, sem efeitos sobre WebRTC/STUN e sem reativar TURN.

## Robustez e homologação

Ações recebidas de convidados são limitadas em frequência e tamanho antes da validação específica no mestre. O estado recuperado é validado, inclusive IDs duplicados; o autosave valida o snapshot antes da gravação e evidencia falhas de espaço com recomendação de exportar backup. A suíte automatizada cobre regressões, mas não equivale a homologação entre redes físicas independentes ou avaliação de acessibilidade assistiva. TURN permanece desativado.
