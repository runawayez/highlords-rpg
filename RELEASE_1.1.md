# Highlords VTT 1.1

A atualização melhora o uso da mesa durante a sessão e a recuperação de dados no navegador.

- **Mapa e tokens:** prévia local durante o arraste, zoom ancorado no ponteiro, Esc para cancelar e limpar seleção, clique vazio para desmarcar, atalhos V/B/L/R/O/E/M/F com dicas nas ferramentas e indicação de controle de cada token.
- **Tokens e fichas:** o mestre vincula uma ficha e escolhe um recurso no painel Propriedades. Retratos aparecem no token e o duplo clique abre a ficha autorizada. O recurso acompanha as alterações da ficha. Jogadores só recebem as próprias fichas e campos permitidos; esse vínculo não amplia permissões.
- **Dimensões por cena:** largura e altura de 240 a 4096 px; opção de usar as dimensões/proporção da imagem. Tokens, desenhos e áreas reveladas acompanham o redimensionamento. Grade, enquadramento, máscara rasterizada da névoa e validação usam as mesmas dimensões. Cenas antigas continuam em 1200 × 800.
- **Biblioteca local:** campanhas identificadas separadamente, com último estado e até cinco checkpoints por campanha. Criar uma nova campanha preserva as anteriores. Saves legados são migrados sem trocar o banco ou a identidade do dispositivo.
- **Rascunhos persistentes:** edições pendentes ficam neste navegador, separadas por campanha e identidade. Ao reabrir a campanha/reentrar na sala, o cliente consulta permissões e versões atuais; conflitos continuam exigindo escolha explícita. A revogação de acesso remove o rascunho ao receber o novo estado.

## Compatibilidade e limites

Arquivos `.highlords` ZIP v3 continuam preservando cenas, fichas e imagens; importação ZIP v2 e JSON legado permanece disponível. Exporte um backup antes de migrar e mantenha cópias fora do navegador. O armazenamento é local à origem e ao dispositivo; não é sincronização entre navegadores. Dados privados não se tornam públicos ao vincular uma ficha: outros jogadores continuam vendo o token pelo nome, sem os campos/retrato da ficha alheia.

O mestre permanece autoridade da sessão P2P. TURN continua desativado. Testes com clientes isolados exercitam a aplicação usando transporte de teste; o teste WebRTC real separado no CI não equivale à homologação entre operadoras/redes físicas diferentes.

## Validação

A suíte cobre arquivos antigos e atuais, projeções privadas, autosave, falhas de armazenamento, identidade, ferramentas, edição concorrente e reconexão. Regressões da 1.1 incluem dimensões por cena e round-trip ZIP, arraste cancelável e âncora do zoom, campanhas/checkpoints independentes, rascunho após recarga, resolução de conflito e token vinculado com recurso privado. O fluxo com dois contextos também verifica dimensões remotas e rascunho do jogador após recarga e nova autenticação.

Validação local do lançamento: 50 testes de navegador da aplicação e 10 testes Node aprovados. O teste WebRTC DataChannel real permanece no workflow Chromium do GitHub; o ambiente local não completa a coleta de ICE.
