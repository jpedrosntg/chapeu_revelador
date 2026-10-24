# Contexto do projeto — chapeu_revelador

## Visão geral
Chá revelação com tema Harry Potter. O Chapéu Seletor conversa com o visitante
(perguntas e reações) e, no fim, revela o sexo do bebê com confete.
- Repositório: github.com/jpedrosntg/chapeu_revelador (público, GitHub Pages)
- Site: https://jpedrosntg.github.io/chapeu_revelador/
- Editor: https://jpedrosntg.github.io/chapeu_revelador/editor.html

## Arquivos
- `index.html` — cenário 2D (SVG/CSS) + camada 3D transparente (Three.js 0.160 via importmap/unpkg)
  só com o chapéu, banquinho e sombra; falas e revelação.
- `chapeu.js` — carrega o .glb e anima a boca (`setMouth`). NÃO ALTERAR (preservar o modelo).
- `sorting_hat_fan_art.glb` — modelo 3D do chapéu. NÃO ALTERAR.
- `editor.html` — edita roteiro e cenário; exporta `roteiro.json`; pré-visualização.
- `roteiro.json` — titulo, passos[{texto, opcoes[{texto, reacao}]}], suspense[],
  cenario{tema, imagem, velas, estrelas}, revelacao (objeto ou base64 — `dec()` aceita os dois).
- `contexto.md` — este arquivo.
- `cenario.js` — OBSOLETO (cenário 3D antigo); pode ser excluído.

## Decisões
- Som/voz REMOVIDOS (só a experiência sem som).
- Cenário em 2D; o chapéu continua 3D (o modelo .glb é mantido por ser bonito).
- Camada 3D: `#palco` (top 1vh, altura 64vh), renderer com alpha, câmera fixa (sem OrbitControls,
  para não atrapalhar cliques), fov 32, enquadrando o chapéu acima do cartão.
- Luzes: Hemisphere quente + key direcional com sombra suave + rim na cor do tema (`TEMAS[x].rim`)
  + PointLight `brilho` (pulsa na fala; na revelação vira `final.cor`, intensidade 40).
- Sombra no chão: plano com ShadowMaterial (opacidade .45) em `bottomY - 1.4`; banquinho de madeira em 3D.
- Visual autoral **inspirado** em HP (cores das casas + emojis 🦁🐍🦅🦡), sem brasões oficiais.
- Temas: `salao`, `comunal`, `floresta`. `cenario.imagem` (URL) substitui o SVG do tema.
- GitHub Pages não grava: editar → exportar → enviar `roteiro.json` ao GitHub.
- Pré-visualização: localStorage `roteiroPreview` + `index.html?preview=1`.

## Histórico
1. Upload inicial; travava em "Carregando..." → resolvido após subir todos os arquivos.
2. Removido o som; cenário 3D trocado por 2D com 3 temas; seção "Cenário" e pré-visualização no editor.
3. Chapéu 3D (.glb + chapeu.js) reintegrado sobre o cenário 2D, com luz/sombra harmonizadas por tema.

## Ideias futuras
- Mais temas (Plataforma 9¾, Beco Diagonal).
- Cores dos estandartes pelo editor.
- Ajuste de posição/escala do chapéu pelo editor.
