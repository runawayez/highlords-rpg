# Highlords RPG

VTT experimental e independente de sistema, em português, para jogar no navegador. Referências de produto: Owlbear Rodeo e Dark Age. Código original.

## Executar

Requer Node.js 20+; nenhuma dependência npm externa.

```bash
npm start
```

Abra http://localhost:3000. Crie a sala, compartilhe seu código e jogue. Em rede local, inicialize com `HOST=0.0.0.0 npm start` e informe aos jogadores o endereço IP da máquina anfitriã.

## Primeira versão
- Salas, mapa por upload, grade, zoom, movimentação de câmera;
- Tokens criados e controlados pelo mestre (movimento de jogadores opcional);
- Chat, dados rolados no servidor, diário do mestre;
- Sincronização via SSE e gravação automática na pasta `data/`.

## Limitações importantes
**Protótipo para ambiente confiável, não para implantação pública.** Não há login seguro, rate limiting, gerenciamento avançado de uploads, nem proteção de acesso suficiente para expor o servidor à Internet. O mestre deve manter o servidor ligado. Armazene backups da pasta `data/`.

## Testes

Execute `npm test`. A suíte inclui verificações de dados e cenários HTTP com mestre/jogador, garantindo autorização do diário, isolamento de rolagens secretas, atualização de cena e identificação pelo servidor.

## Segurança

A interface não determina mais quem é mestre: o servidor inclui `self.gm` na visualização autenticada. Anotações do mestre não são enviadas a jogadores. A ocultação de cena nesta versão é global (não é fog of war com áreas reveláveis).

## Roadmap
Fichas dinâmicas, fog of war, camadas, biblioteca de recursos, arquitetura isolada de extensões e autenticação adequada.

## Cenas e revelação de névoa

- O mestre cria, alterna e exclui cenas pela barra lateral. Cada cena guarda mapa, grade, tokens, desenhos e áreas reveladas separadamente.
- Marque **Escurecer cena** e aplique; depois selecione **Revelar área** e arraste um retângulo sobre o mapa.
- **Repor névoa** remove todas as áreas reveladas da cena ativa.
- Tokens fora das regiões reveladas não são enviados ao jogador na resposta de estado.

**Limite atual:** o fog of war ainda é uma implementação preliminar de retângulos. O mapa de fundo continua sendo um recurso acessível via URL sem autorização por sala; portanto a névoa é uma ferramenta de apresentação, **não uma proteção segura de segredos do mapa**. Não publique campanhas com conteúdo confidencial. Ainda faltam camadas e isolamento completo de assets.

Testes: execute `npm test` (inclui `tests/scenes.test.js`).

## Acesso aos mapas (atualização de segurança)

Arquivos em `/uploads/` agora exigem os parâmetros de sala e credencial de participante. O servidor confirma que o arquivo pertence a alguma cena daquela campanha; requisições anônimas e de outras salas são recusadas. Não compartilhe URLs contendo chaves de sessão.

**Limitação:** qualquer participante autorizado ainda pode obter a imagem original do mapa, inclusive áreas cobertas pela névoa. A névoa atual **não serve como proteção contra jogadores que inspecionem as requisições**. Para ocultação real dos mapas, precisamos renderizar o recorte seguro no servidor ou servir tiles autorizados e mascarados.

A suíte inclui `tests/assets.test.js` com testes de acesso anônimo, credencial inválida, isolamento entre salas e acesso permitido.
