<div align="center">

<img src="p2p/assets/highlords-mark.svg" alt="Highlords RPG" width="104">

# Highlords RPG

**Sua mesa. Suas regras. Suas histórias.**

Mesa virtual de RPG gratuita e independente de sistemas, direto no navegador.

[**Abrir a mesa**](https://highlords-rpg.vercel.app) · [Reportar problema](https://github.com/runawayez/highlords-rpg/issues) · [Documentação técnica](p2p/README.md)

</div>

---

> **Highlords RPG é e sempre será gratuito.** Sem cadastro obrigatório, sem instalação e sem campanhas armazenadas permanentemente em um servidor. **A campanha pertence ao mestre.**

## Visão geral

O Highlords RPG é uma *Virtual Tabletop* (VTT) leve para reunir pessoas em torno de mapas, personagens e histórias, sem impor regras de um sistema específico. O mestre cria a sala, compartilha o convite e mantém o controle da campanha em seu próprio navegador.

O projeto está em **desenvolvimento ativo**: o escopo de engenharia da **Alpha foi encerrado**, e funcionalidades da **Beta estão integradas, mas ainda não homologadas integralmente**. Não se trata de uma versão estável 1.0.

## Comece a jogar

**Para mestres**

1. Acesse [highlords-rpg.vercel.app](https://highlords-rpg.vercel.app).
2. Informe um nome para a campanha e selecione **Preparar minha mesa**.
3. Compartilhe o convite com o grupo.
4. Organize a cena, os mapas, os tokens e as fichas.
5. Exporte sua campanha periodicamente como arquivo `.highlords`.

**Para jogadores**

1. Abra o link enviado pelo mestre.
2. Escolha um apelido e entre na mesa.
3. Participe usando os recursos e permissões disponibilizados pelo mestre.

**Importante:** o navegador do mestre precisa permanecer aberto para manter a sessão online. O autosave local não substitui backups exportados.

## Funcionalidades

| Área | Disponível atualmente |
| --- | --- |
| Mesas online | Salas por convite, sem conta obrigatória; comunicação P2P com WebRTC e PeerJS |
| Mapas e cenas | Upload de mapa, múltiplas cenas, navegação, zoom e grid de tamanho ajustável |
| Ferramentas | Desenho, desfazer/limpar traços e revelação de áreas com névoa de guerra |
| Tokens | Criação, movimentação, transferência entre cenas, exclusão e atribuição de controlador |
| Fichas | Fichas livres com texto e campos personalizados de texto, número, notas e inventário |
| Interação | Chat e rolagem de dados |
| Persistência | Autosave e checkpoints locais em IndexedDB |
| Portabilidade | Exportação `.highlords` em ZIP versionado com manifesto e verificação CRC32; importação de JSON da Alpha |
| Identidade | Chaves ECDSA P-256 geradas localmente, prova de posse e vinculação inicial de confiança (TOFU) |

As ferramentas da Beta são **implementações iniciais**, não necessariamente versões definitivas. Por exemplo, o ZIP ainda mantém os recursos incorporados ao `campaign.json`, e o editor ainda não possui todas as operações de camadas planejadas.

## Como funciona

```text
        Navegador do mestre
      (estado autoritativo)
               │
    WebRTC Data Channels (P2P)
       ┌───────┴───────┐
       │               │
   Jogador A        Jogador B
```

- **Frontend:** HTML, CSS e JavaScript, publicado estaticamente na Vercel.
- **Conexão:** PeerJS para sinalização e WebRTC Data Channels para troca de dados.
- **Rede:** servidores STUN públicos; **TURN permanece totalmente desativado** por decisão do projeto.
- **Dados:** estado da campanha e checkpoints no navegador do mestre, com exportação manual.
- **Autoridade:** o mestre valida as ações recebidas e controla as permissões da mesa.

Não há login obrigatório nem banco central para armazenar campanhas. O serviço de sinalização não equivale a armazenamento permanente de campanhas.

## Arquivos de campanha

O formato `.highlords` exportado atualmente é um ZIP versionado, contendo `manifest.json` e `campaign.json`. A importação também aceita arquivos JSON legados da Alpha.

**Boas práticas:** mantenha cópias do arquivo exportado em local seguro, especialmente antes de limpar os dados do navegador ou trocar de computador. A chave privada de identidade do jogador não é exportada com a campanha.

## Limitações conhecidas

- **Conectividade:** certas combinações de NAT, firewall e redes restritivas podem impedir a conexão direta. O TURN não será ativado sem nova decisão explícita.
- **Sessão:** ao fechar a aba do mestre, a mesa online é encerrada; a campanha pode ser retomada a partir dos dados locais ou de um backup.
- **Identidade:** a autenticação usa confiança no primeiro vínculo (TOFU). A recuperação segura da identidade em outro navegador ainda não está disponível.
- **Privacidade dos mapas:** ative a névoa **antes** de compartilhar a cena. Conteúdos enviados anteriormente a outros participantes não podem ser revogados.
- **Persistência:** armazenamento do navegador pode ser apagado pelo usuário ou pelo próprio ambiente. Exporte backups regularmente.
- **Maturidade:** ainda faltam homologação em redes externas, refinamentos de segurança, acessibilidade e validação de campanhas grandes. Evite usar material sigiloso ou campanhas sem backup.

## Desenvolvimento

A aplicação publicada é o frontend da pasta `p2p/`. Para executá-la localmente, sirva essa pasta por HTTP e abra o endereço local em um navegador compatível.

Exemplo com Python 3:

```bash
git clone https://github.com/runawayez/highlords-rpg.git
cd highlords-rpg/p2p
python -m http.server 8000
```

Acesse **http://localhost:8000**. Para conexão entre dispositivos, são necessários rede e condições compatíveis com WebRTC, além do serviço externo de sinalização.

### Testes

Requisitos para testes automatizados: **Node.js 20+** e dependências do Playwright.

```bash
npm install --no-save --package-lock=false @playwright/test
npx playwright install chromium
node --test tests/turn-config.test.js
npx playwright test --project=chromium
```

O fluxo automatizado está em [`.github/workflows/p2p-browser.yml`](.github/workflows/p2p-browser.yml). O comando `npm test` executa os testes Node do **protótipo legado**, não substituindo os testes da aplicação P2P publicada.

> **Atenção ao repositório:** `server.js` e `public/` são componentes legados. A Vercel publica `p2p/` conforme `vercel.json`.

## Roadmap

| Marco | Situação |
| --- | --- |
| **Alpha** — núcleo P2P, cenas, tokens, fichas básicas, autosave e testes | Concluído no escopo de engenharia |
| **Beta** — portabilidade ZIP, fichas customizáveis, ferramentas e permissões avançadas | Implementação parcial; homologação pendente |
| **Release Candidate** — testes com campanhas reais, segurança, performance e acessibilidade | Planejado |
| **1.0** — versão estável e documentação final | Planejado |

Recursos adicionais como iniciativa, música ambiente, macros e templates de sistemas são opcionais e não bloqueiam o núcleo do projeto.

## Contribuição e suporte

Problemas de uso, sugestões e relatos de bugs podem ser registrados nas [issues do repositório](https://github.com/runawayez/highlords-rpg/issues). Ao relatar um problema, informe o navegador, o cenário utilizado, o comportamento observado e, quando possível, as etapas para reproduzi-lo. **Não publique arquivos de campanha com dados privados em issues públicas.**

## Licença

Consulte o arquivo de licença disponível no repositório para verificar os termos aplicáveis ao código. O compromisso de **uso gratuito do Highlords RPG** não substitui os termos da licença de software.

---

<div align="center">

**Highlords RPG**

*Abra a mesa. Convide seus amigos. Jogue.*

[**Jogar gratuitamente**](https://highlords-rpg.vercel.app)

</div>
