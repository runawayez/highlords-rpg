# Highlords RPG

Mesa virtual gratuita de RPG, independente de sistema, acessível pelo navegador. **A campanha pertence ao mestre.**

**Jogar:** https://highlords-rpg.vercel.app

## Como usar

1. O mestre abre o site, nomeia a campanha e cria uma mesa.
2. Compartilha o convite com os jogadores, que entram sem cadastro.
3. Todos usam mapa, tokens, fichas, dados e chat; o mestre administra cenas, desenho e névoa.
4. O mestre pode recuperar autosaves locais ou exportar/importar sua campanha `.highlords`.

## Estado atual

**Alpha concluída (escopo de engenharia) · v0.2.0-alpha.** Frontend estático em `p2p/`, publicado na Vercel, com WebRTC/PeerJS e navegador do mestre como host. Inclui múltiplas cenas, transferência/exclusão de tokens, ferramentas de desenho e revelação, fichas livres básicas, reconexão tentativa e checkpoints no IndexedDB.

O arquivo `.highlords` ainda é JSON; o formato ZIP versionado está planejado.

## Desenvolvimento e testes

- `npm test` executa testes do protótipo legado Node.js.
- `.github/workflows/p2p-browser.yml` executa smoke tests do frontend P2P em Chromium usando Playwright.
- `p2p/index.html` é a aplicação publicada. `server.js` e `public/` são código legado, não publicado na Vercel.

## Marco de encerramento da Alpha

Concluído após CI aprovado com **20 testes de navegador Chromium + 3 testes Node** no GitHub Actions (execução [39613976081](https://github.com/runawayez/highlords-rpg/actions/runs/39613976081)). A suíte inclui recuperação local de cenas/fichas/tokens após reload, importação legada, autenticação de jogador, reconexão e WebRTC DataChannel real em dois contextos de navegador.

**Decisão de produto:** somente WebRTC P2P + STUN público; TURN permanece integralmente desativado, sem chamadas do cliente ou emissão de credenciais pelo servidor. A conexão com redes restritivas não é garantida. **Homologação manual com pessoas em operadoras/redes distintas não foi reproduzida nesta rodada** e não é requisito bloqueante para encerrar a Alpha conforme decisão do responsável.

Próxima etapa: Beta (arquivo `.highlords` ZIP versionado, fichas universais, editor e UX). O marco Alpha não equivale a auditoria completa de segurança nem lançamento estável 1.0.

## Limitações da Alpha

- O host deve manter o navegador aberto. TURN está intencionalmente desativado; algumas redes podem falhar.
- Quando a névoa está ativa, convidados recebem uma versão rasterizada somente com áreas reveladas; conteúdos enviados anteriormente não podem ser revogados.
- Entradas usam prova de posse ECDSA P-256, com confiança na primeira vinculação da chave pública (TOFU); não protege o primeiro vínculo contra usurpação.
- Autosaves dependem dos dados do navegador: **exporte backups regularmente**.
- A versão não deve ser usada com conteúdo sigiloso ou sem cópias da campanha.

## Licença e contribuição

Consulte a licença do repositório. Contribuições e relatos de erros são bem-vindos. O uso do Highlords RPG permanecerá gratuito.
