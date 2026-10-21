# Highlords VTT — Documento Mestre

**Versão:** 1.0 · **Data:** 20/10/2026  
**Finalidade:** fonte permanente de decisões, requisitos e contexto para todos os chats do projeto Highlords VTT.

> **Regra fundamental:** Highlords VTT é somente a mesa. A campanha pertence ao mestre.

## 1. Como utilizar esta fonte

Este documento é a referência de produto e arquitetura. Antes de propor, revisar ou implementar algo, leia-o e compare as informações com o código atual no GitHub. Uma funcionalidade planejada neste texto **não é automaticamente uma funcionalidade implementada**.

Ordem de precedência:
1. Pedidos explícitos mais recentes do usuário.
2. Código e configuração reais na branch `main` para determinar o estado da implementação.
3. Este documento para decisões de produto, restrições e objetivos.
4. READMEs, histórico de conversas e outras anotações para contexto complementar.

Atualize esta fonte quando uma decisão importante mudar ou um marco for realmente validado. Não preencha o documento com afirmações de testes não executados.

## 2. Identidade do produto

O **Highlords VTT** é uma mesa virtual de RPG (*Virtual Tabletop — VTT*) gratuita, minimalista, independente de sistemas e utilizada diretamente no navegador. Inspiração funcional: Owlbear Rodeo, mas sem tentar reproduzir uma plataforma pesada de contas e gerenciamento.

### Compromissos permanentes

- **Sempre gratuito.** As funcionalidades essenciais de jogar, criar e entrar em salas nunca dependerão de pagamento.
- **Doações voluntárias** poderão ser oferecidas futuramente para custeio, sem restringir recursos essenciais.
- **Sem contas, login ou cadastro obrigatório**; o ingresso é por convite.
- **Sem banco central de campanhas** e sem armazenamento permanente da campanha no servidor.
- **Sem instalação** para os participantes, em navegadores compatíveis.
- **Independente do sistema**: não impor atributos, regras ou fichas exclusivas de D&D ou qualquer outro RPG.
- **A campanha é do mestre**: criação, importação, exportação e posse dos arquivos ficam sob seu controle.
- **Simplicidade, desempenho, acessibilidade e segurança** prevalecem sobre quantidade de recursos.

Frases de referência: **“Sua mesa. Suas regras. Suas histórias.”** e **“Abra a mesa. Convide seus amigos. Jogue.”**

## 3. Fluxo do usuário desejado

1. Mestre acessa o site e cria uma sala instantaneamente ou importa sua campanha `.highlords`.
2. Mestre recebe um convite/link e compartilha com jogadores.
3. Jogadores entram pelo navegador com apelidos, sem cadastro.
4. Mestre organiza mapas, cenas, tokens e fichas; jogadores agem dentro das permissões concedidas.
5. Alterações são sincronizadas via P2P, com o navegador do mestre como autoridade.
6. Autosave no navegador do mestre mantém checkpoints recuperáveis.
7. Mestre exporta um arquivo `.highlords` para continuar a campanha no futuro ou em outro computador.

A tela inicial deve esclarecer que o serviço **é e sempre será gratuito** *antes* dos botões de criar ou entrar. A futura opção de doar não deve parecer condição para participar.

## 4. Arquitetura oficial

| Componente | Decisão |
|---|---|
| Interface | Site estático na Vercel |
| Multiplayer | WebRTC Data Channels, inicialmente via PeerJS |
| Host/autoridade | Navegador do mestre |
| Jogadores | Navegadores convidados via link |
| Signaling | Serviço leve para negociar conexões |
| Travessia de NAT | STUN e TURN conforme necessário |
| Persistência durante edição | Memória + IndexedDB do mestre |
| Backup e portabilidade | Arquivo `.highlords` |
| Contas / cadastro | Não |
| Banco de campanhas central | Não |
| IA / Ollama | Não é requisito do núcleo |

### Implicações

- O site entrega interface e código, **não hospeda a campanha permanentemente**.
- O navegador do mestre processa ações e mantém o estado autoritativo; clientes enviam intenções.
- A Vercel não precisa executar um servidor Node.js permanente para a versão P2P.
- Para conexões pela internet, signaling é necessário; certas redes exigem TURN, que pode gerar custos de tráfego.
- Se o mestre fecha a aba, a sessão online termina. Os jogadores deverão entrar em nova sala quando necessário; o progresso deve poder ser retomado via autosave/arquivo.
- Não supor que duas abas no mesmo computador comprovam confiabilidade em redes distintas.
- Não introduzir Supabase, PostgreSQL, sistema de contas ou storage permanente sem justificativa técnica explícita e autorização do usuário.

## 5. Modelo de autoridade, segurança e comunicação

O **host valida** todas as ações antes de alterarem o estado: personagem autorizado, token permitido, dados válidos, tamanho, frequência e regras de visibilidade. Esconder botões no navegador do jogador não constitui proteção.

Requisitos:
- Estado privado do mestre não deve ser transmitido desnecessariamente.
- Não enviar cenas futuras, fichas de terceiros ou tokens ocultos a convidados.
- Proteger credenciais e segredos; não depender de apelidos como autenticação.
- Limitar tamanhos de mensagens e imagens, frequência de envio e capacidade das salas.
- Tratar JSON inválido, desconexão e retransmissão sem travar a mesa.
- Preservar sincronização consistente, inclusive ao reconectar um participante.
- Preferir projeções de estado por destinatário, não transmissão irrestrita do objeto interno da campanha.

### Aviso indispensável sobre Fog of War

A máscara visual **não assegura sigilo** quando a imagem original do mapa ainda é recebida pelo jogador. Embora o host já filtre cenas futuras, conteúdo de algumas fichas e tokens ocultos, o mapa original continua sendo transmitido. Para sigilo verdadeiro, implementar entrega de recursos apropriada, sem disponibilizar informação que deveria permanecer oculta. **Nunca anunciar Fog of War como completamente seguro nesse estado.**

## 6. Identidade dos jogadores e vínculo com fichas

### Comportamento pretendido

- Cada navegador cria e conserva uma identidade local persistente.
- Na primeira sessão, o mestre atribui uma ficha à identidade do jogador.
- Quando esse jogador regressa pelo mesmo navegador, a campanha reconhece o vínculo.
- O mestre pode reatribuir, transferir ou desvincular a ficha a qualquer momento.
- Ao trocar de navegador, o jogador poderá usar recuperação segura futura ou solicitar reatribuição ao mestre.
- Fichas e vínculos públicos devem persistir no arquivo `.highlords`.
- **Não** incluir segredos privados do jogador no arquivo da campanha.

### Evolução obrigatória de segurança

O identificador local atual **não é prova criptográfica forte**. Evoluir para chaves via Web Crypto e autenticação por prova de posse; armazenar apenas verificadores/chaves públicas na campanha. O host deve verificar identidade e permissão. Apelido e ID informado pelo cliente são insuficientes para uma sessão com participantes maliciosos.

### Fichas universais

Não impor atributos predefinidos. Permitir campos livres, numéricos, inventário, seções e notas, com permissões de visualização e edição. Mestre edita tudo; jogador edita apenas o que for autorizado. Regras e templates de sistemas específicos devem ser opcionais.

## 7. Formato de campanha `.highlords`

### Destino planejado (ainda não implementado integralmente)

Um **ZIP versionado e portátil** com todos os dados necessários para reconstruir a campanha sem depender de nuvem. Estrutura apenas ilustrativa:

```text
cronicas.highlords
├── manifest.json          # versão, metadados, integridade
├── campaign.json          # configurações e dados gerais
├── scenes/                # mapas, camadas, tokens, desenhos, fog
├── characters/            # fichas e vínculos públicos
└── assets/                # imagens, ícones e outros recursos
```

Requisitos:
- Importar, continuar, editar e exportar sem perder o estado da cena ativa.
- Preservar mapas, tokens, cenas, fichas, vínculos, configurações e demais recursos.
- Validar tamanho, estrutura, versão, tipos de arquivo e integridade.
- Prevenir ZIP bomb, path traversal e conteúdo malicioso.
- Ter mecanismo de migração para versões antigas; não quebrar campanhas salvas sem aviso.
- Não exportar chaves privadas ou segredos de jogadores.

**Estado atual (20/10/2026):** a versão P2P exporta `.highlords` em **JSON simples**, com imagens incorporadas como data URLs. O formato ZIP definitivo está pendente.

## 8. Autosave e recuperação

O progresso não pode depender apenas da RAM. O navegador do mestre usa IndexedDB para salvar automaticamente a campanha e conservar checkpoints. O usuário precisa visualizar o estado real do salvamento.

Requisitos:
- Gravação automática após alterações, com debounce.
- Checkpoints periódicos, recuperáveis e versionados.
- Status: alterações pendentes, salvando, salvo com confirmação, falha.
- Tratamento de armazenamento cheio, navegador privado, exclusão de dados, erro transacional e corrupção.
- Restauração claramente apresentada ao mestre.
- Exportação manual do arquivo `.highlords` como backup independente.

**Estado atual (20/10/2026):** IndexedDB v2 com save recente e até **cinco checkpoints**; recuperação seleciona versões que passam por validações básicas. Autosave não regrava estado sem mudança. Ainda não há testes reais de queda de energia e a proteção não substitui backup externo.

## 9. Ferramentas da mesa

### Núcleo prioritário

1. Salas e convites instantâneos.
2. Sincronização P2P e reconexão.
3. Mapas e cenas independentes.
4. Tokens, movimento e permissões.
5. Pan, zoom e grid ajustável.
6. Desenhos, apagador e camadas.
7. Fog of War, com distinção clara entre aparência visual e sigilo real.
8. Chat e dados.
9. Fichas universais.
10. Importação/exportação e autosave.

### Funcionalidades opcionais

Iniciativa, régua, marcadores, música, macros, templates, extensões e recursos específicos de sistemas. Não transformar tais recursos em dependências do núcleo.

## 10. Identidade visual

Estilo **profissional, minimalista, predominantemente preto/vermelho**, com interface discreta. Evitar roxo, decorações desnecessárias e excesso de painéis.

| Elemento | Referência |
|---|---|
| Fundo | `#08090b` |
| Painéis | `#131418` |
| Bordas | `#2a2a30` |
| Vermelho principal | `#ed3036` |
| Texto | `#f4f3f2` |

Usar a logo Highlords na home, na mesa e no favicon. Preservar legibilidade, contraste, foco por teclado, responsividade e indicadores claros de conexão/salvamento.

### Mensagem de gratuidade

> **Highlords VTT é e sempre será gratuito.**  
> Acreditamos que toda história merece uma mesa. No futuro, quem quiser poderá contribuir voluntariamente para manter o projeto vivo — jogar nunca dependerá disso.

Exibir de maneira elegante **antes** das ações de criar ou entrar na mesa. A opção de doação é futura, não está no escopo obrigatório imediato.

## 11. Código e infraestrutura — não confundir versões

- Repositório: https://github.com/runawayez/highlords-vtt
- Branch principal: `main`
- Vercel: https://highlords-vtt.vercel.app
- Projeto Vercel: `highlords-vtt`; equipe `highlords`
- Frontend publicado: `p2p/index.html`
- Deploy: `vercel.json` com saída estática `p2p`
- Documentação técnica da Alpha P2P: `p2p/README.md`

O repositório **também possui um protótipo legado Node.js** (`server.js`, `public/index.html`, testes e persistência de salas em JSON). A Vercel publica a **versão P2P estática**, não o protótipo legado. **Nunca atribuir automaticamente ao P2P funcionalidades que existem somente no Node.**

## 12. Estado efetivamente implementado na P2P em 20/10/2026

| Recurso | Estado / ressalva |
|---|---|
| Site estático na Vercel | Publicado; verificar deployment ao trabalhar |
| UI preto/vermelho e marca | Implementada em nível inicial |
| Sala/convite sem conta | Implementado em Alpha |
| PeerJS/WebRTC | Experimental; sem validação E2E entre redes documentada |
| Reconexão convidado | Tentativas progressivas; host ainda não retoma a mesma sala após fechar |
| Upload de mapa, tokens, pan/zoom | Funcionalidade inicial |
| Chat e dados | Funcionalidade inicial |
| Cenas múltiplas | Implementação inicial |
| Desenhos livres | Implementação inicial |
| Fog of War | Visual; mapa original ainda transmitido |
| Projeção por jogador | Apenas cena ativa; anotações de outras fichas omitidas; tokens sob fog filtrados |
| Fichas | Nome + campo de texto; atribuição básica, sem editor universal |
| Identidade local | Não criptograficamente autenticada |
| Autosave | IndexedDB v2, até 5 checkpoints |
| Arquivo `.highlords` | JSON simples, não ZIP |
| TURN dedicado | Pendente |
| E2E real multiplayer | Não comprovado |

**Classificação:** Alpha experimental, não Beta nem pronto para campanhas sensíveis. Um deploy `READY` confirma publicação, **não** valida multiplayer, segurança ou recuperação de dados.

## 13. Roadmap e prioridades

### P0 — Evitar falhas graves

1. Testes reais em duas ou mais redes e navegadores; conexão e TURN fallback.
2. Estabilidade de reconexão, sincronização, limites de mensagens e tratamento de erros.
3. Autenticação criptográfica, controles de permissão no host e confidencialidade das fichas.
4. Proteção de conteúdo privado: não transmitir assets que devam estar escondidos.

### P1 — Propriedade dos arquivos e mesa utilizável

5. `.highlords` ZIP versionado, com import/export, compatibilidade e validação.
6. Recuperação e UX de checkpoints aprimorados; testes após falha simulada.
7. Editor de mapas, camadas, ferramentas de desenho e grid refinados.
8. Fichas universais e vínculo/recuperação de identidade.

### P2 — Qualidade e extensibilidade

9. Campanhas reais com testes E2E multiplayer, regressões e performance.
10. Responsividade, acessibilidade e polimento visual.
11. Ferramentas opcionais e, quando decidido, doações voluntárias.

A ordem pode ser ajustada com base em bugs e pedidos recentes. **Confiabilidade e integridade dos dados vêm antes de novas ferramentas cosméticas.**

## 14. Método de trabalho esperado do assistente

O usuário prefere **implementação direta no GitHub** e acompanhamento de **deploy na Vercel**, quando as integrações estiverem disponíveis.

Procedimento:
1. Ler esta fonte e entender a solicitação mais recente.
2. Inspecionar o código atual e localizar os módulos afetados.
3. Avaliar segurança, compatibilidade com saves e regressões.
4. Implementar mudanças de maneira controlada; adicionar testes automatizados quando viável.
5. Executar verificações reais disponíveis (sintaxe, unitários, integração, E2E conforme acesso).
6. Publicar no GitHub e confirmar o status de deploy na Vercel quando solicitado.
7. Resumir objetivamente: **feito**, **validado**, **limitações**, **pendências**.
8. Não fazer o usuário testar manualmente tudo que puder ser verificado por ferramentas reais.

**Proibições de relato enganoso:**
- Não declarar testes E2E ou multiplayer bem-sucedidos quando só houve validação de sintaxe.
- Não confundir commit realizado com deploy pronto.
- Não confundir deploy pronto com função testada.
- Não afirmar que Fog of War garante segredo enquanto a imagem original é transmitida.
- Não afirmar que `.highlords` é ZIP enquanto a versão publicada for JSON.
- Não afirmar que apelido ou UUID local são credenciais criptograficamente seguras.

## 15. Critérios mínimos para anunciar uma Beta

- [ ] Mestre e ao menos dois jogadores conectam em **redes distintas**.
- [ ] TURN/fallback e fluxos de falha de conectividade são validados.
- [ ] Reconexão preserva identidade, permissão e consistência de estado.
- [ ] Ações malformadas ou sem autorização são rejeitadas pelo host.
- [ ] Cenas futuras, fichas privadas e assets ocultos não vazam indevidamente.
- [ ] `.highlords` ZIP importa/exporta campanha completa de forma portátil.
- [ ] Checkpoints recuperam campanha após interrupção simulada.
- [ ] Múltiplas cenas, tokens, chat e fichas funcionam em sessão real.
- [ ] Regressões e testes multiplayer têm resultado documentado.
- [ ] Interface é responsiva, utilizável e mostra status de salvamento/conexão.

## 16. Decisões em aberto

- Provedor definitivo de signaling, STUN e TURN; limites e custos.
- Identidade criptográfica e recuperação em outro navegador.
- Esquema ZIP definitivo e política de compatibilidade de versões.
- Solução técnica para sigilo do mapa com Fog of War.
- Limites de jogadores, tamanho de assets, campanha e política de processamento P2P.
- Editor universal definitivo de fichas.
- Formato e momento da implementação de doações.

---

**Diretriz final:** cada nova funcionalidade deve tornar a mesa mais útil, segura ou simples. O site fornece a mesa. **O mestre guarda a campanha.**


## Atualização — decisão de lançamento oficial 1.0 (21/10/2026)

O usuário decidiu saltar a etapa formal de Release Candidate e promover diretamente da Beta ao lançamento oficial 1.0, mantendo correções pontuais e ajustes visuais posteriores. TURN permanece totalmente desativado, inclusive em produção, até decisão explícita futura; PeerJS/WebRTC com STUN público continua a arquitetura. A ausência de TURN limita conectividade em certas redes. Lançamento oficial não prova homologação entre operadoras reais nem certificação de segurança, acessibilidade ou desempenho. Para implementação e testes atuais, prevalecem o código e o CI efetivos no GitHub sobre estados antigos descritos acima.


## Atualização — identidade Highlords VTT (21/10/2026)

O nome oficial passou a ser **Highlords VTT**. VTT significa **Virtual Tabletop**. O endereço principal é https://highlords-vtt.vercel.app e o projeto Vercel chama-se `highlords-vtt`, na equipe `highlords`. A marca Highlords e os arquivos `.highlords` foram preservados.

O repositório GitHub foi renomeado para `runawayez/highlords-vtt`. O remoto local, os links de documentação e os comandos de instalação usam o novo nome.

O domínio antigo continua disponível para exportação dos autosaves existentes. IndexedDB, localStorage e chaves de identidade são vinculados à origem do navegador; não migram automaticamente ao novo domínio. Não renomear `highlords-p2p`, `hl-identity` ou o domínio de assinatura `highlords-auth-v1` por razões de marca: são identificadores de compatibilidade. Ao usar outro domínio, o jogador precisa de reatribuição ou recuperação assistida pelo mestre. Nenhuma chave privada é exportada.

As descrições históricas da Alpha acima não representam a implementação atual. O refinamento da 1.0 adicionou ZIP v3, identidade com assinatura, proteção por rasterização da névoa e fichas modulares com sincronização por campo. Consultar o código atual e `docs/REFINAMENTO_1.0.md` para implementação e limites, sem presumir homologação entre redes físicas.
