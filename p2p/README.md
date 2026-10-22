# Highlords VTT — Frontend P2P

Aplicação publicada: `p2p/index.html` · https://highlords-vtt.vercel.app

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

## Lançamento oficial 1.0

O projeto passou diretamente da Beta para o lançamento 1.0 por decisão de produto, sem etapa formal de Release Candidate. TURN permanece totalmente desativado, inclusive em produção, até segunda ordem. O pacote oficial usa os testes automatizados existentes e testes adicionais de integridade/segurança; a disponibilidade entre operadoras físicas diferentes, auditoria externa de segurança e acessibilidade assistiva não estão certificadas. O acompanhamento de bugs continua via issues e commits pontuais. A Vercel publica apenas a aplicação P2P estática.

## Refinamento pós-1.0 — mesa e fichas

A interface separa ferramentas do mapa, cenas, biblioteca, propriedades, fichas e participantes. Painéis podem ser recolhidos e ter sua largura ajustada. O editor de ficha usa uma única área de rolagem e blocos de texto, número, notas, recurso atual/máximo, listas e inventário com quantidade e observações. Fichas podem ser duplicadas como modelos, com novos IDs e sem transferir o proprietário. Campos podem ser reordenados e removidos pelo mestre.

As alterações da ficha são enviadas por campo após 700 ms sem digitação, ou pelo botão Salvar. Cada campo possui versão independente; o host compara a versão esperada e rejeita alterações obsoletas. Edições em campos diferentes são combinadas. Quando o mesmo campo muda, o rascunho permanece na interface e o usuário escolhe entre reaplicá-lo ao valor atual ou receber o valor remoto. Uma nova mudança durante a resolução pode gerar outro conflito. A confirmação de sincronização não significa backup em disco: o autosave do mestre continua independente.

Rascunhos são mantidos em memória durante a sessão, inclusive durante atualizações e reconexão. Recarregar ou encerrar a página pode descartá-los, com aviso do navegador quando suportado. Não há coedição de texto por caractere, histórico persistente de fichas nem recuperação de rascunhos após fechamento. Campos privados e permissões continuam validados no host. O cliente atual envia versões; chamadas legadas sem versão seguem compatíveis.

Os blocos estruturados usam strings JSON no esquema existente e mantêm importação de campos antigos em texto. A conversão de inventários/listas antigas em itens é explícita. ZIP v3, assinatura local e TURN desativado foram preservados. Os módulos de ficha, composição da interface e estilos ficam em `assets/sheets.js`, `assets/workspace.js` e `assets/workspace.css`; o núcleo de transporte e persistência segue em `index.html`.


## Versão 1.1

Veja [RELEASE_1.1.md](../RELEASE_1.1.md) para interação do mapa, vínculo de fichas, dimensões por cena, biblioteca e recuperação de rascunhos. O módulo `assets/release11.js` integra os novos controles e a persistência de rascunhos; `sheets.js` e a autoridade principal continuam responsáveis pelas permissões e versões dos campos.


## Apresentação do terminal

`assets/terminal.css` padroniza home e mesa com a paleta preta/vermelha e fontes locais Orbitron/JetBrains Mono. `assets/terminal.js` controla as abas de entrada e o efeito CRT, cuja preferência usa `hl-scanlines` no navegador. Não altera o protocolo, o esquema de campanha ou a autoridade do mestre. A direção visual atual está em [DIRECAO_VISUAL.md](../docs/DIRECAO_VISUAL.md).


## Ferramentas de preparação e sessão

Biblioteca visual, modelos/encontros, notas, marcadores, combate, propriedades rápidas, alinhamento de grade e prévia por jogador são documentados em [SESSAO_E_PREPARACAO.md](../docs/SESSAO_E_PREPARACAO.md). Os módulos `session-model.js`, `session-actions.js`, `session.js` e `session.css` integram essas ferramentas ao motor existente; `sync.js` implementa deltas negociados por conexão, calculados somente sobre projeções autorizadas, e fallback para snapshots completos.
