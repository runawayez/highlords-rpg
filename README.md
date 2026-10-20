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

## Roadmap
Fichas dinâmicas, fog of war, camadas, biblioteca de recursos, arquitetura isolada de extensões e autenticação adequada.
