# Highlords RPG

Mesa virtual gratuita de RPG, independente de sistema, acessível pelo navegador. **A campanha pertence ao mestre.**

**Jogar:** https://highlords-rpg.vercel.app

## Como usar

1. O mestre abre o site, nomeia a campanha e cria uma mesa.
2. Compartilha o convite com os jogadores, que entram sem cadastro.
3. Todos usam mapa, tokens, fichas, dados e chat; o mestre administra cenas, desenho e névoa.
4. O mestre pode recuperar autosaves locais ou exportar/importar sua campanha `.highlords`.

## Estado atual

**Alpha fechada · v0.2.0-alpha.** Frontend estático em `p2p/`, publicado na Vercel, com WebRTC/PeerJS e navegador do mestre como host. Inclui múltiplas cenas, transferência/exclusão de tokens, ferramentas de desenho e revelação, fichas livres básicas, reconexão tentativa e checkpoints no IndexedDB.

O arquivo `.highlords` ainda é JSON; o formato ZIP versionado está planejado.

## Desenvolvimento e testes

- `npm test` executa testes do protótipo legado Node.js.
- `.github/workflows/p2p-browser.yml` executa smoke tests do frontend P2P em Chromium usando Playwright.
- `p2p/index.html` é a aplicação publicada. `server.js` e `public/` são código legado, não publicado na Vercel.

## Limitações da Alpha

- O host deve manter o navegador aberto. TURN dedicado não está configurado; algumas redes podem falhar.
- Fog of War é **visual**: o mapa original ainda chega aos convidados.
- Identificadores locais não constituem autenticação forte.
- Autosaves dependem dos dados do navegador: **exporte backups regularmente**.
- A versão não deve ser usada com conteúdo sigiloso ou sem cópias da campanha.

## Licença e contribuição

Consulte a licença do repositório. Contribuições e relatos de erros são bem-vindos. O uso do Highlords RPG permanecerá gratuito.
