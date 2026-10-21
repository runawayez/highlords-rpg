# Direção visual — Highlords VTT 1.1

A interface usa a linguagem de um atlas e de um caderno de campanha: fundo preto quente, texto marfim, vermelho terroso e tipografia serifada nos títulos. A identidade Highlords e o símbolo original são preservados.

A entrada prioriza diretamente os formulários de jogador e mestre. Há apenas um título curto e as duas ações; a entrada do jogador vem primeiro no celular e não exige rolagem nas dimensões verificadas. A biblioteca de salvamentos aparece abaixo dos formulários, sem empurrar o ingresso para fora da tela. A ilustração de atlas da revisão anterior permanece no repositório, mas foi retirada da home para reduzir distrações.

Na mesa, ferramentas com ícones e dicas ocupam menos espaço. O painel tem superfícies contínuas, separadores e hierarquia tipográfica, em vez de caixas aninhadas. Fichas usam o espaço do painel; comandos secundários têm menor destaque. Confirmações de sincronização por campo ficam disponíveis para leitores de tela sem repetir texto no layout; rascunhos, erros e conflitos permanecem visíveis.

A fonte serifada é hospedada no próprio projeto: um subconjunto latino de DejaVu Serif, convertido para WOFF e renomeado para Highlords Editorial, com licença incluída em `p2p/assets/fonts/LICENSE.txt`. Não há chamada de fontes para terceiros, nem novas dependências de produção. A arte `atlas-table.svg` é decorativa, não uma captura da aplicação.

Exportar e Início são ações diretas no cabeçalho, sem dropdown. O botão Adicionar mapa isola eventos de ponteiro para não iniciar um gesto no quadro. A cena é enquadrada automaticamente ao abrir, trocar de cena/dimensões, importar mapa e redimensionar a área disponível. O enquadramento também pode ser solicitado no controle Enquadrar.

A revisão mantém a versão funcional 1.1, os IDs dos controles e os formatos de campanhas existentes. As alterações de JavaScript se limitam à apresentação e a metadados visuais dos estados de edição. Permissões, sincronização P2P e persistência continuam nos mesmos componentes.

Prévia da entrada: [interface-home.png](interface-home.png). A captura da mesa em `p2p/assets/table-preview.png` também foi atualizada com uma campanha demonstrativa.
