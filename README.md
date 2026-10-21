<div align="center">

<img src="p2p/assets/highlords-mark.svg" alt="Highlords VTT" width="104">

# Highlords VTT

**Sua mesa. Suas regras. Suas histórias.**

Mesa virtual de RPG gratuita e independente de sistemas, direto no navegador.

[**Abrir a mesa**](https://highlords-vtt.vercel.app) · [Reportar problema](https://github.com/runawayez/highlords-rpg/issues) · [Documentação técnica](p2p/README.md)

</div>

---

> **Highlords VTT é e sempre será gratuito.** Sem cadastro obrigatório, sem instalação e sem campanhas armazenadas permanentemente em um servidor. **A campanha pertence ao mestre.**

## Visão geral

O Highlords VTT é uma *Virtual Tabletop* (VTT) leve para reunir pessoas em torno de mapas, personagens e histórias, sem impor regras de um sistema específico. O mestre cria a sala, compartilha o convite e mantém o controle da campanha em seu próprio navegador.

**Lançamento 1.0:** versão oficial do núcleo gratuito e independente de sistemas. Mantemos correções e evolução contínuas. A publicação não garante funcionamento em todas as redes: TURN permanece desativado e cenários de redes físicas diferentes não foram integralmente homologados.

## Comece a jogar

**Para mestres**

1. Acesse [highlords-vtt.vercel.app](https://highlords-vtt.vercel.app).
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
| Mapas e cenas | Upload de mapa, múltiplas cenas, navegação, zoom, grid quadrado/hexagonal calibrável, transparência, origem e encaixe de tokens |
| Ferramentas | Pincel, linhas, retângulos, elipses, borracha de traços, régua, histórico de desfazer/refazer do editor, inspetor de tokens e camadas de mapa, tokens e desenhos com visibilidade, bloqueio e privacidade persistidas por cena e revelação de áreas |
| Tokens | Criação, movimentação, seleção múltipla com Shift, alinhamento/distribuição, transferência entre cenas, exclusão e atribuição de controlador |
| Fichas | Fichas livres com texto e campos e seções personalizados de texto, número, notas e inventário, com visibilidade e edição restritas pelo mestre |
| Interação | Chat e rolagem de dados |
| Persistência | Autosave e checkpoints locais em IndexedDB |
| Portabilidade | Exportação `.highlords` em ZIP v3 com cenas, fichas e imagens separadas, manifesto e verificação CRC32; importação de JSON da Alpha |
| Identidade | Chaves ECDSA P-256 geradas localmente, prova de posse e vinculação inicial de confiança (TOFU) |

As ferramentas da Beta são **implementações iniciais**, não necessariamente versões definitivas. Por exemplo, as camadas atuais possuem visibilidade, bloqueio e modo exclusivo do mestre por tipo, mas ainda não permitem ordenação individual de objetos; paredes, iluminação dinâmica, histórico persistente entre sessões, paredes e painéis acopláveis continuam planejados.

## Organização da mesa

A lateral da mesa usa três abas — **Chat e dados**, **Fichas** e **Mestre**. O chat e a rolagem ficam acessíveis diretamente na aba inicial, com o campo de mensagem e dados fixos ao fim do painel. As ferramentas extensas do mestre rolam **somente dentro da própria aba**; o mapa continua visível. Em telas menores, a lateral aparece abaixo do mapa. A aba Mestre não aparece para convidados.

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

O formato `.highlords` exportado usa ZIP v3 com `manifest.json`, `campaign.json`, `characters/`, `scenes/` e `assets/`. O importador mantém compatibilidade com ZIP v2 e arquivos JSON legados da Alpha. Arquivos passam por validação de caminhos, entradas permitidas, tamanho, estrutura e CRC32.

**Boas práticas:** mantenha cópias do arquivo exportado em local seguro, especialmente antes de limpar os dados do navegador ou trocar de computador. A chave privada de identidade do jogador não é exportada com a campanha.

## Validação técnica da Beta

O projeto inclui testes automatizados de sincronização multiplayer simulada, permissões, integridade dos backups, tratamento de falhas de autosave e navegação móvel. O host limita a frequência de ações enviadas por cada jogador e rejeita cargas anormalmente grandes. **Esses testes não certificam conectividade entre operadoras diferentes ou ausência de vulnerabilidades.** O status definitivo da Beta depende de homologação real documentada.

## Versão oficial 1.0 — compromisso de produto

**A primeira versão oficial está lançada com limitações documentadas.** Não exige conta, não hospeda campanhas centralmente e não usa relay TURN. A decisão de pular o RC formal não substitui ensaios em redes físicas independentes nem auditoria externa de segurança ou acessibilidade; problemas identificados serão corrigidos pontualmente. As sessões dependem de conexão WebRTC direta, com STUN público.

## Limitações conhecidas

- **Conectividade:** certas combinações de NAT, firewall e redes restritivas podem impedir a conexão direta. O TURN não será ativado sem nova decisão explícita.
- **Sessão:** ao fechar a aba do mestre, a mesa online é encerrada; a campanha pode ser retomada a partir dos dados locais ou de um backup.
- **Identidade:** a autenticação usa confiança no primeiro vínculo (TOFU). Há reassociação manual de fichas e tokens por autorização explícita do mestre para um novo navegador autenticado; a chave antiga é revogada. Não existe restauração automática da chave privada original.
- **Privacidade dos mapas:** ative a névoa **antes** de compartilhar a cena. Conteúdos enviados anteriormente a outros participantes não podem ser revogados.
- **Persistência:** armazenamento do navegador pode ser apagado pelo usuário ou pelo próprio ambiente. Exporte backups regularmente.
- **Maturidade:** ainda faltam homologação em redes externas, auditoria integral de segurança/acessibilidade e validação de campanhas grandes. Evite usar material sigiloso ou campanhas sem backup.

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
| **Beta** — portabilidade ZIP, fichas customizáveis, ferramentas e permissões avançadas | Implementada; encerramento administrativo por decisão de produto |
| **Release Candidate** — testes com campanhas reais, segurança, performance e acessibilidade | Etapa formal dispensada por decisão do projeto; verificações automatizadas incorporadas à 1.0 |
| **1.0** — versão oficial do núcleo; correções pontuais posteriores | Lançamento oficial; homologação entre redes independentes permanece como limite conhecido |

Recursos adicionais como iniciativa, música ambiente, macros e templates de sistemas são opcionais e não bloqueiam o núcleo do projeto.

## Contribuição e suporte

Problemas de uso, sugestões e relatos de bugs podem ser registrados nas [issues do repositório](https://github.com/runawayez/highlords-rpg/issues). Ao relatar um problema, informe o navegador, o cenário utilizado, o comportamento observado e, quando possível, as etapas para reproduzi-lo. **Não publique arquivos de campanha com dados privados em issues públicas.**

## Licença

Consulte o arquivo de licença disponível no repositório para verificar os termos aplicáveis ao código. O compromisso de **uso gratuito do Highlords VTT** não substitui os termos da licença de software.

---

<div align="center">

**Highlords VTT**

*Abra a mesa. Convide seus amigos. Jogue.*

[**Jogar gratuitamente**](https://highlords-vtt.vercel.app)

</div>
