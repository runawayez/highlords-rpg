# Direção visual — Highlords VTT 1.1

A interface usa a linguagem de um atlas e de um caderno de campanha: fundo preto quente, texto marfim, vermelho terroso e tipografia serifada nos títulos. A identidade Highlords e o símbolo original são preservados.

A entrada reúne apresentação e acesso em duas colunas, com fluxos explícitos de mestre e jogador, campos rotulados e uma ilustração vetorial original de masmorra. No celular, o link “Abrir mesa” leva diretamente aos formulários. Recuperação, importação e avisos permanecem nos fluxos existentes.

Na mesa, ferramentas com ícones e dicas ocupam menos espaço. O painel tem superfícies contínuas, separadores e hierarquia tipográfica, em vez de caixas aninhadas. Fichas usam o espaço do painel; comandos secundários têm menor destaque. Confirmações de sincronização por campo ficam disponíveis para leitores de tela sem repetir texto no layout; rascunhos, erros e conflitos permanecem visíveis.

A fonte serifada é hospedada no próprio projeto: um subconjunto latino de DejaVu Serif, convertido para WOFF e renomeado para Highlords Editorial, com licença incluída em `p2p/assets/fonts/LICENSE.txt`. Não há chamada de fontes para terceiros, nem novas dependências de produção. A arte `atlas-table.svg` é decorativa, não uma captura da aplicação.

A revisão mantém a versão funcional 1.1, os IDs dos controles e os formatos de campanhas existentes. As alterações de JavaScript se limitam à apresentação e a metadados visuais dos estados de edição. Permissões, sincronização P2P e persistência continuam nos mesmos componentes.

Prévia da entrada: [interface-home.png](interface-home.png). A captura da mesa em `p2p/assets/table-preview.png` também foi atualizada com uma campanha demonstrativa.
