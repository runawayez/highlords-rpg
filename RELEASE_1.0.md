# Highlords VTT — Notas de lançamento 1.0

**Data:** 21/10/2026

Versão oficial 1.0 do núcleo VTT gratuito, sem cadastro obrigatório e com campanhas sob controle do mestre. A decisão de produto foi passar diretamente da Beta para o lançamento oficial, sem etapa formal RC. Isso não significa homologação externa total.

**Arquitetura obrigatória:** P2P WebRTC com PeerJS para sinalização e apenas STUN público na configuração ICE. TURN permanece **desativado mesmo na versão oficial**, até segunda ordem. O código de TURN pode permanecer apenas como referência, sem solicitações nem credenciais de relay.

**Critérios e limites conhecidos:** a suíte automatizada cobre fluxos e regressões de navegador, persistência, arquivo ZIP e autorização. Ainda são necessários ensaios reais em redes físicas independentes e auditorias externas profundas de acessibilidade, segurança e carga para alegar esses níveis de garantia. Redes restritivas podem não conectar sem TURN. Não há armazenamento permanente de campanhas em servidor. Recomenda-se exportar backups `.highlords`.

**Pós-lançamento:** corrigir bugs pontuais; reavaliar layout em momento separado. Não introduzir contas ou custos obrigatórios.

## Refinamento da interface e fichas — 21/10/2026

Mesa reorganizada com ferramentas junto ao mapa, cenas independentes, biblioteca por tarefa e painel de ficha amplo. Fichas modulares incluem edição por campo com envio automático, detecção de conflitos e preservação de rascunhos durante atualizações/reconexão. Compatibilidade com campanhas antigas, ZIP v3 e TURN desativado preservados. Detalhes e limites em `docs/REFINAMENTO_1.0.md`.
