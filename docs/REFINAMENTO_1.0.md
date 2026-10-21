# Highlords VTT — refinamento da mesa e fichas

Data: 21/10/2026. Complemento técnico ao Documento Mestre de lançamento 1.0.

## Decisões implementadas

- Home compacta com gratuidade antes das ações e captura real da interface em uma campanha demonstrativa.
- Ferramentas SVG consistentes ao lado do mapa; navegação de cenas independente do painel.
- Biblioteca do mestre organizada em Mapa, Tokens e Propriedades contextuais.
- Fichas e criação de personagens no mesmo local; participantes e recuperação de acesso em Grupo.
- Menu de campanha para exportação e saída. Importação e recuperação continuam na home.
- Painel recolhível e largura ajustável; ficha ocupa uma área maior, sem rolagem interna adicional.
- Layout para desktop e telas pequenas, foco visível e composição do chat fixa.
- Chat mantém a posição de leitura quando o usuário está consultando mensagens antigas.
- Fichas universais com descrição, texto, número, notas, retrato local reduzido, recurso atual/máximo, lista e inventário estruturado.
- Mestre pode renomear/duplicar fichas, adicionar/remover/ordenar campos e alterar suas seções e permissões. A duplicação gera IDs novos e não copia proprietário.
- Apenas fichas atribuídas ao destinatário entram na projeção enviada ao jogador; campos exclusivos do mestre são omitidos.

## Colaboração e persistência

A autoridade continua no navegador do mestre. O cliente envia uma intenção de alteração por campo, identificador de requisição e versão esperada. O host valida propriedade, permissões, tipo, tamanho e versão antes de aplicar. Confirmação de envio e salvamento local são estados diferentes.

O envio automático ocorre após 700 ms sem digitação, com botão manual disponível. Campos diferentes têm versões independentes e não sobrescrevem a ficha inteira. Uma escrita obsoleta no mesmo campo é rejeitada; o rascunho permanece disponível para escolher o valor remoto ou reaplicar a alteração à versão mais recente. Nova concorrência pode exigir nova resolução. Não é coedição de texto por caractere.

Atualizações do chat, tokens e estado remoto não descartam rascunhos. O editor conserva valores, foco, seleção e formulários abertos durante reconstruções. Rascunhos interrompidos são conciliados após reconectar, incluindo confirmações perdidas. Revogação de acesso remove o rascunho correspondente. Sair ou recarregar com rascunhos pendentes gera aviso, quando o navegador permite.

Rascunhos permanecem em memória: não há recuperação garantida após fechar/recarregar a página. O estado aceito continua sendo salvo no IndexedDB do mestre e exportado no ZIP v3. Inventários antigos em texto são preservados, inclusive textos iniciados por colchete; a conversão para itens é explícita. Novos itens usam metadado `format: items`, sem alterar o contêiner ZIP.

## Organização do código

- `p2p/assets/workspace.css`: estilos da interface, substituindo as antigas sobreposições inline.
- `p2p/assets/workspace.js`: composição da mesa, ferramentas, painéis e ícones.
- `p2p/assets/sheets.js`: rascunhos, validação de blocos e editor universal.
- `p2p/index.html`: núcleo P2P, autoridade, validação da campanha e persistência.

Nenhuma nova dependência de produção, conta ou serviço de armazenamento foi adicionada. TURN continua desativado. STUN e sinalização seguem como na versão publicada anterior.

## Verificações e limites

Os testes de navegador cobrem home, responsividade, ferramentas, permissões, arquivos, autosave, rascunhos, conflitos, modelos, blocos e compatibilidade. O teste com dois contextos isolados usa uma ponte de transporte de teste para exercer autenticação, projeções, edição concorrente e reconexão reais da aplicação; isso não comprova conectividade entre operadoras. Um teste separado usa RTCPeerConnection real e continua no CI.

O ambiente local não concluiu a coleta ICE do teste WebRTC real. Não atribuir esse resultado à aplicação nem anunciar homologação entre redes. Conferir o workflow associado ao commit publicado para o resultado completo do CI. Nenhum conjunto desses testes equivale a auditoria externa de segurança, acessibilidade assistiva ou desempenho em campanhas grandes.
