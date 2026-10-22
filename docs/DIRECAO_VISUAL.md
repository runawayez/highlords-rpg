# Direção visual — Highlords VTT 1.1

A identidade aprovada usa um terminal em preto e vermelho, cantos angulares, bordas finas e o símbolo original Highlords. Orbitron identifica a marca e os títulos; JetBrains Mono compõe formulários, mensagens e controles. O estilo se estende à home, ferramentas do mapa, painéis, chat e fichas. Não há tons alaranjados nem textura irregular no fundo.

A home concentra a entrada em um terminal com abas Jogador e Mestre. Jogador é a opção inicial; a aba Mestre reúne criação, importação real de `.highlords` e recuperação das campanhas locais. Alternar as abas conserva os campos e admite navegação por setas, Home e End. Os dois botões principais usam o mesmo preenchimento vermelho. Um guia recolhível explica os primeiros passos sem deslocar o formulário inicial. O compromisso de gratuidade permanece no rodapé.

O efeito CRT de scanlines permanece ativado inicialmente, conforme aprovação do projeto. O botão com ícone de tela permite desativá-lo tanto na home como na mesa. A preferência é compartilhada entre as duas áreas e mantida neste navegador. A sobreposição é estática e não captura cliques ou gestos. Estados, foco e nomes acessíveis continuam nos elementos reais.

As fontes variáveis e suas licenças OFL estão hospedadas em `p2p/assets/fonts/`, sem solicitação a um serviço de fontes. A apresentação não depende de Tailwind, bibliotecas de ícones ou fontes por CDN. A dependência PeerJS preexistente continua separada. A fonte Editorial e a ilustração de atlas das revisões anteriores permanecem como arquivos históricos, sem uso na apresentação atual.

A home procura caber em uma tela de desktop com o guia fechado. Telas curtas, zoom, instruções abertas e bibliotecas maiores podem rolar naturalmente, sem cortar ações. No celular os campos do mestre passam a uma coluna. Na mesa, retrato usa mapa acima do painel; paisagem entre 600 e 800 pixels de largura e até 520 de altura mantém mapa e painel lado a lado. O conteúdo dos painéis tem rolagem própria e o mapa conserva seu enquadramento responsivo.

Exportar e Início continuam como ações diretas no cabeçalho. O botão de painel mantém ícone direcional, nome acessível e estado de expansão. A navegação e os estados ativos compartilham a mesma paleta e tipografia da entrada. As ferramentas de edição conservam seus cursores contextuais.

Esta revisão mantém a versão 1.1 e os formatos existentes. `assets/terminal.js` cuida apenas das abas de entrada e preferência CRT; `assets/terminal.css` define a apresentação. Nenhum transporte simulado, contador inventado ou persistência de demonstração do HTML de referência foi incorporado. A autoridade do mestre, permissões, sincronização P2P, fichas e backups continuam nos componentes reais.

Prévia da entrada: [interface-home.png](interface-home.png). A captura da mesa em `p2p/assets/table-preview.png` mostra uma campanha demonstrativa dentro da aplicação real.


A evolução de sessão acrescenta a biblioteca visual em uma janela de preparação, propriedades contextuais de token (painel inferior no celular) e combate recolhível sobre o mapa. A barra inferior oferece acesso a notas, marcadores, grade, prévia e busca, com rolagem horizontal em telas estreitas. **Mestre** identifica os controles detalhados da cena. Os novos controles isolam gestos de ponteiro para não iniciar pan no mapa. Veja [interface-library.png](interface-library.png) e [SESSAO_E_PREPARACAO.md](SESSAO_E_PREPARACAO.md).


Os comandos de zoom/enquadramento e os recursos da sessão compartilham uma barra inferior centralizada, com borda e espaçamento comuns. No desktop ficam lado a lado; em telas até 800 px, o menu usa a primeira linha e o zoom ocupa a segunda com a mesma largura. Instruções de colocação de marcador existem somente enquanto o modo está ativo, encerrando ao marcar, cancelar, fechar o editor, trocar de cena ou sair da mesa.
